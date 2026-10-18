import { useState } from 'react'

export default function Attendance({ employees }: { employees: any[] }) {
  const [attendance, setAttendance] = useState<Record<string,string>>({})

  const mark = (email: string, status: string) => {
    setAttendance({...attendance, [email]: status})
  }

  const presentCount = Object.values(attendance).filter(v=>v==='Present').length

  return (
    <div style={{marginTop:20}}>
      <h2>Attendance Today - Present: {presentCount}/{employees.length}</h2>
      <table border={1} cellPadding={8} style={{width:'100%', borderCollapse:'collapse'}}>
        <thead><tr><th>Name</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {employees.map((e:any,i:number)=>(
            <tr key={i}>
              <td>{e.name}</td>
              <td>{attendance[e.email] || '-'}</td>
              <td>
                <button onClick={()=>mark(e.email,'Present')} style={{marginRight:5, background:'#4caf50', color:'white'}}>Present</button>
                <button onClick={()=>mark(e.email,'Absent')} style={{background:'#f44336', color:'white'}}>Absent</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
