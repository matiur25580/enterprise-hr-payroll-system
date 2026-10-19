import { useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from './api'

type EmployeeRow = {
  name: string
  email: string
  department: string
  designation: string
  salary: string
}

type ImportResult = {
  message: string
  created: Array<{ employeeId: string; email: string }>
  rejected: Array<{ row: number; reason: string }>
}

const requiredColumns = ['name', 'email', 'department', 'designation', 'salary']

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        cell += character
      }
    } else if (character === '"' && cell.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(cell)
      cell = ''
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''))
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += character
    }
  }

  if (quoted) throw new Error('The CSV file contains an unclosed quoted field.')
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''))
    rows.push(row)
  }
  return rows.filter((cells) => cells.some((value) => value.trim()))
}

export default function BulkEmployeeImport({
  token,
  onImported,
  onNotify,
  onUnauthorized,
}: {
  token: string
  onImported: () => void
  onNotify: (message: string) => void
  onUnauthorized: () => void
}) {
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const readCsv = async (file?: File) => {
    setRows([])
    setResult(null)
    setError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') || file.size > 2 * 1024 * 1024) {
      setError('Choose a CSV file no larger than 2 MB.')
      return
    }
    try {
      const parsed = parseCsv((await file.text()).replace(/^\uFEFF/, ''))
      const headers = parsed[0]?.map((value) => value.trim().toLowerCase()) ?? []
      const indexes = requiredColumns.map((column) => headers.indexOf(column))
      if (indexes.some((index) => index < 0)) {
        setError('CSV columns must include name, email, department, designation and salary.')
        return
      }
      if (parsed.length < 2) {
        setError('The CSV file has no employee rows.')
        return
      }
      if (parsed.length > 201) {
        setError('Import no more than 200 employee rows at a time.')
        return
      }
      if (parsed.slice(1).some((cells) => cells.length !== headers.length)) {
        setError('Every CSV row must contain the same number of columns as the header.')
        return
      }
      const employeeRows = parsed.slice(1).map((cells) => ({
        name: cells[indexes[0]].trim(),
        email: cells[indexes[1]].trim(),
        department: cells[indexes[2]].trim(),
        designation: cells[indexes[3]].trim(),
        salary: cells[indexes[4]].trim(),
      }))
      setRows(employeeRows)
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Could not read the CSV file.')
    }
  }

  const importRows = async (event: Event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await axios.post<ImportResult>(`${apiUrl}/api/employees/bulk`, { employees: rows }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setResult(response.data)
      if (response.data.created.length) onImported()
      onNotify(response.data.message)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not import employee records.')
      } else {
        setError('Could not import employee records. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="panel bulk-import-panel">
      <div className="panel-heading"><div><span className="eyebrow">WORKFORCE OPERATIONS</span><h2>Bulk employee import</h2></div></div>
      <p className="muted-copy">Upload CSV columns: name, email, department, designation, salary. Up to 200 rows per import.</p>
      <label className="csv-file-label">Choose CSV file<input type="file" accept=".csv,text/csv" onChange={(event) => void readCsv(event.currentTarget.files?.[0])} /></label>
      {rows.length > 0 && <p className="muted-copy" role="status">{rows.length} employee row(s) ready to import.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {rows.length > 0 && <button className="primary-button" type="button" disabled={isSubmitting} onClick={(event) => void importRows(event)}>{isSubmitting ? 'Importing…' : `Import ${rows.length} row(s)`}</button>}
      {result && result.rejected.length > 0 && <div className="import-rejections" role="status"><strong>Rows requiring attention</strong><ul>{result.rejected.map((item) => <li key={item.row}>CSV row {item.row + 1}: {item.reason}</li>)}</ul></div>}
    </section>
  )
}
