import { useState, useEffect } from 'react'
import { logAudit } from './audit'

export default function Performance({ employees }: { employees: any[] }) {
  const [ratings, setRatings] = useState<{[k:string]:number}>(()=>JSON.parse(localStorage.getItem('perf')||'{}'))

  const setRating = (id:string, name:string, v:number) => {
    const nr = {...ratings, [id]:v}
    setRatings(nr)
    localStorage.setItem('perf', JSON.stringify(nr))
    logAudit('PERFORMANCE', `Rated ${name} ${v}/5`)
  }

  useEffect(()=>{},[])

  return (
    <div style={{marginTop:20}}>
      <h2>Performance Review</h2>
      <table border={1} cellPadding={6} style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
        <thead><tr><th>Name</th><th>Department</th><th>Rating</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {employees.map((e:any)=>{
            const id = e._id||e.email
            const r = ratings[id]||0
            const eligible = r>=4
            return <tr key={id}>
              <td>{e.name}</td><td>{e.department}</td>
              <td>{'⭐'.repeat(r)}{r===0?' -':` ${r}/5`}</td>
              <td>{r===0?'Not rated': eligible ? '✅ Promotion Eligible' : 'Continue'}</td>
              <td>
                {[1,2,3,4,5].map(v=><button key={v} onClick={()=>setRating(id,e.name,v)} style={{marginRight:3, background: r===v ? '#ff9800' : '#eee'}}>{v}</button>)}
              </td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  )
}
