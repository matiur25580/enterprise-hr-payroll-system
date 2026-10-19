import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import jsPDF from 'jspdf'
import { apiUrl } from '../services/api'

type Analytics = {
  headcount: number
  monthlyPayrollCost: number
  departments: Array<{ name: string; headcount: number; monthlyPayrollCost: number }>
  monthlyExits: Array<{ month: string; count: number }>
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export default function WorkforceAnalytics({
  token,
  onNotify,
  onUnauthorized,
}: {
  token: string
  onNotify: (message: string, tone?: 'success' | 'error') => void
  onUnauthorized: () => void
}) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    axios.get<Analytics>(`${apiUrl}/api/analytics/workforce`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      if (active) setAnalytics(response.data)
    }).catch((requestError) => {
      if (!active) return
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load workforce analytics. Please try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token])

  if (loading) return <section className="panel loading-state" role="status"><span className="loading-indicator" />Loading workforce analytics…</section>
  if (error) return <section className="panel"><p className="form-error" role="alert">{error}</p></section>
  if (!analytics) return <section className="panel empty-state"><h2>Analytics are unavailable</h2></section>

  const maxExits = Math.max(1, ...analytics.monthlyExits.map((item) => item.count))
  const exportCsv = () => {
    const cells = [
      ['Workforce metric', 'Value'],
      ['Active headcount', analytics.headcount],
      ['Monthly payroll cost', analytics.monthlyPayrollCost],
      [],
      ['Department', 'Headcount', 'Monthly payroll cost'],
      ...analytics.departments.map((department) => [department.name, department.headcount, department.monthlyPayrollCost]),
      [],
      ['Month', 'Recorded employee exits'],
      ...analytics.monthlyExits.map((item) => [item.month, item.count]),
    ]
    const csv = cells.map((row) => row.map((value) => {
      const cell = String(value ?? '')
      const safeCell = /^[\t\r\n ]*[=+\-@]/.test(cell) ? `'${cell}` : cell
      return `"${safeCell.replaceAll('"', '""')}"`
    }).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'workforce-analytics.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    onNotify('Workforce analytics spreadsheet exported.')
  }

  const exportPdf = () => {
    try {
      const pdf = new jsPDF()
      pdf.setFontSize(18)
      pdf.text('Workforce analytics', 20, 20)
      pdf.setFontSize(11)
      pdf.text(`Active headcount: ${analytics.headcount}`, 20, 34)
      pdf.text(`Monthly payroll cost: ${currency.format(analytics.monthlyPayrollCost)}`, 20, 44)
      pdf.text('Department breakdown', 20, 60)
      let y = 70
      for (const department of analytics.departments) {
        if (y > 260) {
          pdf.addPage()
          y = 20
        }
        pdf.text(`${department.name}: ${department.headcount} employees · ${currency.format(department.monthlyPayrollCost)}`, 20, y)
        y += 8
      }
      if (y > 260) {
        pdf.addPage()
        y = 20
      }
      pdf.text('Recorded employee exits (last 12 months)', 20, y + 6)
      y += 16
      for (const item of analytics.monthlyExits) {
        if (y > 275) {
          pdf.addPage()
          y = 20
        }
        pdf.text(`${item.month}: ${item.count}`, 20, y)
        y += 7
      }
      pdf.setFontSize(9)
      pdf.text('Exit counts are based on audited employee-record removals; they are not a verified attrition rate.', 20, Math.min(y + 8, 285))
      pdf.save('workforce-analytics.pdf')
      onNotify('Workforce analytics PDF exported.')
    } catch (generationError) {
      console.error('Could not generate workforce analytics PDF:', generationError)
      onNotify('Could not create the analytics PDF. Please try again.', 'error')
    }
  }

  return (
    <div className="workforce-analytics">
      <div className="stats-grid">
        <article className="stat-card stat-blue"><div className="stat-topline"><span>Active headcount</span></div><strong>{analytics.headcount}</strong><small>Current employee directory</small></article>
        <article className="stat-card stat-green"><div className="stat-topline"><span>Monthly payroll cost</span></div><strong>{currency.format(analytics.monthlyPayrollCost)}</strong><small>Current recorded gross salary total</small></article>
      </div>
      <section className="panel analytics-chart-panel">
        <div className="panel-heading">
          <div><span className="eyebrow">LAST 12 MONTHS</span><h2>Recorded employee exits</h2></div>
          <div className="analytics-export-actions">
            <button className="secondary-button" type="button" onClick={exportCsv}>Export spreadsheet</button>
            <button className="secondary-button" type="button" onClick={exportPdf}>Export PDF</button>
          </div>
        </div>
        {analytics.monthlyExits.length ? (
          <div className="exit-chart" role="img" aria-label="Monthly count of audited employee removals over the last 12 months">
            {analytics.monthlyExits.map((item) => (
              <div className="exit-chart-column" key={item.month} title={`${item.month}: ${item.count} recorded exits`}>
                <strong>{item.count}</strong>
                <span className="exit-chart-track"><span style={{ height: `${Math.max(4, item.count / maxExits * 100)}%` }} /></span>
                <small>{new Date(`${item.month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' })}</small>
              </div>
            ))}
          </div>
        ) : <p className="table-empty">No exit records are available for this period.</p>}
        <p className="muted-copy">Counts are based on audited employee-record removals, not a statutory or HR-verified attrition rate.</p>
      </section>
      <section className="panel analytics-departments-panel">
        <div className="panel-heading"><div><span className="eyebrow">WORKFORCE MIX</span><h2>Department headcount & payroll</h2></div></div>
        {analytics.departments.length ? (
          <div className="table-wrap"><table className="data-table">
            <thead><tr><th>Department</th><th>Headcount</th><th>Monthly payroll cost</th></tr></thead>
            <tbody>{analytics.departments.map((department) => (
              <tr key={department.name}><td>{department.name}</td><td>{department.headcount}</td><td>{currency.format(department.monthlyPayrollCost)}</td></tr>
            ))}</tbody>
          </table></div>
        ) : <p className="table-empty">No employee data is available for analytics.</p>}
      </section>
    </div>
  )
}
