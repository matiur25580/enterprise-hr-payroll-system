import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from './api'
import type { Role, UserSession } from './role'

type AuthResponse = {
  token: string
  user: { name: string; email: string; role: string }
}

type Page = 'login' | 'signup'

const roleNames: Record<string, Role> = {
  admin: 'Admin',
  hr: 'HR',
  employee: 'Employee',
}

function requestError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback
  }
  return fallback
}

export default function Login({ onLogin }: { onLogin: (session: UserSession) => void }) {
  const [page, setPage] = useState<Page>(window.location.pathname === '/signup' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    const syncPageWithRoute = () => setPage(window.location.pathname === '/signup' ? 'signup' : 'login')
    window.addEventListener('popstate', syncPageWithRoute)
    return () => window.removeEventListener('popstate', syncPageWithRoute)
  }, [])

  const submitLogin = async (event: Event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await axios.post<AuthResponse>(`${apiUrl}/api/auth/login`, {
        email: email.trim(),
        password,
      })
      const role = roleNames[response.data.user.role.trim().toLowerCase()]
      if (!role) {
        setError('This account has an unsupported role. Please contact your administrator.')
        return
      }
      onLogin({
        token: response.data.token,
        role,
        email: response.data.user.email.trim().toLowerCase(),
        name: response.data.user.name,
      })
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Unable to sign in. Check your credentials and try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitSignup = async (event: Event) => {
    event.preventDefault()
    setError('')
    if (signupPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await axios.post<{ message: string }>(`${apiUrl}/api/auth/signup`, {
        name: name.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
      })
      window.history.pushState(null, '', '/login')
      setPage('login')
      setEmail(signupEmail.trim())
      setPassword('')
      setName('')
      setSignupEmail('')
      setSignupPassword('')
      setConfirmPassword('')
      setToast(response.data.message || 'Account created. You can now sign in.')
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Could not create your account. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const showSignup = (event: Event) => {
    event.preventDefault()
    window.history.pushState(null, '', '/signup')
    setPage('signup')
    setError('')
    setToast('')
  }

  const showLogin = (event: Event) => {
    event.preventDefault()
    window.history.pushState(null, '', '/login')
    setPage('login')
    setError('')
    setToast('')
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">N</div>
        <p className="eyebrow">NORTHSTAR WORKPLACE</p>
        {page === 'signup' ? (
          <>
            <h1>Create your account</h1>
            <p className="login-copy">Get started with your Northstar Workplace account.</p>
            <form onSubmit={submitSignup}>
              <label className="field-label" htmlFor="signup-name">Full Name</label>
              <input id="signup-name" autoComplete="name" maxLength={120} value={name} onInput={(event) => setName(event.currentTarget.value)} required />
              <label className="field-label" htmlFor="signup-email">Email address</label>
              <input id="signup-email" type="email" autoComplete="email" maxLength={254} value={signupEmail} onInput={(event) => setSignupEmail(event.currentTarget.value)} required />
              <label className="field-label" htmlFor="signup-password">Password</label>
              <input id="signup-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={signupPassword} onInput={(event) => setSignupPassword(event.currentTarget.value)} required />
              <label className="field-label" htmlFor="signup-confirm-password">Confirm Password</label>
              <input id="signup-confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmPassword} onInput={(event) => setConfirmPassword(event.currentTarget.value)} required />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account…' : 'Sign up'}
              </button>
            </form>
            <p className="auth-switch">Already have an account? <a href="/login" onClick={showLogin}>Sign in</a></p>
          </>
        ) : (
          <>
            <h1>Welcome back</h1>
            <p className="login-copy">Sign in to your secure people operations workspace.</p>
            <form onSubmit={submitLogin}>
              <label className="field-label" htmlFor="login-email">Email address</label>
              <input id="login-email" type="email" autoComplete="username" value={email} onInput={(event) => setEmail(event.currentTarget.value)} required />
              <label className="field-label" htmlFor="login-password">Password</label>
              <input id="login-password" type="password" autoComplete="current-password" value={password} onInput={(event) => setPassword(event.currentTarget.value)} required />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="forgot-link" type="button" onClick={() => setToast('Password reset link sent to email')}>Forgot password?</button>
              <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="auth-switch">Don&apos;t have an account? <a href="/signup" onClick={showSignup}>Sign up</a></p>
          </>
        )}
      </section>
      {toast && <div className="auth-toast" role="status">{toast}</div>}
    </main>
  )
}
