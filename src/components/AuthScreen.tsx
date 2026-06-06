import { type FormEvent, useState } from 'react'
import { useAuth } from '../AuthProvider'
import './AuthScreen.css'

type Mode = 'sign-in' | 'sign-up'

export function AuthScreen() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submitEmail(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      const err =
        mode === 'sign-in'
          ? await signInWithEmail(email.trim(), password)
          : await signUpWithEmail(email.trim(), password)
      if (err) {
        setError(err)
      } else if (mode === 'sign-up') {
        setInfo('Check your email to confirm your account, then sign in.')
        setMode('sign-in')
        setPassword('')
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setInfo(null)
    setBusy(true)
    const err = await signInWithGoogle()
    setBusy(false)
    if (err) setError(err)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Study calendar</h1>
        <p className="auth-sub">
          Sign in to load and save your plan securely — no backup codes needed.
        </p>

        <button
          type="button"
          className="study-btn auth-google"
          onClick={() => void handleGoogle()}
          disabled={busy}
        >
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <form className="auth-form" onSubmit={(e) => void submitEmail(e)}>
          <label className="auth-label">
            Email
            <input
              className="study-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="auth-label">
            Password
            <input
              className="study-input"
              type="password"
              autoComplete={
                mode === 'sign-in' ? 'current-password' : 'new-password'
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p className="auth-message auth-error" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="auth-message auth-info" role="status">
              {info}
            </p>
          )}

          <button
            type="submit"
            className="study-btn primary auth-submit"
            disabled={busy}
          >
            {mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'sign-in' ? (
            <>
              No account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setMode('sign-up')
                  setError(null)
                  setInfo(null)
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="auth-link"
                onClick={() => {
                  setMode('sign-in')
                  setError(null)
                  setInfo(null)
                }}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
