import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'
import type { Role } from '../utils/role'

type Employee = { _id: string; name: string; department: string }
type Review = {
  _id: string
  employeeName: string
  employeeEmail: string
  period: string
  rating: number
  summary: string
  reviewerEmail: string
  createdAt: string
}

type Props = {
  employees: Employee[]
  token: string
  role: Role
  onNotify: (message: string) => void
  onUnauthorized: () => void
}

function currentQuarter() {
  const now = new Date()
  return `${now.getFullYear()}-Q${Math.floor(now.getMonth() / 3) + 1}`
}

export default function Performance({ employees, token, role, onNotify, onUnauthorized }: Props) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [period, setPeriod] = useState(currentQuarter)
  const [rating, setRating] = useState('3')
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    axios.get<Review[]>(`${apiUrl}/api/performance`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => { if (active) setReviews(response.data) })
      .catch((requestError) => {
        if (!active) return
        if (axios.isAxiosError(requestError) && requestError.response?.status === 401) return onUnauthorized()
        setError('Could not load performance reviews. Please try again.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  const saveReview = async (event: Event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await axios.post<Review>(`${apiUrl}/api/performance`, {
        employeeId,
        period,
        rating: Number(rating),
        summary,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setReviews((current) => [response.data, ...current.filter((item) => item._id !== response.data._id)])
      setSummary('')
      onNotify(`Performance review saved for ${response.data.employeeName}.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not save the performance review.')
      } else {
        setError('Could not save the performance review. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="performance-workspace">
      {role !== 'Employee' && (
        <form className="performance-form" onSubmit={saveReview}>
          <label>Employee<select value={employeeId} onChange={(event) => setEmployeeId(event.currentTarget.value)} required>
            <option value="">Select employee</option>
            {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} · {employee.department}</option>)}
          </select></label>
          <label>Quarter<input type="text" pattern="\d{4}-Q[1-4]" placeholder="2025-Q1" value={period} onInput={(event) => setPeriod(event.currentTarget.value)} required /></label>
          <label>Rating<select value={rating} onChange={(event) => setRating(event.currentTarget.value)}>{[1, 2, 3, 4, 5].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
          <label className="performance-summary-field">Review summary<textarea minLength={10} maxLength={2000} value={summary} onInput={(event) => setSummary(event.currentTarget.value)} required /></label>
          <button className="primary-button" type="submit" disabled={submitting || employees.length === 0}>{submitting ? 'Saving…' : 'Save review'}</button>
        </form>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading reviews…</div>
        : reviews.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Employee</th><th>Period</th><th>Rating</th><th>Review</th><th>Reviewer</th><th>Created</th></tr></thead>
              <tbody>{reviews.map((review) => (
                <tr key={review._id}>
                  <td>{review.employeeName}<small className="leave-email">{review.employeeEmail}</small></td>
                  <td>{review.period}</td>
                  <td>{review.rating} / 5</td>
                  <td>{review.summary}</td>
                  <td>{review.reviewerEmail}</td>
                  <td>{new Date(review.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="table-empty">No performance reviews have been recorded.</p>}
    </div>
  )
}
