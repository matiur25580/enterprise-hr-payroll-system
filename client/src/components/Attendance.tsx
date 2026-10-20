import { useEffect, useMemo, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'

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

type CalendarRecord = { date: string; status: AttendanceRecord['status'] }

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
  const [loading, setLoading] = useState(true)
  const [calendarRecords, setCalendarRecords] = useState<CalendarRecord[]>([])
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [calendarLoading, setCalendarLoading] = useState(true)
  const [calendarError, setCalendarError] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadAttendance = async (month: string) => {
    try {
      const response = await axios.get<AttendanceRecord[]>(`${apiUrl}/api/attendance`, {
        params: employeeSelfService ? undefined : { month },
        headers: { Authorization: `Bearer ${token}` },
      })
      setRecords(response.data)
      setError('')
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load attendance. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadCalendar = async (month: string) => {
    const [year, monthNumber] = month.split('-').map(Number)
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
    const from = `${month}-01`
    const to = `${month}-${String(lastDay).padStart(2, '0')}`
    setCalendarLoading(true)
    try {
      const response = await axios.get<CalendarRecord[]>(`${apiUrl}/api/attendance/calendar`, {
        params: { from, to },
        headers: { Authorization: `Bearer ${token}` },
      })
      setCalendarRecords(response.data)
      setCalendarError('')
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setCalendarError('Could not load your monthly attendance. Please try again.')
    } finally {
      setCalendarLoading(false)
    }
  }

  useEffect(() => {
    void loadAttendance(calendarMonth)
    if (employeeSelfService && employees.length) void loadCalendar(calendarMonth)
  }, [token, employeeSelfService, employees.length, calendarMonth])

  const attendanceByEmail = useMemo(
    () => new Map(records.map((record) => [record.employee.email.toLowerCase(), record])),
    [records],
  )
  const presentCount = records.filter((record) => record.status === 'present' || record.status === 'late').length
  const employeeRecord = employees[0]
    ? attendanceByEmail.get(employees[0].email.toLowerCase())
    : undefined
  const [calendarYear, calendarMonthNumber] = calendarMonth.split('-').map(Number)
  const calendarDays = new Date(Date.UTC(calendarYear, calendarMonthNumber, 0)).getUTCDate()
  const calendarOffset = new Date(Date.UTC(calendarYear, calendarMonthNumber - 1, 1)).getUTCDay()
  const calendarByDate = new Map(calendarRecords.map((record) => [record.date, record.status]))

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
        ...current.filter((record) => record._id !== response.data._id),
        { ...response.data, employee },
      ])
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
        <div><span className="eyebrow">TODAY’S ATTENDANCE</span><h2>{employeeSelfService ? 'Your workday' : 'Attendance review'}</h2></div>
        {!employeeSelfService && <span className="attendance-count">{presentCount}<small> present this month</small></span>}
      </div>
      {employeeSelfService && employees[0] && (
        <section className="checkin-card">
          <div>
            <strong>{loading ? 'Loading your attendance…' : employeeRecord?.checkOut ? 'Workday complete' : employeeRecord?.checkIn ? 'You’re checked in' : 'Ready to start your day?'}</strong>
            <p>
              {employeeRecord?.checkIn
                ? `Checked in at ${formatTime(employeeRecord.checkIn)}${employeeRecord.checkOut ? ` · Checked out at ${formatTime(employeeRecord.checkOut)}` : ''}`
                : 'Record your attendance when you start work.'}
            </p>
          </div>
          {loading ? <span className="attendance-status">Loading…</span> : !employeeRecord?.checkIn ? (
            <button className="primary-button" disabled={isSubmitting} onClick={() => void recordTime('checkin')}>Check in</button>
          ) : !employeeRecord.checkOut ? (
            <button className="secondary-button" disabled={isSubmitting} onClick={() => void recordTime('checkout')}>Check out</button>
          ) : <span className="leave-status status-approved">Completed</span>}
        </section>
      )}
      {employeeSelfService && employees[0] && (
        <section className="attendance-calendar">
          <div className="attendance-calendar-heading">
            <h3>Attendance calendar</h3>
            <div>
              <button type="button" className="table-action" aria-label="Previous month" onClick={() => {
                const [year, month] = calendarMonth.split('-').map(Number)
                const previous = new Date(Date.UTC(year, month - 2, 1))
                setCalendarMonth(`${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, '0')}`)
              }}>‹</button>
              <strong>{new Date(Date.UTC(calendarYear, calendarMonthNumber - 1, 1)).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong>
              <button type="button" className="table-action" aria-label="Next month" onClick={() => {
                const [year, month] = calendarMonth.split('-').map(Number)
                const next = new Date(Date.UTC(year, month, 1))
                setCalendarMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`)
              }}>›</button>
            </div>
          </div>
          {calendarError && <p className="form-error" role="alert">{calendarError}</p>}
          {calendarLoading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading attendance calendar…</div> : (
            <div className="attendance-calendar-grid" aria-label="Monthly attendance">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <strong key={day}>{day}</strong>)}
              {Array.from({ length: calendarOffset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}
              {Array.from({ length: calendarDays }, (_, index) => {
                const day = index + 1
                const key = `${calendarMonth}-${String(day).padStart(2, '0')}`
                const status = calendarByDate.get(key)
                return <span key={key} className={`calendar-day ${status ? `calendar-${status}` : ''}`} aria-label={`${key}: ${status ?? 'not recorded'}`}><b>{day}</b>{status && <small>{status}</small>}</span>
              })}
            </div>
          )}
        </section>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {!employeeSelfService && (
        <div className="attendance-month-filter">
          <label htmlFor="attendance-month">Attendance month</label>
          <input id="attendance-month" type="month" value={calendarMonth} onInput={(event) => setCalendarMonth(event.currentTarget.value)} />
        </div>
      )}
      {!employeeSelfService && (loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading attendance…</div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Employee</th><th>Date</th><th>Status</th><th>Check in</th><th>Check out</th><th>Update</th></tr></thead>
            <tbody>
              {records.map((record) => {
                const employee = record.employee
                return (
                  <tr key={record._id}>
                    <td>{employee.name}<small className="leave-email">{employee.department || 'Unassigned'} · {employee.email}</small></td>
                    <td>{new Date(`${record.date}T00:00:00`).toLocaleDateString()}</td>
                    <td><span className={`attendance-status attendance-${record.status}`}>{record.status}</span></td>
                    <td>{formatTime(record.checkIn)}</td>
                    <td>{formatTime(record.checkOut)}</td>
                    <td className="leave-actions">
                      {record.date === new Date().toISOString().slice(0, 10) ? <>
                        <button className="table-action" disabled={isSubmitting} onClick={() => void updateAttendance(employee, 'present')}>Present</button>
                        <button className="table-action danger-action" disabled={isSubmitting} onClick={() => void updateAttendance(employee, 'absent')}>Absent</button>
                      </> : '—'}
                    </td>
                  </tr>
                )
              })}
              {!records.length && <tr><td colSpan={6} className="table-empty">No attendance records for this month.</td></tr>}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
