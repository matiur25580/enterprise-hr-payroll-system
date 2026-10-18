import { getAudits } from './audit'
import { useState } from 'react'

export default function AuditLog() {
  const [logs] = useState(getAudits())
  const [show, setShow] = useState(false)
  if(!show) return <button onClick={()=>setShow(true)} style={{marginTop:20, padding:'8px 16px'}}>View Audit Log ({logs.length})</button>
  return (
    <div style={{marginTop:20}}>
      <h2>Audit Log <button onClick={()=>setShow(false)} style={{marginLeft:10}}>Hide</button></h2>
      <table border={1} cellPadding={6} style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
        <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Details</th></tr></thead>
        <tbody>{logs.map((l:any,i:number)=><tr key={i}><td>{l.time}</td><td>{l.user}</td><td>{l.role}</td><td>{l.action}</td><td>{l.details}</td></tr>)}</tbody>
      </table>
    </div>
  )
}
