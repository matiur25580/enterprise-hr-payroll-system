import { useState } from 'react'
import jsPDF from 'jspdf'
import { calcPayroll } from './tax'
import { logAudit } from './audit'

export default function Payroll({ employees }: { employees: any[] }) {
  const [paid, setPaid] = useState<{[k:string]:boolean}>({})

  const downloadSlip = (e:any) => {
    const p = calcPayroll(Number(e.salary))
    const doc = new jsPDF()
    doc.text('Payslip - '+e.name, 20, 20)
    doc.text(`Email: ${e.email}`, 20, 30)
    doc.text(`Department: ${e.department}`, 20, 40)
    doc.text(`Gross Salary: ${e.salary}`, 20, 55)
    doc.text(`Basic (50%): ${p.basic}`, 20, 65)
    doc.text(`HRA (40%): ${p.hra}`, 20, 75)
    doc.text(`PF (12% of basic): ${p.pf}`, 20, 85)
    doc.text(`Tax: ${p.tax}`, 20, 95)
    doc.text(`Net Payable: ${p.net}`, 20, 110)
    doc.save(`${e.name}-payslip.pdf`)
    logAudit('PAYSLIP', `Downloaded payslip for ${e.name} net ${p.net}`)
  }

  const markPaid = (e:any) => {
    const p = calcPayroll(Number(e.salary))
    setPaid({...paid, [e._id]:true})
    logAudit('PAYROLL', `Paid ${e.name} net ${p.net}`)
  }

  return (
    <div style={{marginTop:20}}>
      <h2>Payroll with Tax Engine</h2>
      <table border={1} cellPadding={6} style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
        <thead><tr><th>Name</th><th>Gross</th><th>PF</th><th>Tax</th><th>Net</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {employees.map((e:any)=>{
            const p = calcPayroll(Number(e.salary)||0)
            return <tr key={e._id||e.email}>
              <td>{e.name}</td><td>{e.salary}</td><td>{p.pf}</td><td>{p.tax}</td><td><b>{p.net}</b></td>
              <td>{paid[e._id] ? 'Paid' : 'Pending'}</td>
              <td>
                <button onClick={()=>downloadSlip(e)} style={{marginRight:5}}>PDF Slip</button>
                <button onClick={()=>markPaid(e)} disabled={paid[e._id]}>Mark Paid</button>
              </td>
            </tr>
          })}
        </tbody>
      </table>
    </div>
  )
}
