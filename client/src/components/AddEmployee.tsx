import { useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'
import type { Role } from '../utils/role'

type EmployeeForm = {
  name: string
  email: string
  department: string
  designation: string
  salary: string
  password: string
  role: Role
}

type AddEmployeeProps = {
  token: string
  role: Role
  onAdded: (employee: { employeeId: string; accountId?: string; email: string }) => void
  onUnauthorized: () => void
}

const emptyForm: EmployeeForm = {
  name: '',
  email: '',
  department: '',
  designation: '',
  salary: '',
  password: '',
  role: 'Employee',
}

export default function AddEmployee({ token, role, onAdded, onUnauthorized }: AddEmployeeProps) {
  const [form, setForm] = useState<EmployeeForm>(emptyForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isAdmin = role === 'Admin'

  const submit = async (event: Event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await axios.post<{ employeeId: string; accountId?: string; email: string }>(
        `${apiUrl}/api/users`,
        { ...form, salary: Number(form.salary), role: form.role.toLowerCase() },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setForm(emptyForm)
      setShowPassword(false)
      onAdded(response.data)
    } catch (error) {
      if (axios.isAxiosError<{ message?: string }>(error)) {
        if (error.response?.status === 401) {
          onUnauthorized()
          return
        }
        setError(
          error.response?.data?.message ??
            'Could not reach the employee and account service. Check your connection and try again.',
        )
      } else {
        setError('Employee and account could not be created due to an unexpected error.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, margin: '15px 0', flexWrap: 'wrap' }}>
      <input
        placeholder="Name"
        maxLength={120}
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.currentTarget.value })}
        required
      />
      <input
        placeholder="Email"
        type="email"
        maxLength={254}
        value={form.email}
        onChange={(event) => setForm({ ...form, email: event.currentTarget.value })}
        required
      />
      <input
        placeholder="Department"
        maxLength={120}
        value={form.department}
        onChange={(event) => setForm({ ...form, department: event.currentTarget.value })}
        required
      />
      <input
        placeholder="Designation"
        maxLength={120}
        value={form.designation}
        onChange={(event) => setForm({ ...form, designation: event.currentTarget.value })}
        required
      />
      <input
        placeholder="Salary"
        type="number"
        min="0"
        step="0.01"
        value={form.salary}
        onChange={(event) => setForm({ ...form, salary: event.currentTarget.value })}
        required
      />
      {isAdmin && (
        <select
          aria-label="Role"
          value={form.role}
          onChange={(event) => {
            const value = event.currentTarget.value
            if (value === 'HR' || value === 'Employee') setForm({ ...form, role: value })
          }}
        >
          <option value="Employee">Employee</option>
          <option value="HR">HR</option>
        </select>
      )}
      <div className="add-employee-password">
        <input
          aria-label="Password"
          placeholder="Password (at least 8 characters)"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.currentTarget.value })}
          required
        />
        <button
          className="password-toggle"
          type="button"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? 'Hide' : 'Show'}
        </button>
      </div>
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Adding...' : 'Add'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}
