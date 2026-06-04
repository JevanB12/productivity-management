import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { dateKey, useStudyTasks } from '../useStudyTasks'
import './StudyCalendar.css'

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Monday = 0 … Sunday = 6 */
function mondayOffsetFromCalendarSunday(dayIndex: number): number {
  return (dayIndex + 6) % 7
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month, 1))
}

function weekdayShortLabels(): string[] {
  const base = new Date(2024, 0, 1) // Monday
  return Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
      new Date(base.getTime() + i * 86400000),
    ),
  )
}

function upcomingDayLabel(date: Date, today: Date): string {
  const key = dateKey(date)
  if (key === dateKey(today)) return 'Today'
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (key === dateKey(tomorrow)) return 'Tomorrow'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export function StudyCalendar() {
  const today = useMemo(() => startOfToday(), [])
  const [cursorYear, setCursorYear] = useState(today.getFullYear())
  const [cursorMonth, setCursorMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<Date>(() => new Date(today))

  const {
    byDate,
    backlog,
    addTask,
    toggleTask,
    removeTask,
    renameTask,
    shiftAllByDays,
    addBacklog,
    toggleBacklog,
    removeBacklog,
    renameBacklog,
  } = useStudyTasks()
  const [draft, setDraft] = useState('')
  const [backlogDraft, setBacklogDraft] = useState('')
  const [shiftDaysInput, setShiftDaysInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [backlogEditingId, setBacklogEditingId] = useState<string | null>(null)
  const [backlogEditDraft, setBacklogEditDraft] = useState('')
  const [upcomingOffset, setUpcomingOffset] = useState(0)

  const selectedKey = dateKey(selected)
  const tasksForDay = byDate[selectedKey] ?? []

  useEffect(() => {
    setEditingId(null)
    setEditDraft('')
  }, [selectedKey])

  const grid = useMemo(() => {
    const first = new Date(cursorYear, cursorMonth, 1)
    const lead = mondayOffsetFromCalendarSunday(first.getDay())
    const total = daysInMonth(cursorYear, cursorMonth)
    const cells: { date: Date; inMonth: boolean }[] = []

    for (let i = lead; i > 0; i--) {
      const d = new Date(cursorYear, cursorMonth, 1 - i)
      cells.push({ date: d, inMonth: false })
    }
    for (let day = 1; day <= total; day++) {
      cells.push({
        date: new Date(cursorYear, cursorMonth, day),
        inMonth: true,
      })
    }
    while (cells.length % 7 !== 0 || cells.length < 42) {
      const last = cells[cells.length - 1].date
      const next = new Date(last)
      next.setDate(next.getDate() + 1)
      cells.push({ date: next, inMonth: false })
    }

    return cells
  }, [cursorYear, cursorMonth])

  const weekLabels = useMemo(() => weekdayShortLabels(), [])

  const upcomingDays = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const date = new Date(today)
      date.setDate(date.getDate() + upcomingOffset + i)
      const key = dateKey(date)
      const tasks = byDate[key] ?? []
      const pending = tasks.filter((t) => !t.done).length
      return {
        date,
        key,
        label: upcomingDayLabel(date, today),
        tasks,
        pending,
      }
    })
  }, [today, byDate, upcomingOffset])

  function goPrevUpcoming() {
    setUpcomingOffset((o) => Math.max(0, o - 5))
  }

  function goNextUpcoming() {
    setUpcomingOffset((o) => o + 5)
  }

  function selectDay(date: Date) {
    setSelected(new Date(date))
    setCursorYear(date.getFullYear())
    setCursorMonth(date.getMonth())
  }

  function goPrevMonth() {
    setCursorMonth((m) => {
      if (m === 0) {
        setCursorYear((y) => y - 1)
        return 11
      }
      return m - 1
    })
  }

  function goNextMonth() {
    setCursorMonth((m) => {
      if (m === 11) {
        setCursorYear((y) => y + 1)
        return 0
      }
      return m + 1
    })
  }

  function selectToday() {
    const n = startOfToday()
    setCursorYear(n.getFullYear())
    setCursorMonth(n.getMonth())
    setSelected(new Date(n))
  }

  function applyShiftAll() {
    const parsed = Number.parseInt(shiftDaysInput.trim(), 10)
    if (!Number.isFinite(parsed) || parsed === 0) return

    const taskCount = Object.values(byDate).reduce(
      (n, list) => n + (list?.length ?? 0),
      0,
    )
    if (taskCount === 0) {
      window.alert('No tasks to shift yet.')
      return
    }

    const abs = Math.abs(parsed)
    const dir = parsed > 0 ? 'later' : 'earlier'
    const ok = window.confirm(
      `Move every task ${abs} day${abs === 1 ? '' : 's'} ${dir}? This updates all dates at once.`,
    )
    if (!ok) return

    shiftAllByDays(parsed)
    setShiftDaysInput('')

    const moved = new Date(selected)
    moved.setDate(moved.getDate() + parsed)
    setSelected(moved)
    setCursorYear(moved.getFullYear())
    setCursorMonth(moved.getMonth())
  }

  function submitTask(e: FormEvent) {
    e.preventDefault()
    addTask(selectedKey, draft)
    setDraft('')
  }

  function startEdit(taskId: string, text: string) {
    setEditingId(taskId)
    setEditDraft(text)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditDraft('')
  }

  function commitEdit(taskId: string) {
    renameTask(selectedKey, taskId, editDraft)
    setEditingId(null)
    setEditDraft('')
  }

  function submitEdit(e: FormEvent, taskId: string) {
    e.preventDefault()
    const trimmed = editDraft.trim()
    if (!trimmed) {
      cancelEdit()
      return
    }
    commitEdit(taskId)
  }

  const dayTitle = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(selected)

  function submitBacklog(e: FormEvent) {
    e.preventDefault()
    addBacklog(backlogDraft)
    setBacklogDraft('')
  }

  function startBacklogEdit(taskId: string, text: string) {
    setBacklogEditingId(taskId)
    setBacklogEditDraft(text)
  }

  function cancelBacklogEdit() {
    setBacklogEditingId(null)
    setBacklogEditDraft('')
  }

  function commitBacklogEdit(taskId: string) {
    renameBacklog(taskId, backlogEditDraft)
    setBacklogEditingId(null)
    setBacklogEditDraft('')
  }

  function submitBacklogEdit(e: FormEvent, taskId: string) {
    e.preventDefault()
    const trimmed = backlogEditDraft.trim()
    if (!trimmed) {
      cancelBacklogEdit()
      return
    }
    commitBacklogEdit(taskId)
  }

  return (
    <div className="study-layout">
      <header className="study-header">
        <div>
          <h1 className="study-title">Study calendar</h1>
          <p className="study-sub">
            Pick a day, add what you need to study — everything stays on this
            device.
          </p>
        </div>
        <button type="button" className="study-btn ghost" onClick={selectToday}>
          Today
        </button>
      </header>

      <section className="study-upcoming" aria-labelledby="upcoming-title">
        <div className="study-upcoming-head">
          <div className="study-upcoming-head-text">
            <div className="study-upcoming-title-row">
              <h2 id="upcoming-title" className="study-upcoming-title">
                Next 5 days
              </h2>
              <div className="study-upcoming-nav">
                <button
                  type="button"
                  className="study-btn icon study-upcoming-arrow"
                  onClick={goPrevUpcoming}
                  disabled={upcomingOffset === 0}
                  aria-label="Previous 5 days"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="study-btn icon study-upcoming-arrow"
                  onClick={goNextUpcoming}
                  aria-label="Next 5 days"
                >
                  ›
                </button>
              </div>
            </div>
            <p className="study-upcoming-sub">What&apos;s coming up this week</p>
          </div>
        </div>
        <div className="study-upcoming-grid">
          {upcomingDays.map(({ date, key, label, tasks, pending }) => {
            const isSelected = key === selectedKey
            const isToday = key === dateKey(today)

            return (
              <button
                key={key}
                type="button"
                className={[
                  'study-upcoming-day',
                  isToday && 'today',
                  isSelected && 'selected',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => selectDay(date)}
              >
                <span className="study-upcoming-day-label">{label}</span>
                {tasks.length > 0 ? (
                  <>
                    <span className="study-upcoming-count">
                      {pending > 0
                        ? `${pending} open`
                        : `${tasks.length} done`}
                    </span>
                    <ul className="study-upcoming-tasks">
                      {tasks.slice(0, 4).map((t) => (
                        <li
                          key={t.id}
                          className={t.done ? 'done' : ''}
                          title={t.text}
                        >
                          {t.text}
                        </li>
                      ))}
                      {tasks.length > 4 && (
                        <li className="more">+{tasks.length - 4} more</li>
                      )}
                    </ul>
                  </>
                ) : (
                  <p className="study-upcoming-empty">Nothing planned</p>
                )}
              </button>
            )
          })}
        </div>
      </section>

      <div className="study-panels">
        <div className="study-cal-column">
          <section className="study-cal-card" aria-label="Month view">
            <div className="study-cal-toolbar">
              <button
                type="button"
                className="study-btn icon"
                onClick={goPrevMonth}
                aria-label="Previous month"
              >
                ‹
              </button>
              <h2 className="study-cal-month">{monthLabel(cursorYear, cursorMonth)}</h2>
              <button
                type="button"
                className="study-btn icon"
                onClick={goNextMonth}
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="study-weekdays" role="row">
              {weekLabels.map((w) => (
                <div key={w} className="study-weekday" role="columnheader">
                  {w}
                </div>
              ))}
            </div>

            <div className="study-grid" role="grid">
              {grid.map(({ date, inMonth }) => {
                const key = dateKey(date)
                const count = byDate[key]?.length ?? 0
                const pending =
                  byDate[key]?.filter((t) => !t.done).length ?? count
                const isSelected =
                  date.getFullYear() === selected.getFullYear() &&
                  date.getMonth() === selected.getMonth() &&
                  date.getDate() === selected.getDate()
                const isToday =
                  date.getFullYear() === today.getFullYear() &&
                  date.getMonth() === today.getMonth() &&
                  date.getDate() === today.getDate()

                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    role="gridcell"
                    className={[
                      'study-cell',
                      !inMonth && 'muted',
                      isToday && 'today',
                      isSelected && 'selected',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => setSelected(new Date(date))}
                  >
                    <span className="study-cell-num">{date.getDate()}</span>
                    {count > 0 && (
                      <span className="study-cell-badge" title={`${pending} open`}>
                        {pending > 0 ? pending : '✓'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="study-shift" aria-label="Reschedule entire plan">
            <div className="study-shift-row">
              <label className="study-shift-label" htmlFor="shift-days">
                Shift whole plan
              </label>
              <input
                id="shift-days"
                className="study-input study-shift-input"
                type="number"
                step={1}
                inputMode="numeric"
                placeholder="e.g. 3 or −2"
                value={shiftDaysInput}
                onChange={(e) => setShiftDaysInput(e.target.value)}
                aria-describedby="shift-hint"
              />
              <button
                type="button"
                className="study-btn primary study-shift-btn"
                onClick={applyShiftAll}
              >
                Apply to all tasks
              </button>
            </div>
            <p id="shift-hint" className="study-shift-hint">
              Positive moves everything later; negative moves everything earlier.
              Handy when dates are still tentative.
            </p>
          </section>
        </div>

        <section className="study-task-card" aria-labelledby="task-panel-title">
          <h2 id="task-panel-title" className="study-task-heading">
            {dayTitle}
          </h2>

          <form className="study-task-form" onSubmit={submitTask}>
            <input
              className="study-input"
              placeholder="e.g. Chapter 4 flashcards, CS lecture notes…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="New task"
            />
            <button type="submit" className="study-btn primary">
              Add
            </button>
          </form>

          {tasksForDay.length === 0 ? (
            <p className="study-empty">Nothing planned yet — add a task above.</p>
          ) : (
            <ul className="study-task-list">
              {tasksForDay.map((t) => (
                <li
                  key={t.id}
                  className={`study-task-row ${t.done ? 'done' : ''} ${editingId === t.id ? 'editing' : ''}`}
                >
                  {editingId === t.id ? (
                    <>
                      <label className="study-check study-check-solo">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => toggleTask(selectedKey, t.id)}
                          aria-label="Mark task done"
                        />
                      </label>
                      <form
                        className="study-task-edit-form"
                        onSubmit={(e) => submitEdit(e, t.id)}
                      >
                        <input
                          className="study-input study-task-edit-input"
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          aria-label="Edit task"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault()
                              cancelEdit()
                            }
                          }}
                        />
                        <button type="submit" className="study-btn primary">
                          Save
                        </button>
                        <button
                          type="button"
                          className="study-btn ghost"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </form>
                    </>
                  ) : (
                    <>
                      <label className="study-check">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => toggleTask(selectedKey, t.id)}
                        />
                        <span className="study-task-text">{t.text}</span>
                      </label>
                      <div className="study-task-actions">
                        <button
                          type="button"
                          className="study-btn edit"
                          aria-label={`Edit: ${t.text}`}
                          onClick={() => startEdit(t.id, t.text)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="study-btn trash"
                          aria-label={`Remove: ${t.text}`}
                          onClick={() => removeTask(selectedKey, t.id)}
                        >
                          ×
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="study-backlog" aria-labelledby="backlog-title">
        <div className="study-backlog-head">
          <h2 id="backlog-title" className="study-backlog-title">
            Eventually
          </h2>
          <p className="study-backlog-sub">
            Not on the calendar yet — dump anything here and schedule it when
            you&apos;re ready.
          </p>
        </div>

        <form className="study-backlog-form" onSubmit={submitBacklog}>
          <textarea
            className="study-input study-backlog-input"
            rows={2}
            placeholder="Rough ideas, readings, errands — no date needed…"
            value={backlogDraft}
            onChange={(e) => setBacklogDraft(e.target.value)}
            aria-label="Add unscheduled item"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                addBacklog(backlogDraft)
                setBacklogDraft('')
              }
            }}
          />
          <button type="submit" className="study-btn primary study-backlog-add">
            Add
          </button>
        </form>

        {backlog.length === 0 ? (
          <p className="study-empty">Nothing in the pile yet.</p>
        ) : (
          <ul className="study-task-list study-backlog-list">
            {backlog.map((t) => (
              <li
                key={t.id}
                className={`study-task-row ${t.done ? 'done' : ''} ${backlogEditingId === t.id ? 'editing' : ''}`}
              >
                {backlogEditingId === t.id ? (
                  <>
                    <label className="study-check study-check-solo">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleBacklog(t.id)}
                        aria-label="Mark item done"
                      />
                    </label>
                    <form
                      className="study-task-edit-form"
                      onSubmit={(e) => submitBacklogEdit(e, t.id)}
                    >
                      <input
                        className="study-input study-task-edit-input"
                        value={backlogEditDraft}
                        onChange={(e) => setBacklogEditDraft(e.target.value)}
                        aria-label="Edit item"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            cancelBacklogEdit()
                          }
                        }}
                      />
                      <button type="submit" className="study-btn primary">
                        Save
                      </button>
                      <button
                        type="button"
                        className="study-btn ghost"
                        onClick={cancelBacklogEdit}
                      >
                        Cancel
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <label className="study-check">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={() => toggleBacklog(t.id)}
                      />
                      <span className="study-task-text">{t.text}</span>
                    </label>
                    <div className="study-task-actions">
                      <button
                        type="button"
                        className="study-btn edit"
                        aria-label={`Edit: ${t.text}`}
                        onClick={() => startBacklogEdit(t.id, t.text)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="study-btn trash"
                        aria-label={`Remove: ${t.text}`}
                        onClick={() => removeBacklog(t.id)}
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
