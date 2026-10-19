import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from './api'

type AuditEvent = {
  _id: string
  actorEmail: string
  actorRole: string
  action: string
  resource: string
  summary: string
  createdAt: string
}

export default function AuditLog({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    axios.get<AuditEvent[]>(`${apiUrl}/api/audit?limit=200`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      if (active) setEvents(response.data)
    }).catch((requestError) => {
      if (!active) return
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load the audit trail. Please try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token])

  return (
    <section className="audit-log">
      <div className="panel-heading"><div><span className="eyebrow">ADMINISTRATION</span><h2>Audit trail</h2></div></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading audit events…</div>
        : events.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Time</th><th>Actor</th><th>Role</th><th>Action</th><th>Resource</th><th>Details</th></tr></thead>
              <tbody>{events.map((event) => (
                <tr key={event._id}>
                  <td>{new Date(event.createdAt).toLocaleString()}</td>
                  <td>{event.actorEmail}</td>
                  <td>{event.actorRole}</td>
                  <td>{event.action}</td>
                  <td>{event.resource}</td>
                  <td>{event.summary}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="table-empty">No administrative events have been recorded yet.</p>}
    </section>
  )
}
