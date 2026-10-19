import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'

type Department = {
  _id: string
  name: string
  description: string
  employeeCount: number
}

export default function DepartmentManagement({
  token,
  onNotify,
  onUnauthorized,
}: {
  token: string
  onNotify: (message: string, tone?: 'success' | 'error') => void
  onUnauthorized: () => void
}) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [removingId, setRemovingId] = useState('')
  const [error, setError] = useState('')

  const loadDepartments = async () => {
    try {
      const response = await axios.get<Department[]>(`${apiUrl}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDepartments(response.data)
      setError('')
    } catch (requestError) {
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load departments. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDepartments()
  }, [token])

  const createDepartment = async (event: Event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await axios.post<Department>(`${apiUrl}/api/departments`, {
        name: name.trim(),
        description: description.trim(),
      }, { headers: { Authorization: `Bearer ${token}` } })
      setDepartments((current) => [...current, response.data].sort((left, right) => left.name.localeCompare(right.name)))
      setName('')
      setDescription('')
      onNotify(`${response.data.name} department created.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not create the department.')
      } else {
        setError('Could not create the department. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const removeDepartment = async (department: Department) => {
    setRemovingId(department._id)
    setError('')
    try {
      await axios.delete(`${apiUrl}/api/departments/${department._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDepartments((current) => current.filter((item) => item._id !== department._id))
      onNotify(`${department.name} department deleted.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not delete the department.')
      } else {
        setError('Could not delete the department. Please try again.')
      }
    } finally {
      setRemovingId('')
    }
  }

  return (
    <div className="department-management">
      <form className="department-form" onSubmit={createDepartment}>
        <label>
          Department name
          <input value={name} onInput={(event) => setName(event.currentTarget.value)} minLength={2} maxLength={120} required />
        </label>
        <label>
          Description
          <input value={description} onInput={(event) => setDescription(event.currentTarget.value)} maxLength={500} />
        </label>
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create department'}
        </button>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading departments…</div>
        : departments.length ? (
          <div className="department-record-list">
            {departments.map((department) => (
              <article className="department-record" key={department._id}>
                <div><strong>{department.name}</strong><small>{department.description || 'No description'}</small></div>
                <span className="count-pill">{department.employeeCount} employees</span>
                <button
                  className="table-action danger-action"
                  type="button"
                  disabled={department.employeeCount > 0 || removingId === department._id}
                  title={department.employeeCount > 0 ? 'Move employees before deleting this department.' : undefined}
                  onClick={() => void removeDepartment(department)}
                >
                  {removingId === department._id ? 'Deleting…' : 'Delete'}
                </button>
              </article>
            ))}
          </div>
        ) : <p className="table-empty">No departments have been created yet.</p>}
    </div>
  )
}
