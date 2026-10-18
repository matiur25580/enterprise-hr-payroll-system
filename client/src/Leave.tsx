import { useState } from 'react'

export default function Leave({ employees }: { employees: any[] }) {
  const [leaves, setLeaves] = useState<any[]>([])
  const [form, setForm] = useState({email:'', date:'', reason:''})

  const applyLeave = (e:any) => {
    e.preventDefault()
    const emp = employees.find((x:any)=>x.email===form.email)
    setLeaves([...leaves, {...form, name: emp?.name || form.email, status:'Pending'}])
    setForm({email:'', date:'', reason:''})
  }

  const approve = (i:number) => {
    const copy = [...leaves]
    copy[i].status = 'Approved'
    setLeaves(copy)
  }

  return (
    <div style={{marginTop:20}}>
      <h2>Leave Management</h2>
      <form onSubmit={applyLeave} style={{display:'flex', gap:8, margin:'10px 0', flexWrap:'wrap'}}>
        <select value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required>
          <option value="">Select Employee</option>
          {employees.map((x:any)=><option key={x.email} value={x.email}>{x.name}</option>)}
        </select>
        <input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required />
        <input placeholder="Reason" value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} required />
        <button type="submit">Apply Leave</button>
      </form>

      <table border={1} cellPadding={8} style={{width:'100%', borderCollapse:'collapse'}}>
        <thead><tr><th>Name</th><th>Date</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {leaves.map((l:any,i:number)=>(
            <tr key={i}><td>{l.name}</td><td>{l.date}</td><td>{l.reason}</td><td>{l.status}</td>
            <td>{l.status==='Pending' ? <button onClick={()=>approve(i)} style={{background:'#4caf50',color:'white'}}>Approve</button> : '-'}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
