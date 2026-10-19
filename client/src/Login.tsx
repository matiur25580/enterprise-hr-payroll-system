import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from './api'
import type { Role, UserSession } from './role'

type LoginResponse = {
  token: string
  user: { name: string; email: string; role: string }
}

type SignupResponse = {
  message: string
  user: { userId: string }
}

type Page = 'login' | 'signup' | 'forgot'

type SignupForm = {
  name: string
  role: 'Employee'
  dateOfBirth: string
  phone: string
  email: string
  password: string
  confirmPassword: string
}

const roleNames: Record<string, Role> = {
  admin: 'Admin',
  hr: 'HR',
  employee: 'Employee',
}

const emptySignup: SignupForm = {
  name: '',
  role: 'Employee',
  dateOfBirth: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
}

function requestError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? fallback
  }
  return fallback
}

export default function Login({ onLogin }: { onLogin: (session: UserSession) => void }) {
  const [page, setPage] = useState<Page>('login')
  const [selectedRole, setSelectedRole] = useState<Role | ''>('')
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signup, setSignup] = useState<SignupForm>(emptySignup)
  const [signupOtp, setSignupOtp] = useState('')
  const [showSignupOtp, setShowSignupOtp] = useState(false)
  const [signupSecondsRemaining, setSignupSecondsRemaining] = useState(0)
  const [registeredId, setRegisteredId] = useState('')
  const [resetUserId, setResetUserId] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetOtp, setResetOtp] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [confirmResetPassword, setConfirmResetPassword] = useState('')
  const [resetCodeSent, setResetCodeSent] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (page !== 'forgot' || !resetCodeSent || secondsRemaining <= 0) return
    const timer = window.setTimeout(() => setSecondsRemaining((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [page, resetCodeSent, secondsRemaining])

  useEffect(() => {
    if (!showSignupOtp || signupSecondsRemaining <= 0) return
    const timer = window.setTimeout(() => setSignupSecondsRemaining((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [showSignupOtp, signupSecondsRemaining])

  const changePage = (nextPage: Page) => {
    setPage(nextPage)
    setError('')
    setSuccess('')
    setShowSignupOtp(false)
    setRegisteredId('')
    setResetCodeSent(false)
    setSecondsRemaining(0)
  }

  const submitLogin = async (event: Event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      if (!selectedRole) {
        setError('Select your account role to continue.')
        return
      }
      const response = await axios.post<LoginResponse>(`${apiUrl}/api/auth/login`, {
        userId: userId.trim(),
        password,
      })
      const role = roleNames[response.data.user.role.trim().toLowerCase()]
      if (!role) {
        setError('This account has an unsupported role. Please contact your administrator.')
        return
      }
      if (role !== selectedRole) {
        setError(`This account belongs to the ${role} role. Select the matching role and try again.`)
        return
      }

      onLogin({
        token: response.data.token,
        role,
        email: response.data.user.email.trim().toLowerCase(),
        name: response.data.user.name,
      })
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Unable to reach the sign-in service. Check your connection and try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestSignupOtp = async (event: Event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await axios.post(`${apiUrl}/api/auth/register/request-otp`, {
        ...signup,
        role: signup.role.toLowerCase(),
      })
      setShowSignupOtp(true)
      setSignupOtp('')
      setSignupSecondsRemaining(60)
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Could not send a verification code. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const resendSignupOtp = async () => {
    setError('')
    setIsSubmitting(true)
    try {
      await axios.post(`${apiUrl}/api/auth/register/request-otp`, {
        ...signup,
        role: signup.role.toLowerCase(),
      })
      setSignupOtp('')
      setSignupSecondsRemaining(60)
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Could not resend the verification code. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmSignup = async (event: Event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await axios.post<SignupResponse>(`${apiUrl}/api/auth/register/verify-otp`, {
        email: signup.email.trim(),
        otp: signupOtp,
      })
      setShowSignupOtp(false)
      setRegisteredId(response.data.user.userId)
      setSuccess('Registration successful. Save your unique login ID:')
    } catch (requestFailure) {
      setError(requestError(requestFailure, 'Could not verify the code. Please try again.'))
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
        {page === 'login' && (
          <>
            <h1>Welcome back</h1>
            <p className="login-copy">Sign in to your secure people operations workspace.</p>
            <form onSubmit={submitLogin}>
              <label className="field-label" htmlFor="role">Account role</label>
              <select
                id="role"
                value={selectedRole}
                onChange={(event) => {
                  const value = event.currentTarget.value
                  if (value === 'Admin' || value === 'HR' || value === 'Employee' || value === '') {
                    setSelectedRole(value)
                    setError('')
                  }
                }}
                required
              >
                <option value="" disabled>Select your role</option>
                <option value="Admin">Admin</option>
                <option value="HR">HR</option>
                <option value="Employee">Employee</option>
              </select>
              <label className="field-label" htmlFor="user-id">Unique ID</label>
              <input
                id="user-id"
                autoComplete="username"
                placeholder="e.g. ADRA29081998"
                value={userId}
                onInput={(event) => setUserId(event.currentTarget.value)}
                required
              />
              <label className="field-label" htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onInput={(event) => setPassword(event.currentTarget.value)}
                  required
                />
                <button className="text-button" type="button" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="forgot-link" type="button" onClick={() => changePage('forgot')}>Forgot password?</button>
              <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="auth-switch">New to Northstar? <button type="button" onClick={() => changePage('signup')}>Create an account</button></p>
            <p className="login-security">Your role and workspace are assigned securely by your organization.</p>
          </>
        )}

        {page === 'signup' && (
          <>
            <h1>Create account</h1>
            <p className="login-copy">Verify your email to get your permanent workplace login ID.</p>
            {success && <div className="signup-success" role="status">{success}<strong>{registeredId}</strong><button type="button" onClick={() => changePage('login')}>Continue to sign in</button></div>}
            {!registeredId && (
              <form onSubmit={requestSignupOtp}>
                <label className="field-label" htmlFor="signup-name">Full name</label>
                <input id="signup-name" autoComplete="name" value={signup.name} onInput={(event) => setSignup({ ...signup, name: event.currentTarget.value })} required />
                <label className="field-label" htmlFor="signup-role">Account type</label>
                <input id="signup-role" value="Employee" readOnly aria-readonly="true" />
                <label className="field-label" htmlFor="signup-dob">Date of birth (DDMMYYYY)</label>
                <input id="signup-dob" inputMode="numeric" maxLength={8} placeholder="DDMMYYYY" value={signup.dateOfBirth} onInput={(event) => setSignup({ ...signup, dateOfBirth: event.currentTarget.value.replace(/\D/g, '') })} required />
                <label className="field-label" htmlFor="signup-phone">Contact number</label>
                <input id="signup-phone" type="tel" autoComplete="tel" value={signup.phone} onInput={(event) => setSignup({ ...signup, phone: event.currentTarget.value })} required />
                <label className="field-label" htmlFor="signup-email">Email address</label>
                <input id="signup-email" type="email" autoComplete="email" value={signup.email} onInput={(event) => setSignup({ ...signup, email: event.currentTarget.value })} required />
                <label className="field-label" htmlFor="signup-password">Password</label>
                <input id="signup-password" type="password" autoComplete="new-password" minLength={8} value={signup.password} onInput={(event) => setSignup({ ...signup, password: event.currentTarget.value })} required />
                <label className="field-label" htmlFor="signup-confirm-password">Confirm password</label>
                <input id="signup-confirm-password" type="password" autoComplete="new-password" minLength={8} value={signup.confirmPassword} onInput={(event) => setSignup({ ...signup, confirmPassword: event.currentTarget.value })} required />
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending code…' : 'Submit'}</button>
              </form>
            )}
            <p className="auth-switch">Already registered? <button type="button" onClick={() => changePage('login')}>Sign in</button></p>
          </>
        )}

        {page === 'forgot' && (
          <>
            <h1>Reset password</h1>
            <p className="login-copy">Enter your unique ID and registered email address.</p>
            {success && <p className="form-success" role="status">{success}</p>}
            <form onSubmit={resetCodeSent ? resetPasswordSubmit : requestResetOtp}>
              <label className="field-label" htmlFor="reset-id">Unique ID</label>
              <input id="reset-id" autoComplete="username" value={resetUserId} onInput={(event) => setResetUserId(event.currentTarget.value)} required />
              <label className="field-label" htmlFor="reset-email">Email address</label>
              <input id="reset-email" type="email" autoComplete="email" value={resetEmail} onInput={(event) => setResetEmail(event.currentTarget.value)} required />
              {!resetCodeSent ? (
                <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending code…' : 'Send OTP'}</button>
              ) : (
                <>
                  <label className="field-label" htmlFor="reset-otp">4-digit email code</label>
                  <input id="reset-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={resetOtp} onInput={(event) => setResetOtp(event.currentTarget.value.replace(/\D/g, ''))} required />
                  <p className="otp-timer" aria-live="polite">{secondsRemaining > 0 ? `Code expires in 00:${String(secondsRemaining).padStart(2, '0')}` : 'This code has expired.'}</p>
                  {secondsRemaining === 0 && <button className="forgot-link" type="button" disabled={isSubmitting} onClick={(event) => { event.preventDefault(); void requestResetOtp(event) }}>{isSubmitting ? 'Sending…' : 'Resend OTP'}</button>}
                  <label className="field-label" htmlFor="reset-new-password">New password</label>
                  <input id="reset-new-password" type="password" autoComplete="new-password" minLength={8} value={resetPassword} onInput={(event) => setResetPassword(event.currentTarget.value)} required />
                  <label className="field-label" htmlFor="reset-confirm-password">Confirm new password</label>
                  <input id="reset-confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmResetPassword} onInput={(event) => setConfirmResetPassword(event.currentTarget.value)} required />
                  <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating password…' : 'Reset password'}</button>
                </>
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
            </form>
            <p className="auth-switch"><button type="button" onClick={() => changePage('login')}>Back to sign in</button></p>
          </>
        )}
      </section>

      {showSignupOtp && (
        <div className="otp-backdrop">
          <section className="otp-dialog" role="dialog" aria-modal="true" aria-labelledby="signup-otp-title">
            <h2 id="signup-otp-title">Verify your email</h2>
            <p>Enter the 4-digit code sent to {signup.email}.</p>
            <form onSubmit={confirmSignup}>
              <label className="field-label" htmlFor="signup-otp">4-digit verification code</label>
              <input id="signup-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={signupOtp} onInput={(event) => setSignupOtp(event.currentTarget.value.replace(/\D/g, ''))} required />
              <p className="otp-timer" aria-live="polite">{signupSecondsRemaining > 0 ? `Code expires in 00:${String(signupSecondsRemaining).padStart(2, '0')}` : 'This code has expired.'}</p>
              {signupSecondsRemaining === 0 && <button className="forgot-link" type="button" disabled={isSubmitting} onClick={() => void resendSignupOtp()}>{isSubmitting ? 'Sending…' : 'Resend code'}</button>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Verifying…' : 'Verify and register'}</button>
              <button className="forgot-link otp-cancel" type="button" onClick={() => { setShowSignupOtp(false); setError('') }}>Cancel</button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
