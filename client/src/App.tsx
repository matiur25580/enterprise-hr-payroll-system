import { useState } from 'preact/hooks'
import Login from './Login'
import Dashboard from './Dashboard'
import type { UserSession } from './role'

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null)

  const signIn = (nextSession: UserSession) => {
    localStorage.setItem('token', nextSession.token)
    localStorage.setItem('role', nextSession.role)
    localStorage.setItem('userEmail', nextSession.email)
    localStorage.setItem('userName', nextSession.name)
    setSession(nextSession)
  }

  if (!session) return <Login onLogin={signIn} />

  return <Dashboard session={session} onLogout={() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userName')
    setSession(null)
  }} />
}
