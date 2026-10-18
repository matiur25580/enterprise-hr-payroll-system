export default function SalaryChart({ employees }: { employees: any[] }) {
  const max = Math.max(...employees.map((e:any)=>Number(e.salary)||0), 1)
  return (
    <div style={{marginTop:20}}>
      <h2>Salary Chart</h2>
      {employees.map((e:any,i:number)=>(
        <div key={i} style={{margin:'8px 0'}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:14}}>
            <span>{e.name}</span><span>{e.salary}</span>
          </div>
          <div style={{background:'#eee', height:18, borderRadius:4}}>
            <div style={{width:`${(Number(e.salary)/max)*100}%`, background:'#2196F3', height:18, borderRadius:4}}></div>
          </div>
        </div>
      ))}
    </div>
  )
}
