import { useState } from 'preact/hooks'
import Login from './Login'
import Dashboard from './Dashboard'

export default function App() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))

  if (!token) {
    return <Login onLogin={setToken} />
  }

  return (
    <Dashboard
      token={token}
      onLogout={() => {
        localStorage.removeItem('token')
        setToken(null)
      }}
    />
  )
}
