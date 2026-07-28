import { type FormEvent, useMemo, useState } from 'react'
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

  const [addDay, setAddDay] = useState<WorkoutWeekday>(() => todayWeekday())
  const [form, setForm] = useState<WorkoutDraft>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [editing, setEditing] = useState<{
    day: WorkoutWeekday
    id: string
  } | null>(null)
  const [editForm, setEditForm] = useState<WorkoutDraft>(EMPTY_FORM)

  const today = todayWeekday()
  const totalExercises = useMemo(
    () =>
      WORKOUT_WEEKDAYS.reduce(
        (n, day) => n + (byWeekday[day]?.length ?? 0),
        0,
      ),
    [byWeekday],
  )

  function submitAdd(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const ok = addWorkout(addDay, form)
    if (!ok) {
      setFormError('Add an exercise name.')
      return
    }
    setForm(EMPTY_FORM)
  }

  function startEdit(day: WorkoutWeekday, item: WorkoutItem) {
    setEditing({ day, id: item.id })
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
    setEditing(null)
    setEditForm(EMPTY_FORM)
  }

  function submitEdit(e: FormEvent, day: WorkoutWeekday, id: string) {
    e.preventDefault()
    setFormError('')
    const ok = updateWorkout(day, id, editForm)
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

      <section className="workout-add-card" aria-label="Add exercise">
        <h2 className="workout-section-title">Add exercise</h2>
        <form className="workout-form" onSubmit={submitAdd}>
          <label className="workout-field">
            <span>Day</span>
            <select
              className="study-input"
              value={addDay}
              onChange={(e) => setAddDay(e.target.value as WorkoutWeekday)}
              aria-label="Day of week"
            >
              {WORKOUT_WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {WORKOUT_WEEKDAY_LABELS[day]}
                  {day === today ? ' (today)' : ''}
                </option>
              ))}
            </select>
          </label>
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
        {formError && !editing && (
          <p className="workout-error" role="alert">
            {formError}
          </p>
        )}
      </section>

      <section className="workout-week-card" aria-label="Weekly workout plan">
        <div className="workout-list-head">
          <h2 className="workout-section-title">Your week</h2>
          {totalExercises > 0 && (
            <span className="workout-total">
              {totalExercises} exercise{totalExercises === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {totalExercises === 0 ? (
          <p className="study-empty">
            No workouts yet — add your first exercise above.
          </p>
        ) : (
          <div className="workout-week-list">
            {WORKOUT_WEEKDAYS.map((day) => {
              const workouts = byWeekday[day] ?? []
              const isToday = day === today
              return (
                <section
                  key={day}
                  className={[
                    'workout-day-section',
                    isToday && 'today',
                    workouts.length === 0 && 'empty',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={WORKOUT_WEEKDAY_LABELS[day]}
                >
                  <div className="workout-day-head">
                    <h3 className="workout-day-title">
                      {WORKOUT_WEEKDAY_LABELS[day]}
                      {isToday && (
                        <span className="workout-today-tag">Today</span>
                      )}
                    </h3>
                    <span className="workout-day-meta">
                      {workouts.length === 0
                        ? 'Rest'
                        : `${workouts.length} exercise${workouts.length === 1 ? '' : 's'}`}
                    </span>
                  </div>

                  {workouts.length === 0 ? (
                    <p className="workout-day-empty">No exercises</p>
                  ) : (
                    <ul className="workout-list">
                      {workouts.map((item) => {
                        const isEditing =
                          editing?.day === day && editing.id === item.id
                        return (
                          <li
                            key={item.id}
                            className={[
                              'workout-item',
                              isEditing && 'editing',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {isEditing ? (
                              <form
                                className="workout-edit-form"
                                onSubmit={(e) =>
                                  submitEdit(e, day, item.id)
                                }
                              >
                                <input
                                  className="study-input"
                                  value={editForm.name}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      name: e.target.value,
                                    }))
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
                                    setEditForm((f) => ({
                                      ...f,
                                      notes: e.target.value,
                                    }))
                                  }
                                />
                                {formError && (
                                  <p className="workout-error" role="alert">
                                    {formError}
                                  </p>
                                )}
                                <div className="workout-edit-actions">
                                  <button
                                    type="submit"
                                    className="study-btn primary"
                                  >
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
                                <div className="workout-item-meta">
                                  <span className="workout-item-detail">
                                    {formatDetail(item) || '—'}
                                  </span>
                                  {item.notes && (
                                    <span className="workout-item-notes">
                                      {item.notes}
                                    </span>
                                  )}
                                </div>
                                <div className="workout-item-body">
                                  <span className="workout-item-name">
                                    {item.name}
                                  </span>
                                </div>
                                <div className="workout-item-actions">
                                  <button
                                    type="button"
                                    className="study-btn edit"
                                    onClick={() => startEdit(day, item)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="study-btn trash"
                                    aria-label={`Remove ${item.name}`}
                                    onClick={() =>
                                      removeWorkout(day, item.id)
                                    }
                                  >
                                    ×
                                  </button>
                                </div>
                              </>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
