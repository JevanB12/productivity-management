import { type FormEvent, useState } from 'react'
import {
  WORKOUT_WEEKDAY_LABELS,
  WORKOUT_WEEKDAYS,
  todayWeekday,
} from '../lib/workoutSync'
import {
  useWorkouts,
  type WorkoutDraft,
  type WorkoutSyncStatus,
} from '../useWorkouts'
import type { WorkoutItem, WorkoutWeekday } from '../types'
import './StudyCalendar.css'
import './WorkoutLog.css'

function syncStatusLabel(status: WorkoutSyncStatus): string {
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

function formatDetail(item: WorkoutItem): string {
  const parts: string[] = []
  if (item.sets && item.reps) parts.push(`${item.sets} × ${item.reps}`)
  else if (item.sets) parts.push(`${item.sets} sets`)
  else if (item.reps) parts.push(`${item.reps} reps`)
  if (item.weight) parts.push(item.weight)
  return parts.join(' · ')
}

const EMPTY_FORM: WorkoutDraft = {
  name: '',
  sets: '',
  reps: '',
  weight: '',
  notes: '',
}

export function WorkoutLog({ userId }: { userId: string }) {
  const { byWeekday, syncStatus, addWorkout, updateWorkout, removeWorkout } =
    useWorkouts(userId)

  const [selectedDay, setSelectedDay] = useState<WorkoutWeekday>(() =>
    todayWeekday(),
  )
  const [form, setForm] = useState<WorkoutDraft>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<WorkoutDraft>(EMPTY_FORM)

  const workouts = byWeekday[selectedDay] ?? []

  function selectDay(day: WorkoutWeekday) {
    setSelectedDay(day)
    setEditingId(null)
    setFormError('')
  }

  function submitAdd(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const ok = addWorkout(selectedDay, form)
    if (!ok) {
      setFormError('Add an exercise name.')
      return
    }
    setForm(EMPTY_FORM)
  }

  function startEdit(item: WorkoutItem) {
    setEditingId(item.id)
    setEditForm({
      name: item.name,
      sets: item.sets,
      reps: item.reps,
      weight: item.weight,
      notes: item.notes,
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
    const ok = updateWorkout(selectedDay, id, editForm)
    if (!ok) {
      setFormError('Add an exercise name.')
      return
    }
    cancelEdit()
  }

  return (
    <div className="workout-layout">
      <header className="workout-header">
        <div>
          <h1 className="workout-title">Workouts</h1>
          <p className="workout-sub">
            Your weekly plan — same exercises every Monday through Sunday.
          </p>
        </div>
        <div
          className={`workout-sync workout-sync-${syncStatus}`}
          aria-live="polite"
        >
          <span className="workout-sync-dot" aria-hidden />
          <span>{syncStatusLabel(syncStatus)}</span>
        </div>
      </header>

      <section className="workout-days-card" aria-label="Weekdays">
        <div className="workout-days" role="tablist" aria-label="Day of week">
          {WORKOUT_WEEKDAYS.map((day) => {
            const count = byWeekday[day]?.length ?? 0
            const isToday = day === todayWeekday()
            const isSelected = day === selectedDay
            return (
              <button
                key={day}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={[
                  'workout-day-btn',
                  isToday && 'today',
                  isSelected && 'selected',
                  count > 0 && 'has-workouts',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => selectDay(day)}
              >
                <span className="workout-day-short">
                  {WORKOUT_WEEKDAY_LABELS[day].slice(0, 3)}
                </span>
                <span className="workout-day-count">
                  {count === 0 ? '—' : `${count}`}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="workout-add-card" aria-label="Add exercise">
        <h2 className="workout-section-title">
          Add to {WORKOUT_WEEKDAY_LABELS[selectedDay]}
        </h2>
        <form className="workout-form" onSubmit={submitAdd}>
          <input
            className="study-input workout-name-input"
            placeholder="e.g. Bench press, squats, pull-ups…"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            aria-label="Exercise name"
          />
          <div className="workout-metrics-row">
            <label className="workout-field">
              <span>Sets</span>
              <input
                className="study-input"
                placeholder="3"
                value={form.sets}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sets: e.target.value }))
                }
                aria-label="Sets"
              />
            </label>
            <label className="workout-field">
              <span>Reps</span>
              <input
                className="study-input"
                placeholder="8–12"
                value={form.reps}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reps: e.target.value }))
                }
                aria-label="Reps"
              />
            </label>
            <label className="workout-field">
              <span>Weight</span>
              <input
                className="study-input"
                placeholder="60 kg"
                value={form.weight}
                onChange={(e) =>
                  setForm((f) => ({ ...f, weight: e.target.value }))
                }
                aria-label="Weight"
              />
            </label>
          </div>
          <input
            className="study-input"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            aria-label="Notes"
          />
          <div className="workout-form-footer">
            <button type="submit" className="study-btn primary">
              Add exercise
            </button>
          </div>
        </form>
        {formError && !editingId && (
          <p className="workout-error" role="alert">
            {formError}
          </p>
        )}
      </section>

      <section
        className="workout-list-card"
        aria-label={`${WORKOUT_WEEKDAY_LABELS[selectedDay]} exercises`}
      >
        <div className="workout-list-head">
          <h2 className="workout-section-title">
            {WORKOUT_WEEKDAY_LABELS[selectedDay]}
            {selectedDay === todayWeekday() && (
              <span className="workout-today-tag">Today</span>
            )}
          </h2>
          {workouts.length > 0 && (
            <span className="workout-total">
              {workouts.length} exercise{workouts.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {workouts.length === 0 ? (
          <p className="study-empty">
            Rest day or nothing logged yet — add an exercise above.
          </p>
        ) : (
          <ul className="workout-list">
            {workouts.map((item) => (
              <li
                key={item.id}
                className={[
                  'workout-item',
                  editingId === item.id && 'editing',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {editingId === item.id ? (
                  <form
                    className="workout-edit-form"
                    onSubmit={(e) => submitEdit(e, item.id)}
                  >
                    <input
                      className="study-input"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      aria-label="Edit exercise name"
                      autoFocus
                    />
                    <div className="workout-metrics-row">
                      <label className="workout-field">
                        <span>Sets</span>
                        <input
                          className="study-input"
                          value={editForm.sets}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              sets: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="workout-field">
                        <span>Reps</span>
                        <input
                          className="study-input"
                          value={editForm.reps}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              reps: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="workout-field">
                        <span>Weight</span>
                        <input
                          className="study-input"
                          value={editForm.weight}
                          onChange={(e) =>
                            setEditForm((f) => ({
                              ...f,
                              weight: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                    <input
                      className="study-input"
                      placeholder="Notes"
                      value={editForm.notes}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                    {formError && (
                      <p className="workout-error" role="alert">
                        {formError}
                      </p>
                    )}
                    <div className="workout-edit-actions">
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
                    <div className="workout-item-body">
                      <span className="workout-item-name">{item.name}</span>
                      {formatDetail(item) && (
                        <span className="workout-item-detail">
                          {formatDetail(item)}
                        </span>
                      )}
                      {item.notes && (
                        <span className="workout-item-notes">{item.notes}</span>
                      )}
                    </div>
                    <div className="workout-item-actions">
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
                        aria-label={`Remove ${item.name}`}
                        onClick={() => removeWorkout(selectedDay, item.id)}
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
