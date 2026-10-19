import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import Login from './Login'
import Dashboard from './Dashboard'
import { apiUrl } from '../services/api'
import type { Role, UserSession } from '../utils/role'

const roleNames: Record<string, Role> = {
  admin: 'Admin',
  hr: 'HR',
  employee: 'Employee',
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [restoring, setRestoring] = useState(Boolean(localStorage.getItem('token')))
  const [restoreAttempt, setRestoreAttempt] = useState(0)
  const [restoreError, setRestoreError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setRestoring(false)
      return
    }

    let active = true
    setRestoring(true)
    axios.get<{ user: { name: string; email: string; role: string } }>(`${apiUrl}/api/auth/session`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      if (!active) return
      const role = roleNames[response.data.user.role.toLowerCase()]
      if (!role) {
        setRestoreError('This account has an unsupported role. Please contact your administrator.')
        return
      }
      const restored = {
        token,
        role,
        email: response.data.user.email.trim().toLowerCase(),
        name: response.data.user.name,
      }
      localStorage.setItem('role', restored.role)
      localStorage.setItem('userEmail', restored.email)
      localStorage.setItem('userName', restored.name)
      setSession(restored)
      setRestoreError('')
    }).catch((error: unknown) => {
      if (!active) return
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('userName')
        setRestoreError('Your session has expired. Please sign in again.')
      } else {
        setRestoreError('Could not verify your saved session. Check your connection and try again.')
      }
    }).finally(() => {
      if (active) setRestoring(false)
    })

    return () => { active = false }
  }, [restoreAttempt])

  const signIn = (nextSession: UserSession) => {
    localStorage.setItem('token', nextSession.token)
    localStorage.setItem('role', nextSession.role)
    localStorage.setItem('userEmail', nextSession.email)
    localStorage.setItem('userName', nextSession.name)
    setSession(nextSession)
  }

  if (restoring) return <main className="login-page"><div className="loading-state" role="status"><span className="loading-indicator" />Restoring your secure session…</div></main>
  if (!session) return (
    <>
      {restoreError && <div className="session-restore-notice" role="alert"><span>{restoreError}</span>{localStorage.getItem('token') && <button type="button" onClick={() => setRestoreAttempt((attempt) => attempt + 1)}>Retry</button>}</div>}
      <Login onLogin={signIn} />
    </>
  )

  return <Dashboard session={session} onLogout={() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    setSession(null)
  }} />
}
