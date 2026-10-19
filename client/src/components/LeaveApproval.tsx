import { useState } from 'preact/hooks'

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected'
type LeaveRequest = {
  id: number
  employee: string
  type: string
  from: string
  to: string
  status: LeaveStatus
}

const initialRequests: LeaveRequest[] = [
  { id: 1, employee: 'Aarav Sharma', type: 'Annual leave', from: '2026-11-02', to: '2026-11-06', status: 'Pending' },
  { id: 2, employee: 'Maya Patel', type: 'Sick leave', from: '2026-10-21', to: '2026-10-22', status: 'Pending' },
  { id: 3, employee: 'Noah Williams', type: 'Personal leave', from: '2026-10-28', to: '2026-10-28', status: 'Approved' },
]

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function LeaveApproval() {
  const [requests, setRequests] = useState(initialRequests)

  const setStatus = (id: number, status: Exclude<LeaveStatus, 'Pending'>) => {
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request))
  }

  return (
    <section className="panel leave-approval-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">TIME OFF</span><h2>Leave approvals</h2></div>
        <span className="count-pill">{requests.filter((request) => request.status === 'Pending').length} pending</span>
      </div>
      <div className="table-wrap">
        <table className="data-table leave-approval-table">
          <thead><tr><th>Employee</th><th>Leave type</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td><strong>{request.employee}</strong></td>
                <td>{request.type}</td>
                <td>{formatDate(request.from)} – {formatDate(request.to)}</td>
                <td><span className={`leave-status status-${request.status.toLowerCase()}`}>{request.status}</span></td>
                <td className="row-actions">
                  {request.status === 'Pending' ? (
                    <>
                      <button className="table-action" type="button" onClick={() => setStatus(request.id, 'Approved')}>Approve</button>
                      <button className="table-action danger-action" type="button" onClick={() => setStatus(request.id, 'Rejected')}>Reject</button>
                    </>
                  ) : <span className="muted-copy">Reviewed</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="module-note">Sample requests for dashboard preview; actions are not saved to the leave service.</p>
    </section>
  )
}
