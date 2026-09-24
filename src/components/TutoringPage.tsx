import { type FormEvent, useMemo, useState } from 'react'
import {
  TUTORING_WEEKDAY_LABELS,
  TUTORING_WEEKDAYS,
  todayTutoringWeekday,
} from '../lib/tutoringSync'
import { useTutoring, type TutoringDraft, type TutoringSyncStatus } from '../useTutoring'
import type { TutoringItem, WorkoutWeekday } from '../types'
import './StudyCalendar.css'
import './TutoringPage.css'

const EMPTY_FORM: TutoringDraft = {
  student: '',
  subject: '',
  startTime: '',
  endTime: '',
  location: '',
}

function syncStatusLabel(status: TutoringSyncStatus) {
  return status === 'loading'
    ? 'Loading from cloud…'
    : status === 'syncing'
      ? 'Saving…'
      : status === 'synced'
        ? 'Saved to cloud'
        : status === 'error'
          ? 'Cloud sync failed'
          : 'Local only'
}

export function TutoringPage({ userId }: { userId: string }) {
  const { byWeekday, syncStatus, addTutoring, updateTutoring, removeTutoring } = useTutoring(userId)
  const [addDay, setAddDay] = useState<WorkoutWeekday>(() => todayTutoringWeekday())
  const [form, setForm] = useState<TutoringDraft>(EMPTY_FORM)
  const [editing, setEditing] = useState<{ day: WorkoutWeekday; id: string } | null>(null)
  const [editForm, setEditForm] = useState<TutoringDraft>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const today = todayTutoringWeekday()
  const totalSlots = useMemo(
    () => TUTORING_WEEKDAYS.reduce((count, day) => count + (byWeekday[day]?.length ?? 0), 0),
    [byWeekday],
  )

  function submitAdd(event: FormEvent) {
    event.preventDefault()
    if (!addTutoring(addDay, form)) {
      setFormError('Add a student and subject.')
      return
    }
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function startEdit(day: WorkoutWeekday, item: TutoringItem) {
    setEditing({ day, id: item.id })
    setEditForm({
      student: item.student,
      subject: item.subject,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location,
    })
  }

  function cancelEdit() {
    setEditing(null)
    setEditForm(EMPTY_FORM)
  }

  function submitEdit(event: FormEvent, day: WorkoutWeekday, id: string) {
    event.preventDefault()
    if (updateTutoring(day, id, editForm)) cancelEdit()
  }

  return (
    <div className="tutoring-layout">
      <header className="tutoring-header">
        <div>
          <h1 className="tutoring-title">Tutoring</h1>
          <p className="tutoring-sub">Your recurring tutoring schedule, Monday through Sunday.</p>
        </div>
        <div className={`tutoring-sync tutoring-sync-${syncStatus}`} aria-live="polite">
          <span className="tutoring-sync-dot" aria-hidden />
          <span>{syncStatusLabel(syncStatus)}</span>
        </div>
      </header>

      <section className="tutoring-card" aria-label="Add tutoring slot">
        <h2 className="tutoring-section-title">Add tutoring slot</h2>
        <form className="tutoring-form" onSubmit={submitAdd}>
          <div className="tutoring-grid tutoring-grid-main">
            <label className="tutoring-field"><span>Day</span><select className="study-input" value={addDay} onChange={(e) => setAddDay(e.target.value as WorkoutWeekday)}>{TUTORING_WEEKDAYS.map((day) => <option key={day} value={day}>{TUTORING_WEEKDAY_LABELS[day]}{day === today ? ' (today)' : ''}</option>)}</select></label>
            <label className="tutoring-field"><span>Student</span><input className="study-input" placeholder="Student name" value={form.student} onChange={(e) => setForm((current) => ({ ...current, student: e.target.value }))} /></label>
            <label className="tutoring-field"><span>Subject</span><input className="study-input" placeholder="e.g. Mathematics" value={form.subject} onChange={(e) => setForm((current) => ({ ...current, subject: e.target.value }))} /></label>
          </div>
          <div className="tutoring-grid tutoring-grid-time">
            <label className="tutoring-field"><span>Starts</span><input className="study-input" type="time" value={form.startTime} onChange={(e) => setForm((current) => ({ ...current, startTime: e.target.value }))} /></label>
            <label className="tutoring-field"><span>Ends</span><input className="study-input" type="time" value={form.endTime} onChange={(e) => setForm((current) => ({ ...current, endTime: e.target.value }))} /></label>
            <label className="tutoring-field tutoring-location"><span>Location or link</span><input className="study-input" placeholder="Optional" value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} /></label>
          </div>
          <div className="tutoring-form-footer"><button type="submit" className="study-btn primary">Add slot</button></div>
        </form>
        {formError && <p className="tutoring-error" role="alert">{formError}</p>}
      </section>

      <section className="tutoring-card" aria-label="Weekly tutoring schedule">
        <div className="tutoring-list-head"><h2 className="tutoring-section-title">Your week</h2>{totalSlots > 0 && <span className="tutoring-total">{totalSlots} slot{totalSlots === 1 ? '' : 's'}</span>}</div>
        {totalSlots === 0 ? <p className="study-empty">No tutoring slots yet — add your first one above.</p> : <div className="tutoring-week-list">
          {TUTORING_WEEKDAYS.map((day) => {
            const slots = byWeekday[day] ?? []
            return <section key={day} className={`tutoring-day-section ${day === today ? 'today' : ''}`}><div className="tutoring-day-head"><h3>{TUTORING_WEEKDAY_LABELS[day]}{day === today && <span className="tutoring-today-tag">Today</span>}</h3><span>{slots.length} slot{slots.length === 1 ? '' : 's'}</span></div>{slots.length === 0 ? <p className="tutoring-day-empty">No sessions</p> : <ul className="tutoring-list">{slots.map((item) => <li key={item.id} className="tutoring-item">{editing?.id === item.id && editing.day === day ? <form className="tutoring-edit-form" onSubmit={(event) => submitEdit(event, day, item.id)}><div className="tutoring-grid tutoring-grid-main"><input className="study-input" aria-label="Student" value={editForm.student} onChange={(e) => setEditForm((current) => ({ ...current, student: e.target.value }))} /><input className="study-input" aria-label="Subject" value={editForm.subject} onChange={(e) => setEditForm((current) => ({ ...current, subject: e.target.value }))} /></div><div className="tutoring-grid tutoring-grid-time"><input className="study-input" type="time" aria-label="Starts" value={editForm.startTime} onChange={(e) => setEditForm((current) => ({ ...current, startTime: e.target.value }))} /><input className="study-input" type="time" aria-label="Ends" value={editForm.endTime} onChange={(e) => setEditForm((current) => ({ ...current, endTime: e.target.value }))} /><input className="study-input" aria-label="Location or link" value={editForm.location} onChange={(e) => setEditForm((current) => ({ ...current, location: e.target.value }))} /></div><div className="tutoring-edit-actions"><button type="submit" className="study-btn primary">Save</button><button type="button" className="study-btn ghost" onClick={cancelEdit}>Cancel</button></div></form> : <><div className="tutoring-time">{item.startTime || 'Flexible'}{item.endTime ? ` – ${item.endTime}` : ''}</div><div className="tutoring-item-body"><strong>{item.student}</strong><span>{item.subject}</span>{item.location && <span className="tutoring-location-text">{item.location}</span>}</div><div className="tutoring-item-actions"><button type="button" className="study-btn ghost" onClick={() => startEdit(day, item)}>Edit</button><button type="button" className="study-btn danger" onClick={() => removeTutoring(day, item.id)}>Delete</button></div></>}</li>)}</ul>}</section>
          })}
        </div>}
      </section>
    </div>
  )
}
