import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'

type LeaveRequest = {
  _id: string
  employeeName: string
  employeeEmail: string
  type: 'sick' | 'casual' | 'annual'
  from: string
  to: string
  fromDate?: string
  startDate?: string
  toDate?: string
  endDate?: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
}

type LeaveProps = {
  token: string
  employeeSelfService: boolean
  onNotify: (message: string) => void
  onUnauthorized: () => void
}

type LeaveForm = Pick<LeaveRequest, 'type' | 'from' | 'to' | 'reason'>

const today = () => new Date().toISOString().slice(0, 10)

export default function Leave({ token, employeeSelfService, onNotify, onUnauthorized }: LeaveProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [form, setForm] = useState<LeaveForm>({ type: 'annual', from: '', to: '', reason: '' })
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
      setForm({ type: 'annual', from: '', to: '', reason: '' })
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

  const reviewLeave = async (request: LeaveRequest, decision: 'approve' | 'reject') => {
    setError('')
    setReviewingId(request._id)
    try {
      const response = await axios.put<LeaveRequest>(
        `${apiUrl}/api/leaves/${request._id}/${decision}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setLeaves((current) => current.map((leave) => leave._id === request._id ? response.data : leave))
      onNotify(`Leave request ${decision === 'approve' ? 'approved' : 'rejected'} successfully.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) {
          onUnauthorized()
          return
        }
        setError(requestError.response?.data?.message ?? `Could not ${decision} the leave request.`)
      } else {
        setError(`Could not ${decision} the leave request. Please try again.`)
      }
    } finally {
      setReviewingId('')
    }
  }

  return (
    <div className="leave-workspace">
      <h2>{employeeSelfService ? 'Apply leave' : 'Leave requests'}</h2>
      {employeeSelfService && (
        <form className="leave-form" onSubmit={applyLeave}>
          <label>
            <span>Leave type</span>
            <select
              value={form.type}
              onChange={(event) => setForm({ ...form, type: event.currentTarget.value as LeaveForm['type'] })}
            >
              <option value="sick">Sick</option>
              <option value="casual">Casual</option>
              <option value="annual">Annual</option>
            </select>
          </label>
          <label>
            <span>From</span>
            <input
              type="date"
              min={today()}
              value={form.from}
              onInput={(event) => setForm({ ...form, from: event.currentTarget.value, to: form.to < event.currentTarget.value ? '' : form.to })}
              required
            />
          </label>
          <label>
            <span>To</span>
            <input
              type="date"
              min={form.from || today()}
              value={form.to}
              onInput={(event) => setForm({ ...form, to: event.currentTarget.value })}
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
            {isSubmitting ? 'Submitting…' : 'Apply leave'}
          </button>
        </form>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading leave requests…</div> : <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {!employeeSelfService && <th>Employee</th>}
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Reason</th>
              <th>Status</th>
              {!employeeSelfService && <th>Review</th>}
            </tr>
          </thead>
          <tbody>
            {leaves.map((leave) => (
              <tr key={leave._id}>
                {!employeeSelfService && <td>{leave.employeeName}<small className="leave-email">{leave.employeeEmail}</small></td>}
                <td className="capitalize">{leave.type}</td>
                <td>{(leave.from||leave.fromDate||leave.startDate||'').toString().slice(0,10)}</td>
                <td>{(leave.to||leave.toDate||leave.endDate||'').toString().slice(0,10)}</td>
                <td>{leave.reason}</td>
                <td><span className={`leave-status status-${leave.status}`}>{leave.status}</span></td>
                {!employeeSelfService && (
                  <td className="leave-actions">
                    {leave.status?.toLowerCase() === 'pending' ? (
                      <>
                        <button className="table-action" disabled={reviewingId === leave._id} onClick={() => void reviewLeave(leave, 'approve')}>Approve</button>
                        <button className="table-action danger-action" disabled={reviewingId === leave._id} onClick={() => void reviewLeave(leave, 'reject')}>Reject</button>
                      </>
                    ) : 'Reviewed'}
                  </td>
                )}
              </tr>
            ))}
            {!leaves.length && <tr><td colSpan={employeeSelfService ? 6 : 7} className="table-empty">No leave requests yet.</td></tr>}
          </tbody>
        </table>
      </div>}
    </div>
  )
}
