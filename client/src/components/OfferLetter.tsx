import { useState } from 'preact/hooks'
import jsPDF from 'jspdf'
import { logAudit } from './audit'

type Employee = {
  _id: string
  name: string
  department: string
  designation: string
  salary: number
}

export default function OfferLetter({
  employees,
  onNotify,
}: {
  employees: Employee[]
  onNotify: (message: string, tone?: 'success' | 'error') => void
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [error, setError] = useState('')

  const generate = () => {
    const employee = employees.find((item) => item._id === selectedEmployeeId)
    if (!employee) {
      setError('Select an employee before generating an offer letter.')
      return
    }

    setError('')
    try {
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text('Offer Letter', 20, 20)
      doc.setFontSize(12)
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 32)
      doc.text(`Dear ${employee.name},`, 20, 45)
      const body = `We are pleased to offer you the position of ${employee.designation || employee.department} in ${employee.department} department with an annual CTC of Rs. ${Number(employee.salary) * 12}. You are requested to join on or before 30 days from this letter.`
      doc.text(doc.splitTextToSize(body, 170), 20, 60)
      doc.text('Terms: PF, gratuity as per company policy.', 20, 100)
      doc.text('Sincerely,', 20, 130)
      doc.text('HR Manager', 20, 145)
      const safeName = employee.name.replace(/[^a-z0-9-]/gi, '-')
      doc.save(`${safeName}-offer-letter.pdf`)
      logAudit('OFFER', `Generated offer letter for ${employee.name}`)
      onNotify(`Offer letter for ${employee.name} generated successfully.`)
    } catch (generationError) {
      console.error('Could not generate offer letter:', generationError)
      onNotify('Could not create the offer letter PDF. Please try again.', 'error')
    }
  }

  return (
    <section className="offer-letter-workspace">
      <h2>Offer letter generator</h2>
      <label className="offer-letter-select">
        <span>Employee</span>
        <select value={selectedEmployeeId} onChange={(event) => setSelectedEmployeeId(event.currentTarget.value)} required>
          <option value="">Select an employee</option>
          {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} · {employee.department}</option>)}
        </select>
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!employees.length && <p className="table-empty">Add an employee before generating an offer letter.</p>}
      <button className="primary-button" type="button" disabled={!employees.length} onClick={generate}>Generate PDF</button>
    </section>
  )
}
