import { type FormEvent, useState } from 'react'
import {
  useFreeNotes,
  type FreeNoteDraft,
  type FreeNotesSyncStatus,
} from '../useFreeNotes'
import type { FreeNote } from '../types'
import './StudyCalendar.css'
import './NotesPage.css'

function syncStatusLabel(status: FreeNotesSyncStatus): string {
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

function formatUpdated(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

const EMPTY_FORM: FreeNoteDraft = {
  title: '',
  body: '',
}

export function NotesPage({ userId }: { userId: string }) {
  const { items, syncStatus, addNote, updateNote, removeNote } =
    useFreeNotes(userId)
  const [form, setForm] = useState<FreeNoteDraft>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FreeNoteDraft>(EMPTY_FORM)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function submitAdd(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const ok = addNote(form)
    if (!ok) {
      setFormError('Write a title or some note text.')
      return
    }
    setForm(EMPTY_FORM)
  }

  function startEdit(item: FreeNote) {
    setEditingId(item.id)
    setExpandedId(item.id)
    setEditForm({
      title: item.title,
      body: item.body,
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
    const ok = updateNote(id, editForm)
    if (!ok) {
      setFormError('Write a title or some note text.')
      return
    }
    cancelEdit()
  }

  return (
    <div className="notes-layout">
      <header className="notes-header">
        <div>
          <h1 className="notes-title">Notes</h1>
          <p className="notes-sub">
            Anything goes — shopping lists, ideas, reminders, random thoughts.
          </p>
        </div>
        <div
          className={`notes-sync notes-sync-${syncStatus}`}
          aria-live="polite"
        >
          <span className="notes-sync-dot" aria-hidden />
          <span>{syncStatusLabel(syncStatus)}</span>
        </div>
      </header>

      <section className="notes-add-card" aria-label="Add note">
        <h2 className="notes-section-title">New note</h2>
        <form className="notes-form" onSubmit={submitAdd}>
          <input
            className="study-input"
            placeholder="Title (optional) — e.g. Shopping, Ideas, Packing…"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            aria-label="Note title"
          />
          <textarea
            className="study-input notes-textarea"
            placeholder="Write whatever you want…"
            rows={5}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            aria-label="Note body"
          />
          <div className="notes-form-footer">
            <button type="submit" className="study-btn primary">
              Add note
            </button>
          </div>
        </form>
        {formError && !editingId && (
          <p className="notes-error" role="alert">
            {formError}
          </p>
        )}
      </section>

      <section className="notes-list-card" aria-label="Your notes">
        <div className="notes-list-head">
          <h2 className="notes-section-title">Your notes</h2>
          {items.length > 0 && (
            <span className="notes-total">
              {items.length} note{items.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <p className="study-empty">
            No notes yet — dump a shopping list or thought above.
          </p>
        ) : (
          <ul className="notes-list">
            {items.map((item) => {
              const isEditing = editingId === item.id
              const isExpanded = expandedId === item.id || isEditing
              return (
                <li
                  key={item.id}
                  className={[
                    'notes-item',
                    isEditing && 'editing',
                    isExpanded && 'expanded',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isEditing ? (
                    <form
                      className="notes-edit-form"
                      onSubmit={(e) => submitEdit(e, item.id)}
                    >
                      <input
                        className="study-input"
                        value={editForm.title}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            title: e.target.value,
                          }))
                        }
                        aria-label="Edit note title"
                        autoFocus
                      />
                      <textarea
                        className="study-input notes-textarea"
                        rows={6}
                        value={editForm.body}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            body: e.target.value,
                          }))
                        }
                        aria-label="Edit note body"
                      />
                      {formError && (
                        <p className="notes-error" role="alert">
                          {formError}
                        </p>
                      )}
                      <div className="notes-edit-actions">
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
                      <button
                        type="button"
                        className="notes-item-main"
                        onClick={() =>
                          setExpandedId((id) =>
                            id === item.id ? null : item.id,
                          )
                        }
                      >
                        <span className="notes-item-title">{item.title}</span>
                        <span className="notes-item-meta">
                          {formatUpdated(item.updatedAt)}
                        </span>
                        {item.body && (
                          <span
                            className={
                              isExpanded
                                ? 'notes-item-body'
                                : 'notes-item-preview'
                            }
                          >
                            {item.body}
                          </span>
                        )}
                      </button>
                      <div className="notes-item-actions">
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
                          aria-label={`Remove ${item.title}`}
                          onClick={() => removeNote(item.id)}
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
    </div>
  )
}
