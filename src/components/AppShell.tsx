import { useState } from 'react'
import { useAuth } from '../AuthProvider'
import { DailyRoutine } from './DailyRoutine'
import { StudyCalendar } from './StudyCalendar'
import { WorkoutLog } from './WorkoutLog'
import './StudyCalendar.css'
import './AppShell.css'

type AppPage = 'calendar' | 'routine' | 'workouts'

export function AppShell({
  userId,
  userEmail,
}: {
  userId: string
  userEmail: string
}) {
  const { signOut } = useAuth()
  const [page, setPage] = useState<AppPage>('calendar')

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <nav className="app-nav" aria-label="Main">
          <button
            type="button"
            className={`app-nav-btn ${page === 'calendar' ? 'active' : ''}`}
            onClick={() => setPage('calendar')}
          >
            Calendar
          </button>
          <button
            type="button"
            className={`app-nav-btn ${page === 'routine' ? 'active' : ''}`}
            onClick={() => setPage('routine')}
          >
            Daily routine
          </button>
          <button
            type="button"
            className={`app-nav-btn ${page === 'workouts' ? 'active' : ''}`}
            onClick={() => setPage('workouts')}
          >
            Workouts
          </button>
        </nav>
        <div className="app-shell-actions">
          <span className="auth-user" title={userEmail}>
            {userEmail}
          </span>
          <button
            type="button"
            className="study-btn ghost"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="app-shell-main">
        {page === 'calendar' ? (
          <StudyCalendar userId={userId} userEmail={userEmail} shell />
        ) : page === 'routine' ? (
          <DailyRoutine userId={userId} />
        ) : (
          <WorkoutLog userId={userId} />
        )}
      </main>
    </div>
  )
}
