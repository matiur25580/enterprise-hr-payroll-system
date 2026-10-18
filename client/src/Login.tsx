import { useState } from 'react'
import axios from 'axios'

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Admin')

  const handleSubmit = async (e:any) => {
    e.preventDefault()
    try {
      const API = 'https://special-disco-xj445w5xwpf6xjv-5000.app.github.dev'
      const res = await axios.post(`${API}/api/auth/login`, { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('role', role)
      localStorage.setItem('userEmail', email)
      onLogin()
    } catch(err){ alert('Login failed') }
  }

  return (
    <div style={{padding:40, maxWidth:400, margin:'50px auto', border:'1px solid #555', borderRadius:8}}>
      <h2>HR Login</h2>
      <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:10}}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required style={{padding:8}} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required style={{padding:8}} />
        <select value={role} onChange={e=>setRole(e.target.value)} style={{padding:8}}>
          <option>Admin</option>
          <option>HR</option>
          <option>Employee</option>
        </select>
        <button type="submit" style={{padding:10}}>Login as {role}</button>
      </form>
      <p style={{fontSize:12, marginTop:10}}>Admin = full access<br/>HR = no delete<br/>Employee = only own payslip</p>
    </div>
  )
}
