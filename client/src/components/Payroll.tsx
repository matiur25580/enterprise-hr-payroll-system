import { useEffect, useMemo, useState } from 'preact/hooks'
import axios from 'axios'
import jsPDF from 'jspdf'
import { apiUrl } from '../services/api'
import { logAudit } from '../utils/audit'

type PayrollRecord = {
  _id: string
  employeeId: string
  employeeEmail: string
  employeeName: string
  department: string
  month: string
  grossSalary: number
  basic: number
  hra: number
  pf: number
  tax: number
  bonus: number
  deduction: number
  net: number
  status: 'Pending' | 'Paid'
  paidAt?: string
}

type PayrollProps = {
  token: string
  employeeSelfService: boolean
  employee?: {
    name: string
    email: string
    department: string
    designation: string
    salary: number
  }
  onNotify: (message: string, tone?: 'success' | 'error') => void
  onUnauthorized: () => void
}

type EmployeePayslip = {
  month: string
  grossSalary: number
  pf: number
  tax: number
  net: number
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const currentMonth = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = (month: string) => {
  const [year, value] = month.split('-').map(Number)
  return new Date(year, value - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

const financialYearForMonth = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const startYear = monthNumber >= 4 ? year : year - 1
  return `${startYear}-${startYear + 1}`
}

const currentFinancialYear = () => financialYearForMonth(currentMonth())

export default function Payroll({ token, employeeSelfService, employee, onNotify, onUnauthorized }: PayrollProps) {
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [month, setMonth] = useState(currentMonth)
  const [taxYear, setTaxYear] = useState(currentFinancialYear)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const availableTaxYears = useMemo(
    () => [...new Set([currentFinancialYear(), ...records.map((record) => financialYearForMonth(record.month))])].sort().reverse(),
    [records],
  )
  const employeePayslips = useMemo<EmployeePayslip[]>(() => {
    if (!employee) return []
    const grossSalary = Number(employee.salary) || 0
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date()
      date.setDate(1)
      date.setMonth(date.getMonth() - index)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const pf = grossSalary * 0.12
      const tax = grossSalary * 0.05
      return { month, grossSalary, pf, tax, net: grossSalary - pf - tax }
    })
  }, [employee])

  const loadPayroll = async () => {
    try {
      const response = await axios.get<PayrollRecord[]>(`${apiUrl}/api/payroll`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setRecords(response.data)
      setError('')
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load payroll records. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPayroll()
  }, [token])

  const generatePayroll = async (event: Event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const response = await axios.post<{ message: string; records: PayrollRecord[] }>(
        `${apiUrl}/api/payroll/generate`,
        { month },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setRecords((current) => [...response.data.records, ...current])
      onNotify(response.data.message)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) {
          onUnauthorized()
          return
        }
        setError(requestError.response?.data?.message ?? 'Could not generate payroll.')
      } else {
        setError('Could not generate payroll. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const markPaid = async (record: PayrollRecord) => {
    setIsSubmitting(true)
    setError('')
    try {
      const response = await axios.patch<PayrollRecord>(
        `${apiUrl}/api/payroll/${record._id}/pay`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setRecords((current) => current.map((item) => item._id === record._id ? response.data : item))
      onNotify(`${record.employeeName}’s ${monthLabel(record.month)} payroll was marked paid.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) {
          onUnauthorized()
          return
        }
        setError(requestError.response?.data?.message ?? 'Could not update the payroll status.')
      } else {
        setError('Could not update the payroll status. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadSlip = (record: PayrollRecord) => {
    try {
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text('Salary statement', 20, 20)
      doc.setFontSize(11)
      doc.text(`Pay period: ${monthLabel(record.month)}`, 20, 32)
      doc.text(`Employee: ${record.employeeName}`, 20, 44)
      doc.text(`Email: ${record.employeeEmail}`, 20, 54)
      doc.text(`Department: ${record.department || '—'}`, 20, 64)
      doc.text(`Gross salary: ${currency.format(record.grossSalary)}`, 20, 80)
      doc.text(`Basic: ${currency.format(record.basic)}`, 20, 92)
      doc.text(`HRA: ${currency.format(record.hra)}`, 20, 102)
      if (record.bonus) doc.text(`Bonus: ${currency.format(record.bonus)}`, 20, 112)
      const deductions = record.pf + record.tax + record.deduction
      doc.text(`Total deductions: ${currency.format(deductions)}`, 20, 126)
      doc.text(`Provident fund: ${currency.format(record.pf)}`, 20, 138)
      doc.text(`Tax: ${currency.format(record.tax)}`, 20, 148)
      if (record.deduction) doc.text(`Other deductions: ${currency.format(record.deduction)}`, 20, 158)
      doc.setFontSize(13)
      doc.text(`Net pay: ${currency.format(record.net)}`, 20, 176)
      doc.setFontSize(10)
      doc.text(`Payment status: ${record.status}`, 20, 188)
      doc.save(`${record.month}-${record.employeeName.replace(/[^a-z0-9-]/gi, '-')}-payslip.pdf`)
      logAudit('PAYSLIP', `Downloaded ${record.month} payslip for ${record.employeeName}`)
      onNotify(`Payslip for ${monthLabel(record.month)} downloaded successfully.`)
    } catch (generationError) {
      console.error('Could not create payslip PDF:', generationError)
      onNotify('Could not create the payslip PDF. Please try again.', 'error')
    }
  }

  const downloadEmployeePayslip = (payslip: EmployeePayslip) => {
    if (!employee) {
      onNotify('Your employee profile is not available. Please contact HR.', 'error')
      return
    }

    try {
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text('Payslip', 20, 22)
      doc.setFontSize(11)
      let y = 38
      const details = [
        `Company: Northstar Workplace`,
        `Employee name: ${employee.name}`,
        `Work email: ${employee.email}`,
        `Department: ${employee.department || '—'}`,
        `Job title: ${employee.designation || '—'}`,
        `Monthly gross salary: ${currency.format(payslip.grossSalary)}`,
        `Annual salary: ${currency.format(payslip.grossSalary * 12)}`,
        `Pay period: ${monthLabel(payslip.month)}`,
        `Gross pay: ${currency.format(payslip.grossSalary)}`,
        `Deductions: ${currency.format(payslip.pf + payslip.tax)}`,
        `PF (12%): ${currency.format(payslip.pf)}`,
        `Tax (5%): ${currency.format(payslip.tax)}`,
        `Net pay: ${currency.format(payslip.net)}`,
      ]
      for (const detail of details) {
        const lines = doc.splitTextToSize(detail, 170)
        doc.text(lines, 20, y)
        y += lines.length * 6 + 4
      }
      const safeName = employee.name.trim().replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '') || 'Employee'
      const safeMonth = monthLabel(payslip.month).replace(/[^a-z0-9-]+/gi, '-').replace(/^-|-$/g, '')
      doc.save(`Payslip_${safeName}_${safeMonth}.pdf`)
      logAudit('PAYSLIP', `Downloaded ${payslip.month} demo payslip for ${employee.name}`)
      onNotify(`Payslip for ${monthLabel(payslip.month)} downloaded successfully.`)
    } catch (generationError) {
      console.error('Could not create payslip PDF:', generationError)
      onNotify('Could not create the payslip PDF. Please try again.', 'error')
    }
  }

  const downloadAnnualTaxSummary = () => {
    const [startYear, endYear] = taxYear.split('-').map(Number)
    const yearRecords = records.filter((record) => {
      const [year, monthNumber] = record.month.split('-').map(Number)
      return (year === startYear && monthNumber >= 4) || (year === endYear && monthNumber <= 3)
    })
    if (!yearRecords.length) {
      onNotify(`No payroll records are available for financial year ${taxYear}.`, 'error')
      return
    }

    try {
      const totals = yearRecords.reduce((sum, record) => ({
        gross: sum.gross + record.grossSalary,
        tax: sum.tax + record.tax,
        providentFund: sum.providentFund + record.pf,
        net: sum.net + record.net,
      }), { gross: 0, tax: 0, providentFund: 0, net: 0 })
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.text('Annual payroll tax summary', 20, 22)
      doc.setFontSize(11)
      doc.text(`Financial year: ${taxYear}`, 20, 36)
      doc.text(`Employee: ${yearRecords[0].employeeName}`, 20, 48)
      doc.text(`Email: ${yearRecords[0].employeeEmail}`, 20, 58)
      doc.text(`Payroll periods recorded: ${yearRecords.length}`, 20, 70)
      doc.text(`Gross pay recorded: ${currency.format(totals.gross)}`, 20, 86)
      doc.text(`Tax withheld recorded: ${currency.format(totals.tax)}`, 20, 98)
      doc.text(`Provident fund recorded: ${currency.format(totals.providentFund)}`, 20, 110)
      doc.text(`Net pay recorded: ${currency.format(totals.net)}`, 20, 122)
      doc.setFontSize(9)
      doc.text(doc.splitTextToSize(
        'This summary reflects payroll records available in this system. It is not a statutory Form 16 or a substitute for an employer-issued tax certificate.',
        170,
      ), 20, 145)
      doc.save(`annual-payroll-tax-summary-${taxYear}.pdf`)
      logAudit('TAX SUMMARY', `Downloaded annual tax summary for ${taxYear}`)
      onNotify(`Annual tax summary for ${taxYear} downloaded.`)
    } catch (generationError) {
      console.error('Could not generate annual tax summary:', generationError)
      onNotify('Could not create the annual tax summary PDF. Please try again.', 'error')
    }
  }

  const exportPayrollReport = () => {
    if (!records.length) {
      onNotify('There are no payroll records to export.', 'error')
      return
    }
    try {
      const doc = new jsPDF({ orientation: 'landscape' })
      const totals = records.reduce((sum, record) => ({
        gross: sum.gross + record.grossSalary,
        tax: sum.tax + record.tax,
        net: sum.net + record.net,
      }), { gross: 0, tax: 0, net: 0 })
      doc.setFontSize(16)
      doc.text('Payroll register report', 14, 18)
      doc.setFontSize(9)
      doc.text(`Generated ${new Date().toLocaleString()} · ${records.length} payroll record(s)`, 14, 25)
      doc.text(`Gross total: ${currency.format(totals.gross)} · Tax withheld: ${currency.format(totals.tax)} · Net payable: ${currency.format(totals.net)}`, 14, 32)
      let y = 43
      doc.setFont('helvetica', 'bold')
      doc.text('Period', 14, y)
      doc.text('Employee', 45, y)
      doc.text('Email', 112, y)
      doc.text('Gross', 190, y)
      doc.text('Tax', 225, y)
      doc.text('Net', 255, y)
      doc.text('Status', 278, y)
      doc.setFont('helvetica', 'normal')
      y += 7
      for (const record of records) {
        if (y > 190) {
          doc.addPage()
          y = 18
        }
        doc.text(record.month, 14, y)
        doc.text(doc.splitTextToSize(record.employeeName, 62)[0] ?? '', 45, y)
        doc.text(doc.splitTextToSize(record.employeeEmail, 72)[0] ?? '', 112, y)
        doc.text(currency.format(record.grossSalary), 190, y)
        doc.text(currency.format(record.tax), 225, y)
        doc.text(currency.format(record.net), 255, y)
        doc.text(record.status, 278, y)
        y += 6
      }
      doc.save('payroll-register-report.pdf')
      logAudit('PAYROLL REPORT', `Exported a payroll report with ${records.length} records`)
      onNotify('Payroll report PDF exported successfully.')
    } catch (generationError) {
      console.error('Could not export payroll report:', generationError)
      onNotify('Could not export the payroll report. Please try again.', 'error')
    }
  }

  return (
    <div className="payroll-workspace">
      {!employeeSelfService && (
        <form className="payroll-run-form" onSubmit={generatePayroll}>
          <label>
            <span>Pay period</span>
            <input type="month" value={month} onInput={(event) => setMonth(event.currentTarget.value)} required />
          </label>
          <button className="primary-button" type="submit" disabled={isSubmitting}>Generate monthly payroll</button>
          <button className="secondary-button" type="button" disabled={!records.length} onClick={exportPayrollReport}>Export payroll report PDF</button>
          <p>Creates a pay snapshot for employees who don’t already have a run for this month.</p>
        </form>
      )}
      {employeeSelfService && (
        <section className="tax-summary-panel">
          <div>
            <strong>Annual tax summary</strong>
            <p>Download a summary of recorded gross pay and withholding for your financial year. This is not an official Form 16.</p>
          </div>
          <label>
            <span>Financial year</span>
            <select value={taxYear} onChange={(event) => setTaxYear(event.currentTarget.value)}>
              {availableTaxYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <button className="secondary-button" type="button" onClick={downloadAnnualTaxSummary} disabled={!records.length}>Download tax summary</button>
        </section>
      )}
      {employeeSelfService && (
        <section className="employee-payslips">
          <div className="employee-payslips-heading">
            <div>
              <h3>Recent payslips</h3>
              <p>Monthly estimates use demo deductions of 12% for PF and 5% for tax.</p>
            </div>
          </div>
        </section>
      )}
      {error && <div className="notice-error" role="alert"><span>{error}</span><button onClick={() => void loadPayroll()}>Try again</button></div>}
      {loading ? (
        <div className="loading-state" role="status"><span className="loading-indicator" />Loading payroll records…</div>
      ) : (
        <div className="table-wrap">
          <table className={employeeSelfService ? 'employee-payslip-table' : undefined}>
            <thead>
              <tr>
                {!employeeSelfService && <th>Employee</th>}
                <th>Pay period</th>
                <th>Gross</th>
                <th>PF</th>
                <th>Tax</th>
                <th>Net payable</th>
                {!employeeSelfService && <th>Status</th>}
                {employeeSelfService ? <th>Download</th> : <th>Statement</th>}
              </tr>
            </thead>
            <tbody>
              {employeeSelfService ? employeePayslips.map((payslip) => (
                <tr key={payslip.month}>
                  <td>{monthLabel(payslip.month)}</td>
                  <td>{currency.format(payslip.grossSalary)}</td>
                  <td>{currency.format(payslip.pf)}</td>
                  <td>{currency.format(payslip.tax)}</td>
                  <td><strong>{currency.format(payslip.net)}</strong></td>
                  <td className="payroll-actions">
                    <button className="table-action payslip-download-button" type="button" aria-label={`Download ${monthLabel(payslip.month)} payslip as PDF`} onClick={() => downloadEmployeePayslip(payslip)}>PDF</button>
                  </td>
                </tr>
              )) : records.map((record) => (
                <tr key={record._id}>
                  {!employeeSelfService && <td>{record.employeeName}<small className="leave-email">{record.department} · {record.employeeEmail}</small></td>}
                  <td>{monthLabel(record.month)}</td>
                  <td>{currency.format(record.grossSalary)}</td>
                  <td>{currency.format(record.pf)}</td>
                  <td>{currency.format(record.tax)}</td>
                  <td><strong>{currency.format(record.net)}</strong></td>
                  <td><span className={`leave-status ${record.status === 'Paid' ? 'status-approved' : ''}`}>{record.status}</span></td>
                  <td className="payroll-actions">
                    <button className="table-action" onClick={() => downloadSlip(record)}>Download PDF</button>
                    {!employeeSelfService && record.status === 'Pending' && (
                      <button className="table-action" disabled={isSubmitting} onClick={() => void markPaid(record)}>Mark paid</button>
                    )}
                  </td>
                </tr>
              ))}
              {employeeSelfService && !employeePayslips.length && <tr><td colSpan={6} className="table-empty">Your employee profile is not available yet.</td></tr>}
              {!employeeSelfService && !records.length && <tr><td colSpan={8} className="table-empty">No payroll runs yet. Select a pay period above to generate one.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
