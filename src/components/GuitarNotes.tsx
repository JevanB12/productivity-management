import { type FormEvent, useState } from 'react'
import {
  useGuitarNotes,
  type GuitarNoteDraft,
  type GuitarNotesSyncStatus,
} from '../useGuitarNotes'
import type { GuitarNote } from '../types'
import './StudyCalendar.css'
import './GuitarNotes.css'

function syncStatusLabel(status: GuitarNotesSyncStatus): string {
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

const EMPTY_FORM: GuitarNoteDraft = {
  title: '',
  body: '',
}

export function GuitarNotes({ userId }: { userId: string }) {
  const { items, syncStatus, addNote, updateNote, removeNote } =
    useGuitarNotes(userId)
  const [form, setForm] = useState<GuitarNoteDraft>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<GuitarNoteDraft>(EMPTY_FORM)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function submitAdd(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const ok = addNote(form)
    if (!ok) {
      setFormError('Add a title for the note.')
      return
    }
    setForm(EMPTY_FORM)
  }

  function startEdit(item: GuitarNote) {
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
      setFormError('Add a title for the note.')
      return
    }
    cancelEdit()
  }

  return (
    <div className="guitar-layout">
      <header className="guitar-header">
        <div>
          <h1 className="guitar-title">Guitar notes</h1>
          <p className="guitar-sub">
            Songs, chords, riffs, and practice notes — all in one place.
          </p>
        </div>
        <div
          className={`guitar-sync guitar-sync-${syncStatus}`}
          aria-live="polite"
        >
          <span className="guitar-sync-dot" aria-hidden />
          <span>{syncStatusLabel(syncStatus)}</span>
        </div>
      </header>

      <section className="guitar-add-card" aria-label="Add guitar note">
        <h2 className="guitar-section-title">Add note</h2>
        <form className="guitar-form" onSubmit={submitAdd}>
          <input
            className="study-input"
            placeholder="e.g. Wonderwall, Am pentatonic, fingerpicking…"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            aria-label="Note title"
          />
          <textarea
            className="study-input guitar-textarea"
            placeholder="Chords, tabs, lyrics cues, practice tips…"
            rows={4}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            aria-label="Note body"
          />
          <div className="guitar-form-footer">
            <button type="submit" className="study-btn primary">
              Add note
            </button>
          </div>
        </form>
        {formError && !editingId && (
          <p className="guitar-error" role="alert">
            {formError}
          </p>
        )}
      </section>

      <section className="guitar-list-card" aria-label="Guitar notes">
        <div className="guitar-list-head">
          <h2 className="guitar-section-title">Your notes</h2>
          {items.length > 0 && (
            <span className="guitar-total">
              {items.length} note{items.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <p className="study-empty">
            No guitar notes yet — add a song or practice tip above.
          </p>
        ) : (
          <ul className="guitar-list">
            {items.map((item) => {
              const isEditing = editingId === item.id
              const isExpanded = expandedId === item.id || isEditing
              return (
                <li
                  key={item.id}
                  className={[
                    'guitar-item',
                    isEditing && 'editing',
                    isExpanded && 'expanded',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {isEditing ? (
                    <form
                      className="guitar-edit-form"
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
                        className="study-input guitar-textarea"
                        rows={5}
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
                        <p className="guitar-error" role="alert">
                          {formError}
                        </p>
                      )}
                      <div className="guitar-edit-actions">
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
                        className="guitar-item-main"
                        onClick={() =>
                          setExpandedId((id) =>
                            id === item.id ? null : item.id,
                          )
                        }
                      >
                        <span className="guitar-item-title">{item.title}</span>
                        <span className="guitar-item-meta">
                          {formatUpdated(item.updatedAt)}
                        </span>
                        {item.body && (
                          <span
                            className={
                              isExpanded
                                ? 'guitar-item-body'
                                : 'guitar-item-preview'
                            }
                          >
                            {item.body}
                          </span>
                        )}
                      </button>
                      <div className="guitar-item-actions">
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
