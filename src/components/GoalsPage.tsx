import { type FormEvent, useMemo, useState } from 'react'
import { useGoals, type GoalDraft, type GoalSyncStatus } from '../useGoals'
import type { GoalItem } from '../types'
import './StudyCalendar.css'
import './GoalsPage.css'

function syncStatusLabel(status: GoalSyncStatus): string {
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

const EMPTY_FORM: GoalDraft = {
  topic: '',
  text: '',
  notes: '',
}

export function GoalsPage({ userId }: { userId: string }) {
  const { items, syncStatus, addGoal, updateGoal, toggleGoal, removeGoal } =
    useGoals(userId)
  const [form, setForm] = useState<GoalDraft>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GoalDraft>(EMPTY_FORM)

  const groups = useMemo(() => {
    const map = new Map<string, GoalItem[]>()
    for (const item of items) {
      const key = item.topic
      const list = map.get(key)
      if (list) list.push(item)
      else map.set(key, [item])
    }
    return [...map.entries()]
  }, [items])

  const doneCount = items.filter((g) => g.done).length

  function submitAdd(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const ok = addGoal(form)
    if (!ok) {
      setFormError('Add a topic and a goal.')
      return
    }
    setForm((f) => ({ ...EMPTY_FORM, topic: f.topic }))
  }

  function startEdit(item: GoalItem) {
    setEditingId(item.id)
    setEditForm({
      topic: item.topic,
      text: item.text,
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
    const ok = updateGoal(id, editForm)
    if (!ok) {
      setFormError('Add a topic and a goal.')
      return
    }
    cancelEdit()
  }

  return (
    <div className="goals-layout">
      <header className="goals-header">
        <div>
          <h1 className="goals-title">Goals</h1>
          <p className="goals-sub">
            Set targets for specific things — study, lifts, habits, anything.
          </p>
        </div>
        <div
          className={`goals-sync goals-sync-${syncStatus}`}
          aria-live="polite"
        >
          <span className="goals-sync-dot" aria-hidden />
          <span>{syncStatusLabel(syncStatus)}</span>
        </div>
      </header>

      <section className="goals-add-card" aria-label="Add goal">
        <h2 className="goals-section-title">Add goal</h2>
        <form className="goals-form" onSubmit={submitAdd}>
          <label className="goals-field">
            <span>For</span>
            <input
              className="study-input"
              list="goal-topics"
              placeholder="e.g. Bench press, Spanish, Sleep…"
              value={form.topic}
              onChange={(e) =>
                setForm((f) => ({ ...f, topic: e.target.value }))
              }
              aria-label="Topic"
            />
            <datalist id="goal-topics">
              {[...new Set(items.map((g) => g.topic))].map((topic) => (
                <option key={topic} value={topic} />
              ))}
            </datalist>
          </label>
          <label className="goals-field">
            <span>Goal</span>
            <input
              className="study-input"
              placeholder="e.g. Hit 80 kg, reach B2, 7 hours a night…"
              value={form.text}
              onChange={(e) =>
                setForm((f) => ({ ...f, text: e.target.value }))
              }
              aria-label="Goal"
            />
          </label>
          <input
            className="study-input"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            aria-label="Notes"
          />
          <div className="goals-form-footer">
            <button type="submit" className="study-btn primary">
              Add goal
            </button>
          </div>
        </form>
        {formError && !editingId && (
          <p className="goals-error" role="alert">
            {formError}
          </p>
        )}
      </section>

      <section className="goals-list-card" aria-label="Your goals">
        <div className="goals-list-head">
          <h2 className="goals-section-title">Your goals</h2>
          {items.length > 0 && (
            <span className="goals-total">
              {doneCount}/{items.length} done
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <p className="study-empty">
            No goals yet — pick a topic and add your first target above.
          </p>
        ) : (
          <div className="goals-groups">
            {groups.map(([topic, goals]) => (
              <section
                key={topic}
                className="goals-group"
                aria-label={topic}
              >
                <div className="goals-group-head">
                  <h3 className="goals-group-title">{topic}</h3>
                  <span className="goals-group-meta">
                    {goals.filter((g) => g.done).length}/{goals.length} done
                  </span>
                </div>
                <ul className="goals-list">
                  {goals.map((item) => {
                    const isEditing = editingId === item.id
                    return (
                      <li
                        key={item.id}
                        className={[
                          'goals-item',
                          item.done && 'done',
                          isEditing && 'editing',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {isEditing ? (
                          <form
                            className="goals-edit-form"
                            onSubmit={(e) => submitEdit(e, item.id)}
                          >
                            <label className="goals-field">
                              <span>For</span>
                              <input
                                className="study-input"
                                value={editForm.topic}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    topic: e.target.value,
                                  }))
                                }
                                aria-label="Edit topic"
                                autoFocus
                              />
                            </label>
                            <label className="goals-field">
                              <span>Goal</span>
                              <input
                                className="study-input"
                                value={editForm.text}
                                onChange={(e) =>
                                  setEditForm((f) => ({
                                    ...f,
                                    text: e.target.value,
                                  }))
                                }
                                aria-label="Edit goal"
                              />
                            </label>
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
                              <p className="goals-error" role="alert">
                                {formError}
                              </p>
                            )}
                            <div className="goals-edit-actions">
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
                            <label className="goals-check">
                              <input
                                type="checkbox"
                                checked={item.done}
                                onChange={() => toggleGoal(item.id)}
                              />
                              <span className="goals-item-body">
                                <span className="goals-item-text">
                                  {item.text}
                                </span>
                                {item.notes && (
                                  <span className="goals-item-notes">
                                    {item.notes}
                                  </span>
                                )}
                              </span>
                            </label>
                            <div className="goals-item-actions">
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
                                aria-label={`Remove ${item.text}`}
                                onClick={() => removeGoal(item.id)}
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
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
