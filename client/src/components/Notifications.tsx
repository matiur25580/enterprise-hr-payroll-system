import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'
import type { Role } from '../utils/role'

type Notification = {
  _id: string
  actorEmail: string
  actorRole: string
  category: string
  message: string
  createdAt: string
  readBy: string[]
}

export default function Notifications({
  token,
  email,
  role,
  onUnauthorized,
}: {
  token: string
  email: string
  role: Role
  onUnauthorized: () => void
}) {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  useEffect(() => {
    let active = true
    axios.get<Notification[]>(`${apiUrl}/api/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      if (active) setItems(response.data)
    }).catch((requestError) => {
      if (!active) return
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load your notifications. Please try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token])

  const markRead = async (item: Notification) => {
    setUpdatingId(item._id)
    setError('')
    try {
      const response = await axios.patch<Notification>(
        `${apiUrl}/api/activity/${item._id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setItems((current) => current.map((currentItem) => currentItem._id === item._id ? response.data : currentItem))
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not update notification status.')
      } else {
        setError('Could not update notification status. Please try again.')
      }
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <section className="panel notifications-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">WORKPLACE UPDATES</span><h2>Notifications inbox</h2></div>
        <span className="count-pill">{items.filter((item) => !item.readBy?.includes(email.toLowerCase())).length} unread</span>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading notifications…</div>
        : items.length ? (
          <ul className="notification-list">
            {items.map((item) => {
              const read = item.readBy?.includes(email.toLowerCase()) ?? false
              return (
                <li key={item._id} className={read ? 'notification-read' : 'notification-unread'}>
                  <span className="notification-marker" aria-hidden="true">{read ? '✓' : '•'}</span>
                  <div className="notification-content">
                    <p>{item.message}</p>
                    <small>{role === 'Employee' ? `${item.actorRole.toUpperCase()} TEAM` : `${item.actorRole.toUpperCase()} · ${item.actorEmail}`}</small>
                    <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                  </div>
                  {!read && <button className="table-action" type="button" disabled={updatingId === item._id} onClick={() => void markRead(item)}>{updatingId === item._id ? 'Saving…' : 'Mark read'}</button>}
                </li>
              )
            })}
          </ul>
        ) : <p className="table-empty">You’re all caught up. New workplace updates will appear here.</p>}
    </section>
  )
}
