import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'

type LeaveRequest = {
  _id: string
  employeeName: string
  employeeEmail: string
  date: string
  reason: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

type LeaveProps = {
  token: string
  employeeSelfService: boolean
  onNotify: (message: string) => void
  onUnauthorized: () => void
}

export default function Leave({ token, employeeSelfService, onNotify, onUnauthorized }: LeaveProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [form, setForm] = useState({ date: '', reason: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reviewingId, setReviewingId] = useState('')

  const loadRequests = async () => {
    try {
      const response = await axios.get<LeaveRequest[]>(`${apiUrl}/api/leaves`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setLeaves(response.data)
      setError('')
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load leave requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRequests()
  }, [token])

  const applyLeave = async (event: Event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const response = await axios.post<LeaveRequest>(
        `${apiUrl}/api/leaves`,
        form,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setLeaves((current) => [response.data, ...current])
      setForm({ date: '', reason: '' })
      onNotify('Leave request submitted successfully.')
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) {
          onUnauthorized()
          return
        }
        setError(requestError.response?.data?.message ?? 'Could not submit the leave request.')
      } else {
        setError('Could not submit the leave request. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const reviewLeave = async (request: LeaveRequest, status: 'Approved' | 'Rejected') => {
    setError('')
    setReviewingId(request._id)
    try {
      const response = await axios.patch<LeaveRequest>(
        `${apiUrl}/api/leaves/${request._id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setLeaves((current) => current.map((leave) => leave._id === request._id ? response.data : leave))
      onNotify(`Leave request ${status.toLowerCase()} successfully.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) {
          onUnauthorized()
          return
        }
        setError(requestError.response?.data?.message ?? `Could not ${status.toLowerCase()} the leave request.`)
      } else {
        setError(`Could not ${status.toLowerCase()} the leave request. Please try again.`)
      }
    } finally {
      setReviewingId('')
    }
  }

  return (
    <div className="leave-workspace">
      <h2>{employeeSelfService ? 'Request time off' : 'Review leave requests'}</h2>
      {employeeSelfService && (
        <form className="leave-form" onSubmit={applyLeave}>
          <label>
            <span>Leave date</span>
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={form.date}
              onInput={(event) => setForm({ ...form, date: event.currentTarget.value })}
              required
            />
          </label>
          <label className="leave-reason-field">
            <span>Reason</span>
            <textarea
              placeholder="Briefly share the reason for your request"
              value={form.reason}
              onInput={(event) => setForm({ ...form, reason: event.currentTarget.value })}
              minLength={10}
              maxLength={500}
              required
            />
          </label>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading leave requests…</div> : <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {!employeeSelfService && <th>Employee</th>}
              <th>Leave date</th>
              <th>Reason</th>
              <th>Status</th>
              {!employeeSelfService && <th>Review</th>}
            </tr>
          </thead>
          <tbody>
            {leaves.map((leave) => (
              <tr key={leave._id}>
                {!employeeSelfService && <td>{leave.employeeName}<small className="leave-email">{leave.employeeEmail}</small></td>}
                <td>{new Date(leave.date).toLocaleDateString()}</td>
                <td>{leave.reason}</td>
                <td><span className={`leave-status status-${leave.status.toLowerCase()}`}>{leave.status}</span></td>
                {!employeeSelfService && (
                  <td className="leave-actions">
                    {leave.status === 'Pending' ? (
                      <>
                        <button className="table-action" disabled={reviewingId === leave._id} onClick={() => void reviewLeave(leave, 'Approved')}>Approve</button>
                        <button className="table-action danger-action" disabled={reviewingId === leave._id} onClick={() => void reviewLeave(leave, 'Rejected')}>Reject</button>
                      </>
                    ) : 'Reviewed'}
                  </td>
                )}
              </tr>
            ))}
            {!leaves.length && <tr><td colSpan={employeeSelfService ? 3 : 5} className="table-empty">No leave requests yet.</td></tr>}
          </tbody>
        </table>
      </div>}
    </div>
  )
}
