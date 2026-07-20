import { type FormEvent, useMemo, useState } from 'react'
import {
  routineCrossesMidnight,
  routineDurationMinutes,
} from '../lib/routineTime'
import { useDailyRoutine, type RoutineSyncStatus } from '../useDailyRoutine'
import type { RoutineItem } from '../types'
import '../components/StudyCalendar.css'
import './DailyRoutine.css'

function syncStatusLabel(status: RoutineSyncStatus): string {
  switch (status) {
    case 'loading':
      return 'Loading from cloud…'
    case 'syncing':
      return 'Saving…'
    case 'synced':
      return 'Saved to cloud'
    case 'error':
      return 'Cloud sync failed'
    default:
      return 'Local only'
  }
}

function formatTimeRange(startTime: string, endTime: string): string {
  const fmt = (value: string) => {
    const [h, m] = value.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m, 0, 0)
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(d)
  }
  return `${fmt(startTime)} – ${fmt(endTime)}`
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

const EMPTY_FORM = {
  label: '',
  startTime: '07:00',
  endTime: '08:00',
}

export function DailyRoutine({ userId }: { userId: string }) {
  const { items, syncStatus, addItem, updateItem, removeItem } =
    useDailyRoutine(userId)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  const totalMinutes = useMemo(
    () =>
      items.reduce(
        (n, item) =>
          n + routineDurationMinutes(item.startTime, item.endTime),
        0,
      ),
    [items],
  )

  function submitAdd(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const ok = addItem(form.label, form.startTime, form.endTime)
    if (!ok) {
      setFormError('Add a name — start and end times must be different.')
      return
    }
    setForm(EMPTY_FORM)
  }

  function startEdit(item: RoutineItem) {
    setEditingId(item.id)
    setEditForm({
      label: item.label,
      startTime: item.startTime,
      endTime: item.endTime,
    })
    setFormError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm(EMPTY_FORM)
  }

  function submitEdit(e: FormEvent, id: string) {
    e.preventDefault()
    setFormError('')
    const ok = updateItem(id, editForm.label, editForm.startTime, editForm.endTime)
    if (!ok) {
      setFormError('Add a name — start and end times must be different.')
      return
    }
    cancelEdit()
  }

  return (
    <div className="routine-layout">
      <header className="routine-header">
        <div>
          <h1 className="routine-title">Daily routine</h1>
          <p className="routine-sub">
            Your everyday schedule — sleep, meals, work, exercise, all in one
            place. Same blocks every day.
          </p>
        </div>
        <div
          className={`routine-sync routine-sync-${syncStatus}`}
          aria-live="polite"
        >
          <span className="routine-sync-dot" aria-hidden />
          <span>{syncStatusLabel(syncStatus)}</span>
        </div>
      </header>

      <section className="routine-add-card" aria-label="Add routine block">
        <h2 className="routine-section-title">Add block</h2>
        <form className="routine-form" onSubmit={submitAdd}>
          <input
            className="study-input routine-label-input"
            placeholder="e.g. Sleep, breakfast, gym, deep work…"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            aria-label="Routine name"
          />
          <div className="routine-time-row">
            <label className="routine-time-field">
              <span>Start</span>
              <input
                className="study-input"
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, startTime: e.target.value }))
                }
                required
              />
            </label>
            <label className="routine-time-field">
              <span>End</span>
              <input
                className="study-input"
                type="time"
                value={form.endTime}
                onChange={(e) =>
                  setForm((f) => ({ ...f, endTime: e.target.value }))
                }
                required
              />
            </label>
          </div>
          <div className="routine-form-footer">
            <button type="submit" className="study-btn primary">
              Add to routine
            </button>
          </div>
        </form>
        {formError && (
          <p className="routine-error" role="alert">
            {formError}
          </p>
        )}
      </section>

      <section className="routine-list-card" aria-label="Daily routine timeline">
        <div className="routine-list-head">
          <h2 className="routine-section-title">Your day</h2>
          {items.length > 0 && (
            <span className="routine-total">
              {items.length} block{items.length === 1 ? '' : 's'} ·{' '}
              {formatDuration(totalMinutes)} planned
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <p className="study-empty">
            No routine yet — add your first time block above.
          </p>
        ) : (
          <ol className="routine-timeline">
            {items.map((item) => (
              <li
                key={item.id}
                className={`routine-block ${editingId === item.id ? 'editing' : ''}`}
              >
                {editingId === item.id ? (
                  <form
                    className="routine-edit-form"
                    onSubmit={(e) => submitEdit(e, item.id)}
                  >
                    <input
                      className="study-input"
                      value={editForm.label}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, label: e.target.value }))
                      }
                      aria-label="Edit routine name"
                      autoFocus
                    />
                    <div className="routine-time-row">
                      <label className="routine-time-field">
                        <span>Start</span>
                        <input
                          className="study-input"
                          type="time"
                          value={editForm.startTime}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              startTime: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="routine-time-field">
                        <span>End</span>
                        <input
                          className="study-input"
                          type="time"
                          value={editForm.endTime}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              endTime: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className="routine-edit-actions">
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
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="routine-block-time">
                      <span className="routine-time-text">
                        {formatTimeRange(item.startTime, item.endTime)}
                        {routineCrossesMidnight(item.startTime, item.endTime) && (
                          <span className="routine-overnight"> · next day</span>
                        )}
                      </span>
                      <span className="routine-duration">
                        {formatDuration(
                          routineDurationMinutes(item.startTime, item.endTime),
                        )}
                      </span>
                    </div>
                    <div className="routine-block-body">
                      <p className="routine-block-label">{item.label}</p>
                    </div>
                    <div className="routine-block-actions">
                      <button
                        type="button"
                        className="study-btn edit"
                        onClick={() => startEdit(item)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="study-btn trash"
                        aria-label={`Remove ${item.label}`}
                        onClick={() => removeItem(item.id)}
                      >
                        ×
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
