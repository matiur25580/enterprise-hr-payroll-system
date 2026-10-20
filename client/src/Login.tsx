import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from './api'
import type { Role, UserSession } from './role'

type AuthResponse = {
  token: string
  user: { name: string; email: string; role: string }
}

type SignupResponse = {
  message: string
  user: { uniqueId: string; userId?: string }
}

type Page = 'login' | 'signup' | 'forgot'
type SignupForm = {
  name: string
  email: string
  phone: string
  dateOfBirth: string
  role: Role | ''
  password: string
  confirmPassword: string
}
type FieldErrors = Record<string, string>

const roleNames: Record<string, Role> = {
  admin: 'Admin',
  hr: 'HR',
  employee: 'Employee',
}

const emptySignup: SignupForm = {
  name: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  role: '',
  password: '',
  confirmPassword: '',
}

function requestError(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ error?: string; message?: string; details?: string }>(error)) {
    const response = error.response?.data
    return response?.message ?? response?.details ?? fallback
  }
  return fallback
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="form-error field-error" role="alert">{message}</p> : null
}

export default function Login({ onLogin }: { onLogin: (session: UserSession) => void }) {
  const initialPath = window.location.pathname
  const [page, setPage] = useState<Page>(initialPath === '/signup'
    ? 'signup'
    : initialPath === '/forgot-password' ? 'forgot' : 'login')
  const [role, setRole] = useState<Role | ''>('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [signup, setSignup] = useState<SignupForm>(emptySignup)
  const [forgot, setForgot] = useState({ uniqueId: '', email: '', otp: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [registeredId, setRegisteredId] = useState('')
  const [otpMode, setOtpMode] = useState<'signup' | 'reset' | null>(null)
  const [otp, setOtp] = useState('')
  const [signupOtp, setSignupOtp] = useState('')
  const [devOtp, setDevOtp] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)
  const [resetVerified, setResetVerified] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

  useEffect(() => {
    const syncPageWithRoute = () => {
      const path = window.location.pathname
      setPage(path === '/signup' ? 'signup' : path === '/forgot-password' ? 'forgot' : 'login')
      setErrors({})
      setFormError('')
    }
    window.addEventListener('popstate', syncPageWithRoute)
    return () => window.removeEventListener('popstate', syncPageWithRoute)
  }, [])

  const setFieldError = (field: string, message: string) => {
    setErrors((current) => ({ ...current, [field]: message }))
  }

  const clearFieldError = (field: string) => {
    setErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
    setFormError('')
  }

  const changePage = (nextPage: Page) => {
    const path = nextPage === 'forgot' ? '/forgot-password' : `/${nextPage === 'login' ? 'login' : nextPage}`
    window.history.pushState(null, '', path)
    setPage(nextPage)
    setErrors({})
    setFormError('')
    setSuccess('')
    setRegisteredId('')
    setOtpMode(null)
    setOtp('')
    setSignupOtp('')
    setDevOtp('')
    setResendSeconds(0)
    setResetVerified(false)
  }

  const submitLogin = async (event: Event) => {
    event.preventDefault()
    setErrors({})
    setFormError('')
    const nextErrors: FieldErrors = {}
    if (!role) nextErrors.role = 'Select an account role.'
    if (!identifier.trim()) nextErrors.identifier = 'Enter your email or unique ID.'
    if (!password) nextErrors.password = 'Enter your password.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await axios.post<AuthResponse>(`${apiUrl}/api/auth/login`, {
        identifier: identifier.trim(),
        password,
        role: role.toLowerCase(),
      })
      const authenticatedRole = roleNames[response.data.user.role.trim().toLowerCase()]
      if (!authenticatedRole) {
        setFormError('This account has an unsupported role. Please contact your administrator.')
        return
      }
      onLogin({
        token: response.data.token,
        role: authenticatedRole,
        email: response.data.user.email.trim().toLowerCase(),
        name: response.data.user.name,
      })
    } catch (requestFailure) {
      const message = requestError(requestFailure, 'Unable to sign in. Check your credentials and try again.')
      if (message.includes("email doesn't registered") || message.includes('unique ID')) {
        setFieldError('identifier', message)
      } else if (message.includes('role')) {
        setFieldError('role', message)
      } else {
        setFormError(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateSignup = () => {
    const nextErrors: FieldErrors = {}
    if (!signup.name.trim()) nextErrors.name = 'Enter your full name.'
    else if (signup.name.trim().split(/\s+/).length < 2) nextErrors.name = 'Enter your first and last name.'
    if (!signup.email.trim()) nextErrors.email = 'Enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signup.email.trim())) nextErrors.email = 'Enter a valid email address.'
    if (!signup.phone.trim()) nextErrors.phone = 'Enter your contact number.'
    if (!signup.dateOfBirth) nextErrors.dateOfBirth = 'Enter your date of birth.'
    else if (!/^\d{8}$/.test(signup.dateOfBirth)) nextErrors.dateOfBirth = 'Use DDMMYYYY format.'
    if (!signup.role) nextErrors.signupRole = 'Select an account role.'
    if (!signup.password) nextErrors.signupPassword = 'Enter a password.'
    else if (signup.password.length < 8) nextErrors.signupPassword = 'Use at least 8 characters.'
    if (!signup.confirmPassword) nextErrors.confirmPassword = 'Confirm your password.'
    else if (signup.confirmPassword !== signup.password) nextErrors.confirmPassword = 'Passwords do not match.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const requestSignupOtp = (event: Event) => {
    event.preventDefault()
    setFormError('')
    if (!validateSignup()) return
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString()
    setSignupOtp(generatedOtp)
    setOtp('')
    setOtpMode('signup')
    setResendSeconds(0)
  }

  const resendOtp = async () => {
    setFormError('')
    setIsSubmitting(true)
    try {
      await axios.post(`${apiUrl}/api/auth/password-reset/request-otp`, {
        uniqueId: forgot.uniqueId.trim(),
        email: forgot.email.trim(),
      })
      setOtp('')
      setDevOtp('')
      setResendSeconds(60)
    } catch (requestFailure) {
      setFormError(requestError(requestFailure, 'Could not resend the verification code. Please try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmSignup = async (event: Event) => {
    event.preventDefault()
    setFormError('')
    if (!/^\d{6}$/.test(otp)) {
      setFormError('Enter the 6-digit verification code.')
      return
    }
    if (otp !== signupOtp) {
      setFormError('The verification code does not match.')
      return
    }
    setIsSubmitting(true)
    try {
      const response = await axios.post<SignupResponse>(`${apiUrl}/api/auth/signup`, {
        name: signup.name.trim(),
        email: signup.email.trim(),
        phone: signup.phone.trim(),
        dateOfBirth: signup.dateOfBirth,
        role: signup.role.toLowerCase(),
        password: signup.password,
      })
      setOtpMode(null)
      setSignupOtp('')
      setRegisteredId(response.data.user.uniqueId || response.data.user.userId || '')
      setSuccess('registration successful')
    } catch (requestFailure) {
      setFormError(requestError(requestFailure, 'invalid credentials/OTP'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const requestResetOtp = async (event: Event) => {
    event.preventDefault()
    setErrors({})
    setFormError('')
    const nextErrors: FieldErrors = {}
    if (!forgot.uniqueId.trim()) nextErrors.uniqueId = 'Enter your unique ID.'
    if (!forgot.email.trim()) nextErrors.resetEmail = 'Enter your email address.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgot.email.trim())) nextErrors.resetEmail = 'Enter a valid email address.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }
    setIsSubmitting(true)
    try {
      await axios.post(`${apiUrl}/api/auth/password-reset/request-otp`, {
        uniqueId: forgot.uniqueId.trim(),
        email: forgot.email.trim(),
      })
      setOtp('')
      setOtpMode('reset')
      setResendSeconds(60)
    } catch (requestFailure) {
      const message = requestError(requestFailure, 'Could not send a verification code. Please try again.')
      setFieldError('uniqueId', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyResetOtp = async (event: Event) => {
    event.preventDefault()
    setFormError('')
    if (!/^\d{6}$/.test(otp)) {
      setFormError('Enter the 6-digit verification code.')
      return
    }
    setIsSubmitting(true)
    try {
      await axios.post(`${apiUrl}/api/auth/password-reset/verify-otp`, {
        uniqueId: forgot.uniqueId.trim(),
        email: forgot.email.trim(),
        otp,
      })
      setForgot((current) => ({ ...current, otp }))
      setOtpMode(null)
      setResetVerified(true)
      setSuccess('')
    } catch (requestFailure) {
      setFormError(requestError(requestFailure, 'invalid credentials/OTP'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitResetPassword = async (event: Event) => {
    event.preventDefault()
    setErrors({})
    setFormError('')
    const nextErrors: FieldErrors = {}
    if (!forgot.password) nextErrors.resetPassword = 'Enter a new password.'
    else if (forgot.password.length < 8) nextErrors.resetPassword = 'Use at least 8 characters.'
    if (!forgot.confirmPassword) nextErrors.confirmResetPassword = 'Confirm your new password.'
    else if (forgot.confirmPassword !== forgot.password) nextErrors.confirmResetPassword = 'Passwords do not match.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await axios.post<{ message: string }>(`${apiUrl}/api/auth/password-reset/reset`, {
        uniqueId: forgot.uniqueId.trim(),
        email: forgot.email.trim(),
        password: forgot.password,
      })
      setSuccess(response.data.message)
      setResetVerified(false)
      setForgot({ uniqueId: '', email: '', otp: '', password: '', confirmPassword: '' })
    } catch (requestFailure) {
      setFormError(requestError(requestFailure, 'Could not reset your password. Please try again.'))
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
            <form noValidate onSubmit={submitLogin}>
              <label className="field-label" htmlFor="login-role">Account Role</label>
              <select
                id="login-role"
                className={errors.role ? 'input-error' : ''}
                value={role}
                onChange={(event) => {
                  const value = event.currentTarget.value
                  if (value === 'Admin' || value === 'HR' || value === 'Employee' || value === '') setRole(value)
                  clearFieldError('role')
                }}
                aria-invalid={Boolean(errors.role)}
              >
                <option value="">Select your role</option>
                <option value="Admin">Admin</option>
                <option value="HR">HR</option>
                <option value="Employee">Employee</option>
              </select>
              <FieldError message={errors.role} />
              <label className="field-label" htmlFor="login-identifier">Email or Unique ID</label>
              <input
                id="login-identifier"
                type="text"
                autoComplete="username"
                value={identifier}
                onInput={(event) => { setIdentifier(event.currentTarget.value); clearFieldError('identifier') }}
                className={errors.identifier ? 'input-error' : ''}
                aria-invalid={Boolean(errors.identifier)}
              />
              <FieldError message={errors.identifier} />
              <label className="field-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onInput={(event) => { setPassword(event.currentTarget.value); clearFieldError('password') }}
                className={errors.password ? 'input-error' : ''}
                aria-invalid={Boolean(errors.password)}
              />
              <FieldError message={errors.password} />
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <button className="forgot-link" type="button" onClick={() => changePage('forgot')}>Forgot password?</button>
              <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <p className="auth-switch">Don&apos;t have an account? <a href="/signup" onClick={(event) => { event.preventDefault(); changePage('signup') }}>Sign up</a></p>
          </>
        )}

        {page === 'signup' && (
          <>
            <h1>Create your account</h1>
            <p className="login-copy">Complete registration to receive your permanent Northstar Unique ID.</p>
            {registeredId ? (
              <div className="signup-success" role="status">
                <span>{success}</span>
                <strong>{registeredId}</strong>
                <button type="button" onClick={() => changePage('login')}>Continue to sign in</button>
              </div>
            ) : (
              <form noValidate onSubmit={requestSignupOtp}>
                <label className="field-label" htmlFor="signup-name">Full Name</label>
                <input id="signup-name" autoComplete="name" value={signup.name} onInput={(event) => { setSignup({ ...signup, name: event.currentTarget.value }); clearFieldError('name') }} className={errors.name ? 'input-error' : ''} aria-invalid={Boolean(errors.name)} />
                <FieldError message={errors.name} />
                <label className="field-label" htmlFor="signup-email">Email address</label>
                <input id="signup-email" type="email" autoComplete="email" value={signup.email} onInput={(event) => { setSignup({ ...signup, email: event.currentTarget.value }); clearFieldError('email') }} className={errors.email ? 'input-error' : ''} aria-invalid={Boolean(errors.email)} />
                <FieldError message={errors.email} />
                <label className="field-label" htmlFor="signup-phone">Contact Number</label>
                <input id="signup-phone" type="tel" autoComplete="tel" value={signup.phone} onInput={(event) => { setSignup({ ...signup, phone: event.currentTarget.value }); clearFieldError('phone') }} className={errors.phone ? 'input-error' : ''} aria-invalid={Boolean(errors.phone)} />
                <FieldError message={errors.phone} />
                <label className="field-label" htmlFor="signup-dob">Date of birth (DDMMYYYY)</label>
                <input id="signup-dob" type="text" inputMode="numeric" maxLength={8} placeholder="DDMMYYYY" value={signup.dateOfBirth} onInput={(event) => { setSignup({ ...signup, dateOfBirth: event.currentTarget.value.replace(/\D/g, '') }); clearFieldError('dateOfBirth') }} className={errors.dateOfBirth ? 'input-error' : ''} aria-invalid={Boolean(errors.dateOfBirth)} />
                <FieldError message={errors.dateOfBirth} />
                <label className="field-label" htmlFor="signup-role">Account Role</label>
                <select id="signup-role" value={signup.role} onChange={(event) => {
                  const value = event.currentTarget.value
                  if (value === 'Admin' || value === 'HR' || value === 'Employee' || value === '') setSignup({ ...signup, role: value })
                  clearFieldError('signupRole')
                }} className={errors.signupRole ? 'input-error' : ''} aria-invalid={Boolean(errors.signupRole)}>
                  <option value="">Select your role</option>
                  <option value="Admin">Admin</option>
                  <option value="HR">HR</option>
                  <option value="Employee">Employee</option>
                </select>
                <FieldError message={errors.signupRole} />
                <label className="field-label" htmlFor="signup-password">Password</label>
                <input id="signup-password" type="password" autoComplete="new-password" minLength={8} value={signup.password} onInput={(event) => { setSignup({ ...signup, password: event.currentTarget.value }); clearFieldError('signupPassword') }} className={errors.signupPassword ? 'input-error' : ''} aria-invalid={Boolean(errors.signupPassword)} />
                <FieldError message={errors.signupPassword} />
                <label className="field-label" htmlFor="signup-confirm-password">Confirm Password</label>
                <input id="signup-confirm-password" type="password" autoComplete="new-password" minLength={8} value={signup.confirmPassword} onInput={(event) => { setSignup({ ...signup, confirmPassword: event.currentTarget.value }); clearFieldError('confirmPassword') }} className={errors.confirmPassword ? 'input-error' : ''} aria-invalid={Boolean(errors.confirmPassword)} />
                <FieldError message={errors.confirmPassword} />
                {formError && <p className="form-error" role="alert">{formError}</p>}
                <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting…' : 'Submit'}
                </button>
              </form>
            )}
            <p className="auth-switch">Already have an account? <a href="/login" onClick={(event) => { event.preventDefault(); changePage('login') }}>Sign in</a></p>
          </>
        )}

        {page === 'forgot' && (
          <>
            <h1>Reset password</h1>
            <p className="login-copy">Enter your unique ID and registered email address.</p>
            {success && <p className="form-success" role="status">{success}</p>}
            {!resetVerified ? (
              <form noValidate onSubmit={requestResetOtp}>
                <label className="field-label" htmlFor="reset-id">Unique ID</label>
                <input id="reset-id" autoComplete="username" value={forgot.uniqueId} onInput={(event) => { setForgot({ ...forgot, uniqueId: event.currentTarget.value }); clearFieldError('uniqueId') }} className={errors.uniqueId ? 'input-error' : ''} aria-invalid={Boolean(errors.uniqueId)} />
                <FieldError message={errors.uniqueId} />
                <label className="field-label" htmlFor="reset-email">Email</label>
                <input id="reset-email" type="email" autoComplete="email" value={forgot.email} onInput={(event) => { setForgot({ ...forgot, email: event.currentTarget.value }); clearFieldError('resetEmail') }} className={errors.resetEmail ? 'input-error' : ''} aria-invalid={Boolean(errors.resetEmail)} />
                <FieldError message={errors.resetEmail} />
                {formError && <p className="form-error" role="alert">{formError}</p>}
                <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending code…' : 'Submit'}
                </button>
              </form>
            ) : (
              <form noValidate onSubmit={submitResetPassword}>
                <label className="field-label" htmlFor="reset-password">New password</label>
                <input id="reset-password" type="password" autoComplete="new-password" minLength={8} value={forgot.password} onInput={(event) => { setForgot({ ...forgot, password: event.currentTarget.value }); clearFieldError('resetPassword') }} className={errors.resetPassword ? 'input-error' : ''} aria-invalid={Boolean(errors.resetPassword)} />
                <FieldError message={errors.resetPassword} />
                <label className="field-label" htmlFor="confirm-reset-password">Confirm new password</label>
                <input id="confirm-reset-password" type="password" autoComplete="new-password" minLength={8} value={forgot.confirmPassword} onInput={(event) => { setForgot({ ...forgot, confirmPassword: event.currentTarget.value }); clearFieldError('confirmResetPassword') }} className={errors.confirmResetPassword ? 'input-error' : ''} aria-invalid={Boolean(errors.confirmResetPassword)} />
                <FieldError message={errors.confirmResetPassword} />
                {formError && <p className="form-error" role="alert">{formError}</p>}
                <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating password…' : 'Submit'}
                </button>
              </form>
            )}
            <p className="auth-switch"><a href="/login" onClick={(event) => { event.preventDefault(); changePage('login') }}>Back to sign in</a></p>
          </>
        )}
      </section>

      {otpMode && (
        <div className="otp-backdrop">
          <section className="otp-dialog" role="dialog" aria-modal="true" aria-labelledby="otp-title">
            <h2 id="otp-title">{otpMode === 'signup' ? 'Verify your OTP' : 'Verify your identity'}</h2>
            <p>{otpMode === 'signup' ? 'Enter the 6-digit code to complete registration.' : `Enter the 6-digit code sent to ${forgot.email}.`}</p>
            {otpMode === 'signup'
              ? <p className="otp-timer" role="status">Your OTP is: {signupOtp}</p>
              : devOtp && <p className="otp-timer" role="status">Dev mode: OTP is {devOtp}. It has been filled in for you.</p>}
            <form noValidate onSubmit={otpMode === 'signup' ? confirmSignup : verifyResetOtp}>
              <label className="field-label" htmlFor="auth-otp">6-digit verification code</label>
              <input id="auth-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onInput={(event) => { setOtp(event.currentTarget.value.replace(/\D/g, '')); setFormError('') }} aria-invalid={Boolean(formError)} />
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying…' : otpMode === 'signup' ? 'Registration' : 'Verify OTP'}
              </button>
              {otpMode === 'reset' && (
                <>
                  <p className="otp-timer" aria-live="polite">
                    {resendSeconds > 0 ? `You can request another code in ${resendSeconds}s.` : 'You can request another code now.'}
                  </p>
                  {resendSeconds === 0 && <button className="forgot-link" type="button" onClick={() => void resendOtp()} disabled={isSubmitting}>Resend code</button>}
                </>
              )}
              <button className="forgot-link otp-cancel" type="button" onClick={() => { setOtpMode(null); setSignupOtp(''); setDevOtp(''); setFormError('') }}>Cancel</button>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
