type SalaryEmployee = {
  _id?: string
  name: string
  salary: number
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export default function SalaryChart({ employees }: { employees: SalaryEmployee[] }) {
  const max = Math.max(...employees.map((employee) => Number(employee.salary) || 0), 1)
  return (
    <div className="salary-chart">
      {employees.length ? employees.map((employee) => (
        <div className="salary-row" key={employee._id || employee.name}>
          <div className="salary-label">
            <span>{employee.name}</span><strong>{currency.format(Number(employee.salary) || 0)}</strong>
          </div>
          <div className="salary-track" role="meter" aria-label={`${employee.name} monthly salary`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Number(employee.salary) || 0}>
            <span style={{ width: `${Math.max(0, Math.min(100, (Number(employee.salary) / max) * 100))}%` }} />
          </div>
        </div>
      )) : <p className="muted-copy">Add employee salary details to see compensation distribution.</p>}
    </div>
  )
}
