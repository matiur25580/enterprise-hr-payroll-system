import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from './api'
import type { Role } from './role'

type Announcement = {
  _id: string
  title: string
  body: string
  audience: 'all' | 'hr' | 'employee'
  createdAt: string
  expiresAt?: string
}

type Props = {
  token: string
  role: Role
  onNotify: (message: string) => void
  onUnauthorized: () => void
}

export default function Announcements({ token, role, onNotify, onUnauthorized }: Props) {
  const [items, setItems] = useState<Announcement[]>([])
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' as Announcement['audience'], expiresAt: '' })
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const response = await axios.get<Announcement[]>(`${apiUrl}/api/announcements`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems(response.data)
      setError('')
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load announcements. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [token])

  const publish = async (event: Event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')
    try {
      const response = await axios.post<Announcement>(`${apiUrl}/api/announcements`, {
        ...form,
        expiresAt: form.expiresAt || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setItems((current) => [response.data, ...current])
      setForm({ title: '', body: '', audience: 'all', expiresAt: '' })
      onNotify('Announcement published successfully.')
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not publish the announcement.')
      } else {
        setError('Could not publish the announcement. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const remove = async (announcement: Announcement) => {
    try {
      await axios.delete(`${apiUrl}/api/announcements/${announcement._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems((current) => current.filter((item) => item._id !== announcement._id))
      onNotify('Announcement removed.')
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not remove the announcement.')
      } else {
        setError('Could not remove the announcement. Please try again.')
      }
    }
  }

  return (
    <div className="announcements-workspace">
      {role === 'Admin' && (
        <form className="announcement-form" onSubmit={publish}>
          <h2>Publish an announcement</h2>
          <label>Title<input value={form.title} maxLength={120} minLength={4} onInput={(event) => setForm({ ...form, title: event.currentTarget.value })} required /></label>
          <label>Message<textarea value={form.body} maxLength={2000} minLength={10} onInput={(event) => setForm({ ...form, body: event.currentTarget.value })} required /></label>
          <div className="announcement-fields">
            <label>Audience<select value={form.audience} onChange={(event) => setForm({ ...form, audience: event.currentTarget.value as Announcement['audience'] })}><option value="all">Everyone</option><option value="hr">HR team</option><option value="employee">Employees</option></select></label>
            <label>Optional expiry<input type="date" min={new Date().toISOString().slice(0, 10)} value={form.expiresAt} onInput={(event) => setForm({ ...form, expiresAt: event.currentTarget.value })} /></label>
          </div>
          <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Publishing…' : 'Publish announcement'}</button>
        </form>
      )}
      <section className="announcement-list">
        <div className="panel-heading"><div><span className="eyebrow">COMPANY UPDATES</span><h2>Announcements</h2></div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading announcements…</div>
          : items.length ? items.map((item) => (
            <article className="announcement-card" key={item._id}>
              <div className="announcement-card-heading"><h3>{item.title}</h3>{role === 'Admin' && <button className="table-action danger-action" onClick={() => void remove(item)}>Remove</button>}</div>
              <p>{item.body}</p>
              <small>{new Date(item.createdAt).toLocaleString()} · {item.audience === 'all' ? 'Everyone' : item.audience === 'hr' ? 'HR team' : 'Employees'}{item.expiresAt ? ` · Expires ${new Date(item.expiresAt).toLocaleDateString()}` : ''}</small>
            </article>
          )) : <p className="table-empty">There are no current announcements.</p>}
      </section>
    </div>
  )
}
