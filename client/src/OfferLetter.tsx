import { useState } from 'react'
import jsPDF from 'jspdf'
import { logAudit } from './audit'

export default function OfferLetter({ employees }: { employees: any[] }) {
  const [sel, setSel] = useState('')

  const generate = () => {
    const e = employees.find((x:any)=>(x._id||x.email)===sel)
    if(!e){ alert('Select employee'); return }
    const doc = new jsPDF()
    doc.setFontSize(18)
    doc.text('Offer Letter', 20, 20)
    doc.setFontSize(12)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 32)
    doc.text(`Dear ${e.name},`, 20, 45)
    const body = `We are pleased to offer you the position of ${e.designation||e.department} in ${e.department} department with an annual CTC of Rs. ${Number(e.salary)*12}. You are requested to join on or before 30 days from this letter.`
    const lines = doc.splitTextToSize(body, 170)
    doc.text(lines, 20, 60)
    doc.text('Terms: PF, gratuity as per company policy.', 20, 90)
    doc.text('Sincerely,', 20, 120)
    doc.text('HR Manager', 20, 135)
    doc.save(`${e.name}-offer-letter.pdf`)
    logAudit('OFFER', `Generated offer letter for ${e.name}`)
  }

  return (
    <div style={{marginTop:20, border:'1px solid #555', padding:15, borderRadius:8}}>
      <h2>Offer Letter Generator</h2>
      <div style={{display:'flex', gap:10}}>
        <select value={sel} onChange={e=>setSel(e.target.value)} style={{padding:8, flex:1}}>
          <option value="">Select Employee</option>
          {employees.map((e:any)=><option key={e._id||e.email} value={e._id||e.email}>{e.name} - {e.department}</option>)}
        </select>
        <button onClick={generate} style={{padding:'8px 16px', background:'#9c27b0', color:'white', border:'none', borderRadius:4}}>Generate PDF</button>
      </div>
    </div>
  )
}
