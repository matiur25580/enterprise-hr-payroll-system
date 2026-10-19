import { useEffect, useMemo, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'
import useDebouncedValue from '../hooks/useDebouncedValue'

type TeamMember = {
  _id: string
  name: string
  email: string
  department: string
  designation: string
}

export default function TeamDirectory({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const debouncedSearch = useDebouncedValue(search, 150)

  useEffect(() => {
    let active = true
    axios.get<TeamMember[]>(`${apiUrl}/api/employees/directory`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      if (active) setMembers(response.data)
    }).catch((requestError) => {
      if (!active) return
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load the team directory. Please try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token])

  const visibleMembers = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase()
    return members.filter((member) => !query || [
      member.name, member.email, member.department, member.designation,
    ].some((value) => value?.toLowerCase().includes(query)))
  }, [members, debouncedSearch])

  return (
    <section className="panel team-directory">
      <div className="panel-heading">
        <div><span className="eyebrow">YOUR ORGANIZATION</span><h2>Team directory <span className="count-pill">{visibleMembers.length}</span></h2></div>
      </div>
      <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search team members" placeholder="Search name, department or role" value={search} onInput={(event) => setSearch(event.currentTarget.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading team directory…</div>
        : visibleMembers.length ? (
          <div className="team-directory-grid">
            {visibleMembers.map((member) => (
              <article className="team-member-card" key={member._id}>
                <span className="avatar">{member.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                <div><strong>{member.name}</strong><span>{member.designation || 'Team member'}</span><small>{member.department || 'Unassigned'}</small><a href={`mailto:${member.email}`}>{member.email}</a></div>
              </article>
            ))}
          </div>
        ) : <p className="table-empty">{members.length ? 'No team members match your search.' : 'No team members are available yet.'}</p>}
    </section>
  )
}
