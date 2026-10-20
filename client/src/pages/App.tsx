import { useEffect, useState } from 'preact/hooks'
import Login from './Login'
import Dashboard from './Dashboard'
import type { Role, UserSession } from '../utils/role'

const roles: Role[] = ['Admin', 'HR', 'Employee']
const rolePaths: Record<Role, string> = {
  Admin: '/admin',
  HR: '/hr',
  Employee: '/employee',
}

function isRole(value: unknown): value is Role {
  return roles.some((role) => role === value)
}

function isStoredUser(value: unknown): value is Pick<UserSession, 'role' | 'email' | 'name'> {
  if (typeof value !== 'object' || value === null) return false
  const user = value as Record<string, unknown>
  return isRole(user.role) && typeof user.email === 'string' && typeof user.name === 'string'
}

function restoreSession(): UserSession | null {
  const token = sessionStorage.getItem('hr_token')?.trim() || sessionStorage.getItem('token')?.trim()
  if (!token) return null

  const storedUser = sessionStorage.getItem('hr_user')
  if (storedUser) {
    try {
      const user: unknown = JSON.parse(storedUser)
      if (isStoredUser(user)) return { token, ...user }
    } catch (error) {
      console.error('Could not restore the saved user session:', error)
    }
  }

  const role = sessionStorage.getItem('role')
  const email = sessionStorage.getItem('userEmail')
  const name = sessionStorage.getItem('userName')
  if (email && name && isRole(role)) {
    return { token, email, name, role }
  }
  return null
}

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null)
  const [authInitialized, setAuthInitialized] = useState(false)

  useEffect(() => {
    setSession(restoreSession())
    setAuthInitialized(true)
  }, [])

  useEffect(() => {
    if (!authInitialized) return
    const route = session
      ? rolePaths[session.role]
      : ['/', '/login', '/signup'].includes(window.location.pathname) && window.location.pathname !== '/'
        ? window.location.pathname
        : '/login'
    if (window.location.pathname !== route) window.history.replaceState(null, '', route)
  }, [authInitialized, session])

  const signIn = (nextSession: UserSession) => {
    sessionStorage.setItem('hr_token', nextSession.token)
    sessionStorage.setItem('hr_user', JSON.stringify({
      role: nextSession.role,
      email: nextSession.email,
      name: nextSession.name,
    }))
    sessionStorage.setItem('token', nextSession.token)
    sessionStorage.setItem('role', nextSession.role)
    sessionStorage.setItem('userEmail', nextSession.email)
    sessionStorage.setItem('userName', nextSession.name)
    setSession(nextSession)
  }

  if (!authInitialized) {
    return <div className="loading-state" role="status">Restoring your session…</div>
  }

  if (!session) return <Login onLogin={signIn} />

  return <Dashboard session={session} onLogout={() => {
    sessionStorage.clear()
    setSession(null)
  }} />
}
