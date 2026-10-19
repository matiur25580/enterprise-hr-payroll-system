import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'
import type { Role } from '../utils/role'

type Ticket = {
  _id: string
  employeeName: string
  employeeEmail: string
  subject: string
  description: string
  category: 'Payroll' | 'Benefits' | 'Access' | 'Workplace' | 'Other'
  status: 'Open' | 'In Progress' | 'Resolved'
  resolution?: string
  createdAt: string
}

type Props = {
  token: string
  role: Role
  onNotify: (message: string) => void
  onUnauthorized: () => void
}

export default function Support({ token, role, onNotify, onUnauthorized }: Props) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [resolutions, setResolutions] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ subject: '', category: 'Other' as Ticket['category'], description: '' })
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const isEmployee = role === 'Employee'

  const load = async () => {
    try {
      const response = await axios.get<Ticket[]>(`${apiUrl}/api/support`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTickets(response.data)
      setError('')
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load support requests. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [token])

  const submit = async (event: Event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const response = await axios.post<Ticket>(`${apiUrl}/api/support`, form, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTickets((current) => [response.data, ...current])
      setForm({ subject: '', category: 'Other', description: '' })
      onNotify('Your support request has been submitted.')
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not submit your support request.')
      } else {
        setError('Could not submit your support request. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateStatus = async (ticket: Ticket, status: Ticket['status']) => {
    try {
      const response = await axios.patch<Ticket>(`${apiUrl}/api/support/${ticket._id}`, {
        status,
        resolution: resolutions[ticket._id] ?? ticket.resolution ?? '',
      }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTickets((current) => current.map((item) => item._id === ticket._id ? response.data : item))
      onNotify(`Support request marked ${status.toLowerCase()}.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not update support request.')
      } else {
        setError('Could not update support request. Please try again.')
      }
    }
  }

  return (
    <div className="support-workspace">
      {isEmployee && (
        <form className="support-form" onSubmit={submit}>
          <h2>Raise a support request</h2>
          <label>Subject<input value={form.subject} maxLength={120} minLength={5} onInput={(event) => setForm({ ...form, subject: event.currentTarget.value })} required /></label>
          <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.currentTarget.value as Ticket['category'] })}><option>Payroll</option><option>Benefits</option><option>Access</option><option>Workplace</option><option>Other</option></select></label>
          <label>Description<textarea value={form.description} maxLength={2000} minLength={10} onInput={(event) => setForm({ ...form, description: event.currentTarget.value })} required /></label>
          <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Submit request'}</button>
        </form>
      )}
      <section className="support-ticket-list">
        <div className="panel-heading"><div><span className="eyebrow">{isEmployee ? 'YOUR REQUESTS' : 'PEOPLE OPERATIONS'}</span><h2>{isEmployee ? 'My support requests' : 'Employee support queue'}</h2></div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading support requests…</div>
          : tickets.length ? tickets.map((ticket) => (
            <article className="support-ticket" key={ticket._id}>
              <div className="support-ticket-heading"><div><span className={`leave-status status-${ticket.status.toLowerCase().replace(' ', '-')}`}>{ticket.status}</span><h3>{ticket.subject}</h3></div><small>{new Date(ticket.createdAt).toLocaleDateString()}</small></div>
              {!isEmployee && <p className="support-requester">{ticket.employeeName} · {ticket.employeeEmail} · {ticket.category}</p>}
              <p>{ticket.description}</p>
              {ticket.resolution && <p className="support-resolution"><strong>Resolution:</strong> {ticket.resolution}</p>}
              {!isEmployee && (
                <>
                  <label className="ticket-resolution">Resolution notes<textarea maxLength={2000} value={resolutions[ticket._id] ?? ticket.resolution ?? ''} onInput={(event) => setResolutions((current) => ({ ...current, [ticket._id]: event.currentTarget.value }))} /></label>
                  <label className="ticket-status-control">Update status<select value={ticket.status} onChange={(event) => void updateStatus(ticket, event.currentTarget.value as Ticket['status'])}><option>Open</option><option>In Progress</option><option>Resolved</option></select></label>
                </>
              )}
            </article>
          )) : <p className="table-empty">{isEmployee ? 'You have not raised a support request.' : 'There are no employee support requests.'}</p>}
      </section>
    </div>
  )
}
