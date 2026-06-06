import { AuthProvider, useAuth } from './AuthProvider'
import { AuthScreen } from './components/AuthScreen'
import { StudyCalendar } from './components/StudyCalendar'

function AppContent() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="auth-page">
        <p className="auth-sub">Loading…</p>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return <StudyCalendar userId={user.id} userEmail={user.email ?? 'Signed in'} />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
