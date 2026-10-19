import { useState } from 'preact/hooks'

type Employee = {
  _id: string
  name: string
  email: string
  department: string
  salary: number
}

type SalaryStructureProps = {
  employees: Employee[]
  salaryValues: Record<string, number>
  onSaveBasic: (employeeId: string, basicSalary: number) => void
  onNotify: (message: string, tone?: 'success' | 'error') => void
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export default function SalaryStructure({ employees, salaryValues, onSaveBasic, onNotify }: SalaryStructureProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const saveBasic = (employee: Employee) => {
    const rawBasic = drafts[employee._id] ?? String(salaryValues[employee._id] ?? employee.salary)
    const basic = Number(rawBasic)
    if (!rawBasic.trim() || !Number.isFinite(basic) || basic < 0) {
      onNotify('Enter a valid, non-negative basic salary.', 'error')
      return
    }
    onSaveBasic(employee._id, basic)
    setDrafts((current) => {
      const next = { ...current }
      delete next[employee._id]
      return next
    })
    onNotify(`${employee.name}'s salary structure preview was updated.`)
  }

  return (
    <section className="panel salary-structure-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">COMPENSATION OPERATIONS</span><h2>Salary structure</h2></div>
      </div>
      <p className="salary-structure-intro">Edit each employee’s monthly basic salary. Allowances and deductions recalculate using the configured percentages.</p>
      {employees.length ? (
        <div className="table-wrap">
          <table className="data-table salary-structure-table">
            <thead><tr><th>Employee</th><th>Basic</th><th>HRA · 40%</th><th>DA · 10%</th><th>PF · 12%</th><th>Tax · 5%</th><th>Estimated net</th><th>Action</th></tr></thead>
            <tbody>
              {employees.map((employee) => {
                const basic = Number(drafts[employee._id] ?? salaryValues[employee._id] ?? employee.salary) || 0
                const hra = basic * 0.4
                const da = basic * 0.1
                const pf = basic * 0.12
                const tax = basic * 0.05
                return (
                  <tr key={employee._id || employee.email}>
                    <td><div className="salary-employee"><strong>{employee.name}</strong><small>{employee.department || employee.email}</small></div></td>
                    <td><label className="salary-input"><span className="sr-only">Basic salary for {employee.name}</span><input type="number" min="0" step="100" value={drafts[employee._id] ?? String(salaryValues[employee._id] ?? employee.salary)} onInput={(event) => setDrafts((current) => ({ ...current, [employee._id]: event.currentTarget.value }))} /></label></td>
                    <td>{currency.format(hra)}</td>
                    <td>{currency.format(da)}</td>
                    <td>{currency.format(pf)}</td>
                    <td>{currency.format(tax)}</td>
                    <td><strong>{currency.format(basic + hra + da - pf - tax)}</strong></td>
                    <td><button className="table-action" type="button" onClick={() => saveBasic(employee)}>Save preview</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="muted-copy">Add employees to manage their salary structures.</p>}
      <p className="module-note">This editable preview is kept for the current dashboard session and does not change employee records or generated payroll. Final payroll is calculated by the payroll service.</p>
    </section>
  )
}
