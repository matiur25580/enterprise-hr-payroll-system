import { useEffect, useState } from 'react'
import axios from 'axios'
import AddEmployee from './AddEmployee'
import Payroll from './Payroll'
import Attendance from './Attendance'
import Leave from './Leave'
import SalaryChart from './SalaryChart'
import AuditLog from './AuditLog'
import OfferLetter from './OfferLetter'
import Performance from './Performance'
import { logAudit } from './audit'
import { getRole, getUserEmail, canDelete, canEdit, canAdd } from './role'

export default function Dashboard() {
  const [employees, setEmployees] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [dark, setDark] = useState(true)
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')
  const API = 'https://special-disco-xj445w5xwpf6xjv-5000.app.github.dev'
  const role = getRole()
  const userEmail = getUserEmail()

  const fetchEmps = () => {
    axios.get(`${API}/api/employees`, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => setEmployees(res.data))
    .catch(err => console.log(err))
    .finally(() => setLoading(false))
  }
  useEffect(() => { fetchEmps() }, [])

  const handleDelete = async (id: string, name: string) => {
    if(!canDelete()){ alert('Only Admin can delete'); return }
    if(!confirm('Delete this employee?')) return
    await axios.delete(`${API}/api/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    logAudit('DELETE', `Deleted employee ${name}`)
    fetchEmps()
  }

  const handleEdit = async (emp: any) => {
    if(!canEdit()){ alert('No permission'); return }
    const newSalary = prompt('New Salary:', emp.salary)
    if(newSalary === null) return
    const newDept = prompt('New Department:', emp.department)
    if(newDept === null) return
    await axios.put(`${API}/api/employees/${emp._id}`,
      { salary: newSalary, department: newDept },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    logAudit('EDIT', `Edited ${emp.name} salary ${emp.salary}->${newSalary}`)
    fetchEmps()
  }

  const exportCSV = () => {
    logAudit('EXPORT', `Exported ${filtered.length} employees CSV`)
    const header = 'Name,Email,Department,Designation,Salary\n'
    const rows = filtered.map((e:any)=>`${e.name},${e.email},${e.department},${e.designation||''},${e.salary}`).join('\n')
    const blob = new Blob([header+rows], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'employees.csv'; a.click()
  }

  const departments = ['All', ...Array.from(new Set(employees.map((e:any)=>e.department)))]
  let baseList = employees
  if(role==='Employee'){ baseList = employees.filter((e:any)=>e.email===userEmail) }
  const filtered = baseList.filter((e:any)=>{
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter==='All' || e.department===deptFilter
    return matchSearch && matchDept
  })

  const totalSalary = employees.reduce((s:any,e:any)=>s+Number(e.salary||0),0)
  const logout = () => { localStorage.clear(); window.location.reload() }
  const bg = dark ? '#121212' : '#ffffff'
  const fg = dark ? '#ffffff' : '#000000'
  const cardBg = dark ? '#1e1e1e' : '#f9f9f9'

  return (
    <div style={{padding:20, fontFamily:'sans-serif', background:bg, color:fg, minHeight:'100vh'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>HR & Payroll Dashboard <span style={{fontSize:14, background:'#2196F3', color:'white', padding:'4px 8px', borderRadius:4}}>{role}</span></h1>
        <div>
          <button onClick={()=>setDark(!dark)} style={{padding:'8px 16px', marginRight:8}}>{dark ? '☀️ Light' : '🌙 Dark'}</button>
          <button onClick={logout} style={{padding:'8px 16px'}}>Logout</button>
        </div>
      </div>

      {role!=='Employee' && (
      <div style={{display:'flex', gap:10, margin:'20px 0'}}>
        <div style={{border:'1px solid #555', padding:15, borderRadius:8, flex:1, background:cardBg}}><h3>Total Employees</h3><p style={{fontSize:24}}>{employees.length}</p></div>
        <div style={{border:'1px solid #555', padding:15, borderRadius:8, flex:1, background:cardBg}}><h3>Total Salary</h3><p style={{fontSize:24}}>{totalSalary}</p></div>
        <div style={{border:'1px solid #555', padding:15, borderRadius:8, flex:1, background:cardBg}}><h3>Departments</h3><p style={{fontSize:24}}>{departments.length-1}</p></div>
      </div>
      )}

      {canAdd() && (<><h2>Add Employee</h2><AddEmployee onAdded={()=>{logAudit('ADD','Added new employee'); fetchEmps()}} /></>)}

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2>{role==='Employee' ? 'My Profile' : 'Employees'}</h2>
        {role!=='Employee' && <button onClick={exportCSV} style={{padding:'8px 16px', background:'#4caf50', color:'white', border:'none', borderRadius:4}}>Export CSV</button>}
      </div>

      {role!=='Employee' && (
      <div style={{display:'flex', gap:10, margin:'10px 0'}}>
        <input placeholder="Search name / email / department" value={search} onChange={e=>setSearch(e.target.value)} style={{padding:8, flex:2, background:cardBg, color:fg, border:'1px solid #555'}} />
        <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} style={{padding:8, flex:1, background:cardBg, color:fg}}>
          {departments.map((d:string)=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      )}

      {loading ? <p>Loading...</p> : filtered.length===0 ? <p>No employees found.</p> :
      <table border={1} cellPadding={8} style={{width:'100%', borderCollapse:'collapse', color:fg}}>
        <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Salary</th>{role!=='Employee' && <th>Action</th>}</tr></thead>
        <tbody>{filtered.map((e:any)=><tr key={e._id||e.email}><td>{e.name}</td><td>{e.email}</td><td>{e.department}</td><td>{e.salary}</td>
        {role!=='Employee' && <td>
          {canEdit() && <button onClick={()=>handleEdit(e)} style={{marginRight:5, background:'#2196F3', color:'white'}}>Edit</button>}
          {canDelete() && <button onClick={()=>handleDelete(e._id, e.name)} style={{background:'#f44336',color:'white'}}>Delete</button>}
        </td>}</tr>)}</tbody>
      </table>}

      {role!=='Employee' && <SalaryChart employees={employees} />}
      <Payroll employees={filtered} />
      {role!=='Employee' && <Attendance employees={filtered} />}
      <Leave employees={role==='Employee' ? filtered : employees} />
      {role!=='Employee' && <OfferLetter employees={employees} />}
      {role==='Admin' && <AuditLog />}
    </div>
  )
}
