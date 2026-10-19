import { useEffect, useMemo, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from './api'
import { logAudit } from './audit'

type Employee = {
  _id: string
  name: string
  email: string
  department?: string
}

type AttendanceRecord = {
  _id: string
  employee: Employee
  date: string
  checkIn?: string
  checkOut?: string
  status: 'present' | 'absent' | 'late'
}

type AttendanceProps = {
  employees: Employee[]
  token: string
  employeeSelfService: boolean
  onNotify: (message: string) => void
  onUnauthorized: () => void
}

const formatTime = (value?: string) => value
  ? new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  : '—'

export default function Attendance({
  employees,
  token,
  employeeSelfService,
  onNotify,
  onUnauthorized,
}: AttendanceProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadAttendance = async () => {
    try {
      const response = await axios.get<AttendanceRecord[]>(`${apiUrl}/api/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setRecords(response.data)
      setError('')
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load today’s attendance. Please try again.')
    }
  }

  useEffect(() => {
    void loadAttendance()
  }, [token])

  const attendanceByEmail = useMemo(
    () => new Map(records.map((record) => [record.employee.email.toLowerCase(), record])),
    [records],
  )
  const presentCount = records.filter((record) => record.status === 'present' || record.status === 'late').length
  const employeeRecord = employees[0]
    ? attendanceByEmail.get(employees[0].email.toLowerCase())
    : undefined

  const updateAttendance = async (employee: Employee, status: 'present' | 'absent') => {
    setIsSubmitting(true)
    setError('')
    try {
      const response = await axios.put<AttendanceRecord>(
        `${apiUrl}/api/attendance/${employee._id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setRecords((current) => [
        ...current.filter((record) => record.employee.email.toLowerCase() !== employee.email.toLowerCase()),
        { ...response.data, employee },
      ])
      logAudit('ATTENDANCE', `Marked ${employee.name} ${status}`)
      onNotify(`Attendance marked ${status} for ${employee.name}.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) {
          onUnauthorized()
          return
        }
        setError(requestError.response?.data?.message ?? 'Could not update attendance.')
      } else {
        setError('Could not update attendance. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const recordTime = async (action: 'checkin' | 'checkout') => {
    setIsSubmitting(true)
    setError('')
    try {
      const response = await axios.post<AttendanceRecord>(
        `${apiUrl}/api/attendance/${action}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const employee = employees[0]
      setRecords((current) => [
        ...current.filter((record) => record.employee.email.toLowerCase() !== employee.email.toLowerCase()),
        { ...response.data, employee },
      ])
      logAudit('ATTENDANCE', action === 'checkin' ? 'Checked in for work' : 'Checked out from work')
      onNotify(action === 'checkin' ? 'You are checked in for today.' : 'You are checked out for today.')
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) {
          onUnauthorized()
          return
        }
        setError(requestError.response?.data?.message ?? `Could not ${action === 'checkin' ? 'check in' : 'check out'}.`)
      } else {
        setError(`Could not ${action === 'checkin' ? 'check in' : 'check out'}. Please try again.`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="attendance-workspace">
      <div className="attendance-summary">
        <div><span className="eyebrow">TODAY’S ATTENDANCE</span><h2>{employeeSelfService ? 'Your workday' : 'Team attendance'}</h2></div>
        {!employeeSelfService && <span className="attendance-count">{presentCount}<small> / {employees.length} present</small></span>}
      </div>
      {employeeSelfService && employees[0] && (
        <section className="checkin-card">
          <div>
            <strong>{employeeRecord?.checkOut ? 'Workday complete' : employeeRecord?.checkIn ? 'You’re checked in' : 'Ready to start your day?'}</strong>
            <p>
              {employeeRecord?.checkIn
                ? `Checked in at ${formatTime(employeeRecord.checkIn)}${employeeRecord.checkOut ? ` · Checked out at ${formatTime(employeeRecord.checkOut)}` : ''}`
                : 'Record your attendance when you start work.'}
            </p>
          </div>
          {!employeeRecord?.checkIn ? (
            <button className="primary-button" disabled={isSubmitting} onClick={() => void recordTime('checkin')}>Check in</button>
          ) : !employeeRecord.checkOut ? (
            <button className="secondary-button" disabled={isSubmitting} onClick={() => void recordTime('checkout')}>Check out</button>
          ) : <span className="leave-status status-approved">Completed</span>}
        </section>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!employeeSelfService && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Status</th><th>Check in</th><th>Check out</th><th>Update</th></tr></thead>
            <tbody>
              {employees.map((employee) => {
                const record = attendanceByEmail.get(employee.email.toLowerCase())
                return (
                  <tr key={employee._id}>
                    <td>{employee.name}<small className="leave-email">{employee.department || 'Unassigned'} · {employee.email}</small></td>
                    <td><span className={`attendance-status attendance-${record?.status ?? 'unrecorded'}`}>{record?.status ?? 'Not recorded'}</span></td>
                    <td>{formatTime(record?.checkIn)}</td>
                    <td>{formatTime(record?.checkOut)}</td>
                    <td className="leave-actions">
                      <button className="table-action" disabled={isSubmitting} onClick={() => void updateAttendance(employee, 'present')}>Present</button>
                      <button className="table-action danger-action" disabled={isSubmitting} onClick={() => void updateAttendance(employee, 'absent')}>Absent</button>
                    </td>
                  </tr>
                )
              })}
              {!employees.length && <tr><td colSpan={5} className="table-empty">No employee records are available.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
