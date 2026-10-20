import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from './api'
import type { Role, UserSession } from './role'

type AuthResponse = {
  token: string
  user: { name: string; email: string; role: string }
}

type Page = 'login' | 'signup' | 'forgot'

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
  const [page, setPage] = useState<Page>('login')
  const [initialAdminRequired, setInitialAdminRequired] = useState<boolean | null>(null)
  const [setupError, setSetupError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetUserId, setResetUserId] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetOtp, setResetOtp] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [confirmResetPassword, setConfirmResetPassword] = useState('')
  const [resetCodeSent, setResetCodeSent] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(0)

  useEffect(() => {
    if (page !== 'forgot' || !resetCodeSent || secondsRemaining <= 0) return
    const timer = window.setTimeout(() => setSecondsRemaining((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [page, resetCodeSent, secondsRemaining])

  useEffect(() => {
    let active = true
    const checkSetup = async () => {
      setSetupError('')
      try {
        const response = await axios.get<{ initialAdminRequired: boolean }>(`${apiUrl}/api/auth/setup-status`)
        if (active) {
          setInitialAdminRequired(response.data.initialAdminRequired)
          setPage(response.data.initialAdminRequired ? 'signup' : 'login')
        }
      } catch (requestFailure) {
        if (active) setSetupError(requestError(requestFailure, 'Could not check account setup status.'))
      }
    }
    void checkSetup()
    return () => { active = false }
  }, [])

  const submitLogin = async (event: Event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
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
    setSuccess('')
    setIsSubmitting(true)
    try {
      const response = await axios.post<{ message: string }>(`${apiUrl}/api/auth/signup`, {
        name: name.trim(),
        email: signupEmail.trim(),
        password: signupPassword,
      })
      setInitialAdminRequired(false)
      setPage('login')
      setEmail('')
      setPassword('')
      setSuccess(response.data.message)
      setName('')
      setSignupEmail('')
      setSignupPassword('')
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Could not create the administrator account.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestResetOtp = async (event: Event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setIsSubmitting(true)
    try {
      const response = await axios.post<{ message: string; expiresIn?: number }>(`${apiUrl}/api/auth/password-reset/request-otp`, {
        userId: resetUserId.trim(),
        email: resetEmail.trim(),
      })
      setResetCodeSent(true)
      setSecondsRemaining(response.data.expiresIn ?? 60)
      setSuccess(response.data.message)
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Could not send a verification code. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetPasswordSubmit = async (event: Event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (resetPassword !== confirmResetPassword) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await axios.post<{ message: string }>(`${apiUrl}/api/auth/password-reset/reset`, {
        userId: resetUserId.trim(),
        email: resetEmail.trim(),
        otp: resetOtp,
        password: resetPassword,
      })
      setSuccess(response.data.message)
      setResetCodeSent(false)
      setResetOtp('')
      setResetPassword('')
      setConfirmResetPassword('')
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Could not reset your password. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand-mark">N</div>
        <p className="eyebrow">NORTHSTAR WORKPLACE</p>
        {initialAdminRequired === null ? (
          <>
            <p className="login-copy" role={setupError ? 'alert' : 'status'}>
              {setupError || 'Checking account setup…'}
            </p>
            {setupError && <button className="primary-button" type="button" onClick={() => window.location.reload()}>Try again</button>}
          </>
        ) : page === 'signup' && initialAdminRequired ? (
          <>
            <h1>Create Admin Account</h1>
            <p className="login-copy">Set up the first administrator for this organization.</p>
            <form onSubmit={submitSignup}>
              <label className="field-label" htmlFor="admin-name">Full name</label>
              <input id="admin-name" autoComplete="name" maxLength={120} value={name} onInput={(event) => setName(event.currentTarget.value)} required />
              <label className="field-label" htmlFor="admin-email">Email address</label>
              <input id="admin-email" type="email" autoComplete="email" maxLength={254} value={signupEmail} onInput={(event) => setSignupEmail(event.currentTarget.value)} required />
              <label className="field-label" htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={signupPassword} onInput={(event) => setSignupPassword(event.currentTarget.value)} required />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account…' : 'Create Admin Account'}
              </button>
            </form>
          </>
        ) : page === 'forgot' && !initialAdminRequired ? (
          <>
            <h1>Reset password</h1>
            <p className="login-copy">Enter your account ID and registered email address.</p>
            {success && <p className="form-success" role="status">{success}</p>}
            <form onSubmit={resetCodeSent ? resetPasswordSubmit : requestResetOtp}>
              <label className="field-label" htmlFor="reset-id">Account ID</label>
              <input id="reset-id" autoComplete="username" value={resetUserId} onInput={(event) => setResetUserId(event.currentTarget.value)} required />
              <label className="field-label" htmlFor="reset-email">Email address</label>
              <input id="reset-email" type="email" autoComplete="email" value={resetEmail} onInput={(event) => setResetEmail(event.currentTarget.value)} required />
              {!resetCodeSent ? (
                <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending code…' : 'Send reset code'}</button>
              ) : (
                <>
                  <label className="field-label" htmlFor="reset-otp">Email verification code</label>
                  <input id="reset-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={resetOtp} onInput={(event) => setResetOtp(event.currentTarget.value.replace(/\D/g, ''))} required />
                  <p className="otp-timer" aria-live="polite">{secondsRemaining > 0 ? `Code expires in 00:${String(secondsRemaining).padStart(2, '0')}` : 'This code has expired.'}</p>
                  {secondsRemaining === 0 && <button className="forgot-link" type="button" disabled={isSubmitting} onClick={(event) => { event.preventDefault(); void requestResetOtp(event) }}>{isSubmitting ? 'Sending…' : 'Resend code'}</button>}
                  <label className="field-label" htmlFor="reset-new-password">New password</label>
                  <input id="reset-new-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={resetPassword} onInput={(event) => setResetPassword(event.currentTarget.value)} required />
                  <label className="field-label" htmlFor="reset-confirm-password">Confirm new password</label>
                  <input id="reset-confirm-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirmResetPassword} onInput={(event) => setConfirmResetPassword(event.currentTarget.value)} required />
                  <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating password…' : 'Reset password'}</button>
                </>
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
            </form>
            <p className="auth-switch"><button type="button" onClick={() => { setPage('login'); setError(''); setSuccess('') }}>Back to sign in</button></p>
          </>
        ) : (
          <>
            <h1>Welcome back</h1>
            <p className="login-copy">Sign in to your secure people operations workspace.</p>
            {success && <p className="form-success" role="status">{success}</p>}
            <form onSubmit={submitLogin}>
              <label className="field-label" htmlFor="login-email">Email address</label>
              <input id="login-email" type="email" autoComplete="username" value={email} onInput={(event) => setEmail(event.currentTarget.value)} required />
              <label className="field-label" htmlFor="login-password">Password</label>
              <input id="login-password" type="password" autoComplete="current-password" value={password} onInput={(event) => setPassword(event.currentTarget.value)} required />
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="forgot-link" type="button" onClick={() => { setPage('forgot'); setError(''); setSuccess('') }}>Forgot password?</button>
              <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="login-security">Your role and workspace are assigned securely by your organization.</p>
          </>
        )}
      </section>
    </main>
  )
}
