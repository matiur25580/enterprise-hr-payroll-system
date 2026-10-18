import { useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from './api'

type EmployeeForm = {
  name: string
  email: string
  department: string
  designation: string
  salary: string
}

type AddEmployeeProps = {
  token: string
  onAdded: () => void
  onUnauthorized: () => void
}

const emptyForm: EmployeeForm = {
  name: '',
  email: '',
  department: '',
  designation: '',
  salary: '',
}

export default function AddEmployee({ token, onAdded, onUnauthorized }: AddEmployeeProps) {
  const [form, setForm] = useState<EmployeeForm>(emptyForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submit = async (event: Event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      await axios.post(
        `${apiUrl}/api/employees`,
        { ...form, salary: Number(form.salary) },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setForm(emptyForm)
      onAdded()
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        if (error.response?.status === 401) {
          onUnauthorized()
          return
        }
        setError(
          error.response?.data?.message ??
            'Could not reach the employee server. Check your connection and try again.',
        )
      } else {
        setError('Employee could not be added due to an unexpected error.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, margin: '15px 0', flexWrap: 'wrap' }}>
      <input
        placeholder="Name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
        required
      />
      <input
        placeholder="Email"
        type="email"
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.currentTarget.value })}
        required
      />
      <input
        placeholder="Department"
        value={form.department}
        onChange={(event) => setForm({ ...form, department: event.currentTarget.value })}
        required
      />
      <input
        placeholder="Designation"
        value={form.designation}
        onChange={(event) => setForm({ ...form, designation: event.currentTarget.value })}
        required
      />
      <input
        placeholder="Salary"
        type="number"
        min="0"
        value={form.salary}
        onChange={(event) => setForm({ ...form, salary: event.currentTarget.value })}
        required
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding...' : 'Add'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
