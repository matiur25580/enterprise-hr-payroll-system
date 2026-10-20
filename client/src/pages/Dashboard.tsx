import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import axios from 'axios'
import AddEmployee from '../components/AddEmployee'
import Payroll from '../components/Payroll'
import Attendance from '../components/Attendance'
import Leave from '../components/Leave'
import SalaryChart from '../components/SalaryChart'
import AuditLog from '../components/AuditLog'
import OfferLetter from '../components/OfferLetter'
import Performance from '../components/Performance'
import Announcements from '../components/Announcements'
import BulkEmployeeImport from '../components/BulkEmployeeImport'
import Support from '../components/Support'
import TeamDirectory from '../components/TeamDirectory'
import Notifications from '../components/Notifications'
import PeopleOperations from '../components/PeopleOperations'
import DepartmentManagement from '../components/DepartmentManagement'
import WorkforceAnalytics from '../components/WorkforceAnalytics'
import DocumentManagement from '../components/DocumentManagement'
import SalaryStructure from '../components/SalaryStructure'
import { logAudit } from '../utils/audit'
import { apiUrl } from '../services/api'
import { type Role, type UserSession } from '../utils/role'

type Employee = {
  _id: string
  employeeId?: string
  name: string
  email: string
  department: string
  designation: string
  salary: number
  joiningDate?: string
}

type Section = 'overview' | 'people' | 'profile' | 'payroll' | 'attendance' | 'leave' | 'performance' | 'offers' | 'audit' | 'announcements' | 'support' | 'team' | 'import' | 'notifications' | 'peopleOps' | 'departments' | 'analytics' | 'documents' | 'salary' | 'pendingApprovals'

type DashboardProps = {
  session: UserSession
  onLogout: () => void
}

type Feedback = { message: string; tone: 'success' | 'error' }
type Theme = 'dark' | 'light'
type Activity = {
  _id: string
  actorEmail: string
  actorRole: string
  category: string
  message: string
  createdAt: string
}

type PendingApproval = {
  _id: string
  name: string
  email: string
  createdAt: string
}

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const roleContent: Record<Role, { title: string; description: string; nav: Array<{ id: Section; label: string; icon: string }> }> = {
  Admin: {
    title: 'Executive overview',
    description: 'Company-wide workforce, payroll and operational controls.',
    nav: [
      { id: 'overview', label: 'Overview', icon: '◫' },
      { id: 'pendingApprovals', label: 'Pending approvals', icon: '✓' },
      { id: 'people', label: 'Workforce', icon: '♙' },
      { id: 'departments', label: 'Departments', icon: '◫' },
      { id: 'analytics', label: 'Workforce analytics', icon: '▥' },
      { id: 'documents', label: 'Documents', icon: '▤' },
      { id: 'payroll', label: 'Payroll', icon: '▤' },
      { id: 'attendance', label: 'Attendance', icon: '◷' },
      { id: 'leave', label: 'Leave & requests', icon: '▧' },
      { id: 'performance', label: 'Performance', icon: '↗' },
      { id: 'offers', label: 'Offer letters', icon: '✉' },
      { id: 'audit', label: 'Audit trail', icon: '☷' },
      { id: 'announcements', label: 'Announcements', icon: '◉' },
      { id: 'support', label: 'Support queue', icon: '?' },
      { id: 'notifications', label: 'Notifications', icon: '◉' },
      { id: 'peopleOps', label: 'Talent & onboarding', icon: '✦' },
    ],
  },
  HR: {
    title: 'People operations',
    description: 'A focused workspace for your people, attendance and employee lifecycle.',
    nav: [
      { id: 'overview', label: 'Overview', icon: '◫' },
      { id: 'people', label: 'People directory', icon: '♙' },
      { id: 'attendance', label: 'Attendance', icon: '◷' },
      { id: 'leave', label: 'Review requests', icon: '▧' },
      { id: 'salary', label: 'Salary structure', icon: '₹' },
      { id: 'performance', label: 'Performance', icon: '↗' },
      { id: 'offers', label: 'Offer letters', icon: '✉' },
      { id: 'payroll', label: 'Payroll', icon: '▤' },
      { id: 'import', label: 'Bulk import', icon: '⇧' },
      { id: 'documents', label: 'Documents', icon: '▤' },
      { id: 'announcements', label: 'Announcements', icon: '◉' },
      { id: 'support', label: 'Support queue', icon: '?' },
      { id: 'notifications', label: 'Notifications', icon: '◉' },
      { id: 'peopleOps', label: 'Hiring & onboarding', icon: '✦' },
    ],
  },
  Employee: {
    title: 'My workday',
    description: 'Your personal hub for pay, profile and time-off requests.',
    nav: [
      { id: 'overview', label: 'My overview', icon: '◫' },
      { id: 'profile', label: 'My profile', icon: '♙' },
      { id: 'payroll', label: 'My payslips', icon: '▤' },
      { id: 'attendance', label: 'My attendance', icon: '◷' },
      { id: 'leave', label: 'My leave', icon: '▧' },
      { id: 'team', label: 'Team directory', icon: '♧' },
      { id: 'documents', label: 'My documents', icon: '▤' },
      { id: 'announcements', label: 'Announcements', icon: '◉' },
      { id: 'support', label: 'Help & support', icon: '?' },
      { id: 'notifications', label: 'Notifications', icon: '◉' },
      { id: 'performance', label: 'My growth', icon: '↗' },
      { id: 'peopleOps', label: 'Onboarding checklist', icon: '✦' },
    ],
  },
}

const titleForSection: Record<Section, string> = {
  overview: 'Overview',
  people: 'People directory',
  profile: 'My profile',
  payroll: 'Payroll',
  attendance: 'Attendance',
  leave: 'Leave management',
  performance: 'Performance & growth',
  offers: 'Offer letters',
  audit: 'Audit trail',
  announcements: 'Announcements',
  support: 'Help & support',
  team: 'Team directory',
  import: 'Bulk employee import',
  notifications: 'Notifications inbox',
  peopleOps: 'Talent & employee onboarding',
  departments: 'Department management',
  analytics: 'Workforce analytics',
  documents: 'Documents',
  salary: 'Salary structure',
  pendingApprovals: 'Pending approvals',
}

function StatCard({ label, value, note, icon, tone = 'blue' }: { label: string; value: string; note: string; icon: string; tone?: string }) {
  return (
    <article className={`stat-card stat-${tone}`}>
      <div className="stat-topline"><span>{label}</span><span className="stat-icon" aria-hidden="true">{icon}</span></div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  )
}

function PendingApprovals({ token, onNotify, onUnauthorized }: {
  token: string
  onNotify: (message: string, tone?: Feedback['tone']) => void
  onUnauthorized: () => void
}) {
  const [users, setUsers] = useState<PendingApproval[]>([])
  const [roles, setRoles] = useState<Record<string, 'hr' | 'employee'>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [savingId, setSavingId] = useState('')

  useEffect(() => {
    let active = true
    axios.get<PendingApproval[]>(`${apiUrl}/api/users/pending-approvals`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      if (!active) return
      setUsers(response.data)
      setRoles(Object.fromEntries(response.data.map((user) => [user._id, 'employee'])))
    }).catch((error: unknown) => {
      if (!active) return
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        onUnauthorized()
        return
      }
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message ?? 'Could not load pending approvals.'
        : 'Could not load pending approvals.'
      setLoadError(message)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token, onUnauthorized])

  const decide = async (user: PendingApproval, status: 'active' | 'rejected') => {
    setSavingId(user._id)
    try {
      const response = await axios.patch<{ message: string }>(
        `${apiUrl}/api/users/pending-approvals/${user._id}`,
        { status, role: roles[user._id] || 'employee' },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setUsers((current) => current.filter((pending) => pending._id !== user._id))
      onNotify(response.data.message)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        onUnauthorized()
      } else {
        const message = axios.isAxiosError<{ message?: string }>(error)
          ? error.response?.data?.message ?? 'Could not update this account.'
          : 'Could not update this account.'
        onNotify(message, 'error')
      }
    } finally {
      setSavingId('')
    }
  }

  return (
    <section className="panel module-panel">
      <div className="panel-heading"><div><span className="eyebrow">ACCOUNT ACCESS</span><h2>Pending approvals</h2></div></div>
      {loading ? <p className="muted-copy" role="status">Loading pending accounts…</p>
        : loadError ? <p className="form-error" role="alert">{loadError}</p>
          : users.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Applicant</th><th>Requested</th><th>Assign role</th><th>Actions</th></tr></thead>
                <tbody>{users.map((user) => (
                  <tr key={user._id}>
                    <td><div className="person-cell"><span className="avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>
                      <select
                        aria-label={`Role for ${user.name}`}
                        value={roles[user._id] || 'employee'}
                        onChange={(event) => setRoles((current) => ({
                          ...current,
                          [user._id]: event.currentTarget.value === 'hr' ? 'hr' : 'employee',
                        }))}
                      >
                        <option value="employee">Employee</option>
                        <option value="hr">HR</option>
                      </select>
                    </td>
                    <td className="row-actions">
                      <button className="table-action" disabled={savingId === user._id} onClick={() => void decide(user, 'active')}>{savingId === user._id ? 'Saving…' : 'Approve'}</button>
                      <button className="table-action danger-action" disabled={savingId === user._id} onClick={() => void decide(user, 'rejected')}>Reject</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="muted-copy">There are no accounts waiting for approval.</p>}
    </section>
  )
}

function Overview({
  role,
  employee,
  employees,
  departments,
  onNavigate,
}: {
  role: Role
  employee?: Employee
  employees: Employee[]
  departments: Array<{ name: string; count: number }>
  onNavigate: (section: Section) => void
}) {
  const totalPayroll = employees.reduce((sum, person) => sum + Number(person.salary || 0), 0)
  const thisYear = new Date().getFullYear()
  const recentHires = employees.filter((person) => person.joiningDate && new Date(person.joiningDate).getFullYear() === thisYear).length
  const latestHires = employees
    .filter((person) => person.joiningDate && Number.isFinite(new Date(person.joiningDate).getTime()))
    .sort((a, b) => new Date(b.joiningDate!).getTime() - new Date(a.joiningDate!).getTime())
    .slice(0, 5)

  if (role === 'Employee') {
    if (!employee) {
      return (
        <section className="panel empty-state">
          <span className="empty-icon">♙</span>
          <h2>Your employee profile is not linked yet</h2>
          <p>Ask your HR team to add your work email to the employee directory. Your personal information will appear here once linked.</p>
        </section>
      )
    }

    return (
      <>
        <section className="welcome-banner employee-banner">
          <div>
            <span className="eyebrow">EMPLOYEE SELF-SERVICE</span>
            <h2>Good to have you here, {employee.name.split(' ')[0]}.</h2>
            <p>Your work essentials, all in one place. Here’s your latest profile and pay snapshot.</p>
          </div>
          <button className="secondary-button light-button" onClick={() => onNavigate('profile')}>View my profile <span aria-hidden="true">→</span></button>
        </section>
        <div className="stats-grid">
          <StatCard label="Annual salary" value={currency.format(Number(employee.salary || 0) * 12)} note="Based on your current monthly salary" icon="₹" tone="blue" />
          <StatCard label="Monthly gross salary" value={currency.format(Number(employee.salary || 0))} note="Before payroll deductions" icon="▤" tone="green" />
          <StatCard label="Department" value={employee.department || '—'} note={employee.designation || 'Your team'} icon="♙" tone="purple" />
        </div>
        <div className="content-grid employee-content-grid">
          <section className="panel">
            <div className="panel-heading"><div><span className="eyebrow">QUICK ACCESS</span><h2>Your work essentials</h2></div></div>
            <div className="quick-actions">
              <button className="quick-action" onClick={() => onNavigate('payroll')}><span className="quick-icon blue-icon">▤</span><span><strong>View payslips</strong><small>Review pay details and download monthly payslips</small></span><b>→</b></button>
              <button className="quick-action" onClick={() => onNavigate('leave')}><span className="quick-icon purple-icon">▧</span><span><strong>Apply leave</strong><small>Submit dates and a reason for review</small></span><b>→</b></button>
              <button className="quick-action" onClick={() => onNavigate('attendance')}><span className="quick-icon green-icon">◷</span><span><strong>Attendance</strong><small>Open your attendance workspace</small></span><b>→</b></button>
            </div>
          </section>
          <section className="panel profile-summary">
            <div className="panel-heading"><div><span className="eyebrow">YOUR PROFILE</span><h2>At a glance</h2></div><button className="subtle-link" onClick={() => onNavigate('profile')}>View profile</button></div>
            <dl>
              <div><dt>Work email</dt><dd>{employee.email}</dd></div>
              <div><dt>Job title</dt><dd>{employee.designation || '—'}</dd></div>
              <div><dt>Department</dt><dd>{employee.department || '—'}</dd></div>
              <div><dt>Start date</dt><dd>{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : '—'}</dd></div>
            </dl>
          </section>
        </div>
      </>
    )
  }

  const isAdmin = role === 'Admin'
  return (
    <>
      <section className={`welcome-banner ${isAdmin ? 'admin-banner' : 'hr-banner'}`}>
        <div>
          <span className="eyebrow">{isAdmin ? 'ADMINISTRATOR WORKSPACE' : 'HUMAN RESOURCES WORKSPACE'}</span>
          <h2>{isAdmin ? 'Your organization, in focus.' : 'Build a better employee experience.'}</h2>
          <p>{isAdmin ? 'Monitor workforce health, payroll exposure and key people operations from one place.' : 'Keep your people operations moving with a clear view of employees, attendance and requests.'}</p>
        </div>
        <button className="secondary-button light-button" onClick={() => onNavigate(isAdmin ? 'people' : 'leave')}>
          {isAdmin ? 'Manage workforce' : 'Review requests'} <span aria-hidden="true">→</span>
        </button>
      </section>
      <div className="stats-grid">
        <StatCard label="Active workforce" value={String(employees.length)} note="People in the employee directory" icon="♙" tone="blue" />
        <StatCard label="Departments" value={String(departments.length)} note="Distinct teams across the company" icon="◫" tone="purple" />
        <StatCard label={isAdmin ? 'Monthly payroll' : 'People joined this year'} value={isAdmin ? currency.format(totalPayroll) : String(recentHires)} note={isAdmin ? 'Current salary total across employees' : `New starters in ${thisYear}`} icon={isAdmin ? '₹' : '↗'} tone="green" />
        <StatCard label="Average salary" value={employees.length ? currency.format(totalPayroll / employees.length) : currency.format(0)} note="Monthly average across the directory" icon="▤" tone="orange" />
      </div>
      <div className="content-grid">
        <section className="panel department-panel">
          <div className="panel-heading"><div><span className="eyebrow">WORKFORCE MIX</span><h2>People by department</h2></div><button className="subtle-link" onClick={() => onNavigate('people')}>View directory</button></div>
          {departments.length ? (
            <div className="department-list">
              {departments.slice(0, 6).map((department) => (
                <div className="department-row" key={department.name}>
                  <div className="department-label"><span>{department.name || 'Unassigned'}</span><strong>{department.count}</strong></div>
                  <div className="progress-track"><span style={{ width: `${Math.max(8, (department.count / Math.max(employees.length, 1)) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <p className="muted-copy">Add employees to see your team distribution.</p>}
        </section>
        <section className="panel focus-panel">
          <div className="panel-heading"><div><span className="eyebrow">{isAdmin ? 'ADMIN TOOLS' : 'HR TOOLKIT'}</span><h2>{isAdmin ? 'Stay in control' : 'Keep things moving'}</h2></div></div>
          <div className="quick-actions compact-actions">
            <button className="quick-action" onClick={() => onNavigate('people')}><span className="quick-icon blue-icon">♙</span><span><strong>{isAdmin ? 'Workforce directory' : 'People directory'}</strong><small>View and manage employee records</small></span><b>→</b></button>
            <button className="quick-action" onClick={() => onNavigate(isAdmin ? 'payroll' : 'attendance')}><span className="quick-icon green-icon">{isAdmin ? '▤' : '◷'}</span><span><strong>{isAdmin ? 'Payroll operations' : 'Attendance review'}</strong><small>{isAdmin ? 'Review pay and generate payslips' : 'Track today’s employee attendance'}</small></span><b>→</b></button>
            {!isAdmin && <button className="quick-action" onClick={() => onNavigate('salary')}><span className="quick-icon purple-icon">₹</span><span><strong>Salary structure</strong><small>Review and edit employee pay components</small></span><b>→</b></button>}
            {isAdmin && <button className="quick-action" onClick={() => onNavigate('audit')}><span className="quick-icon orange-icon">☷</span><span><strong>Audit trail</strong><small>Review recent administrative activity</small></span><b>→</b></button>}
          </div>
        </section>
      </div>
      {isAdmin && (
        <section className="panel recent-hires-panel">
          <div className="panel-heading">
            <div><span className="eyebrow">WORKFORCE ACTIVITY</span><h2>Recent joiners</h2></div>
            <button className="subtle-link" onClick={() => onNavigate('people')}>View directory</button>
          </div>
          {latestHires.length ? (
            <div className="recent-hires-list">
              {latestHires.map((person) => (
                <div className="recent-hire" key={person._id}>
                  <span className="avatar">{person.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span>
                  <span className="recent-hire-details"><strong>{person.name}</strong><small>{person.designation || 'Team member'} · {person.department || 'Unassigned'}</small></span>
                  <time dateTime={new Date(person.joiningDate!).toISOString()}>{new Date(person.joiningDate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>
                </div>
              ))}
            </div>
          ) : <p className="muted-copy">Joining dates will appear here as employee records are updated.</p>}
        </section>
      )}
      {isAdmin && <section className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">COMPENSATION</span><h2>Salary distribution</h2></div><button className="subtle-link" onClick={() => onNavigate('payroll')}>Open payroll</button></div><SalaryChart employees={employees} /></section>}
    </>
  )
}

export default function Dashboard({ session, onLogout }: DashboardProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [salaryPreview, setSalaryPreview] = useState<Record<string, number>>({})
  const [feedback, setFeedback] = useState<Feedback | null>({
    message: `Login successful. Welcome to the ${session.role} Portal, ${session.name}.`,
    tone: 'success',
  })
  const [activities, setActivities] = useState<Activity[]>([])
  const [activityError, setActivityError] = useState('')
  const knownActivityIds = useRef<Set<string> | null>(null)
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem(`workspace-theme-${session.role.toLowerCase()}`)
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'dark'
  })
  const [activeSection, setActiveSection] = useState<Section>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [editingEmployeeId, setEditingEmployeeId] = useState('')
  const [employeeEdit, setEmployeeEdit] = useState({ salary: '', department: '' })
  const [savingEmployeeId, setSavingEmployeeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const role = session.role
  const canManagePeople = role === 'Admin' || role === 'HR'
  const canRemovePeople = role === 'Admin'
  const ownEmployees = useMemo(
    () => employees.filter((employee) => employee.email.toLowerCase() === session.email.toLowerCase()),
    [employees, session.email],
  )
  const employee = ownEmployees[0]
  const roleConfig = roleContent[role]
  const navigateTo = (section: Section) => {
    setActiveSection(section)
    setSidebarOpen(false)
  }
  const departments = useMemo(() => {
    const counts = employees.reduce<Record<string, number>>((result, person) => {
      const name = person.department || 'Unassigned'
      result[name] = (result[name] || 0) + 1
      return result
    }, {})
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [employees])
  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employees.filter((person) => {
      const matchesSearch = !term || [person.name, person.email, person.department, person.designation]
        .some((value) => value?.toLowerCase().includes(term))
      return matchesSearch && (departmentFilter === 'All' || person.department === departmentFilter)
    })
  }, [employees, search, departmentFilter])

  const fetchEmployees = async () => {
    setLoadError('')
    try {
      const response = await axios.get<Employee[]>(`${apiUrl}/api/employees`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      setEmployees(response.data)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        onLogout()
        return
      }
      setLoadError('We could not load workforce information. Please check the server connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchEmployees()
  }, [session.token])

  useEffect(() => {
    if (!feedback) return
    const timeout = window.setTimeout(() => setFeedback(null), 8000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  useEffect(() => {
    let active = true
    const loadActivity = async () => {
      try {
        const response = await axios.get<Activity[]>(`${apiUrl}/api/activity`, {
          headers: { Authorization: `Bearer ${session.token}` },
        })
        if (!active) return
        const nextActivities = response.data
        const knownIds = knownActivityIds.current
        if (knownIds) {
          const newActivity = nextActivities.find(
            (activity) => !knownIds.has(activity._id) && activity.actorEmail !== session.email,
          )
          if (newActivity) {
            notify(newActivity.message)
            if (newActivity.category.startsWith('employee-')) void fetchEmployees()
          }
        }
        knownActivityIds.current = new Set(nextActivities.map((activity) => activity._id))
        setActivities(nextActivities)
        setActivityError('')
      } catch (error) {
        if (!active) return
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          onLogout()
          return
        }
        setActivityError('Workplace updates are temporarily unavailable.')
      }
    }

    void loadActivity()
    const interval = window.setInterval(() => void loadActivity(), 15000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [session.token, session.email])

  useEffect(() => {
    localStorage.setItem(`workspace-theme-${role.toLowerCase()}`, theme)
  }, [role, theme])

  const notify = (message: string, tone: Feedback['tone'] = 'success') => {
    setFeedback({ message, tone })
  }

  const handleDelete = async (person: Employee) => {
    if (!canRemovePeople || !confirm(`Remove ${person.name} from the employee directory?`)) return
    try {
      await axios.delete(`${apiUrl}/api/employees/${person._id}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      await fetchEmployees()
      notify(`${person.name} was removed successfully.`)
    } catch (requestError) {
      const message = axios.isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data?.message ?? `Could not delete ${person.name}. Please try again.`
        : `Could not delete ${person.name}. Please try again.`
      notify(message, 'error')
      setLoadError(message)
    }
  }

  const handleEdit = (person: Employee) => {
    if (!canManagePeople) return
    setEditingEmployeeId(person._id)
    setEmployeeEdit({ salary: String(person.salary), department: person.department })
  }

  const saveEmployeeEdit = async (person: Employee) => {
    await saveEmployeeDetails(person, employeeEdit.salary, employeeEdit.department)
  }

  const saveEmployeeDetails = async (person: Employee, salaryValue: string | number, departmentValue: string) => {
    const amount = Number(salaryValue)
    const department = departmentValue.trim()
    if (!Number.isFinite(amount) || amount < 0 || !department || department.length > 120) {
      notify('Enter a valid, non-negative salary and a department of at most 120 characters.', 'error')
      return false
    }
    setSavingEmployeeId(person._id)
    try {
      await axios.put(`${apiUrl}/api/employees/${person._id}`, { salary: amount, department }, {
        headers: { Authorization: `Bearer ${session.token}` },
      })
      setEditingEmployeeId('')
      await fetchEmployees()
      notify(`${person.name}'s details were updated successfully.`)
      return true
    } catch (requestError) {
      const message = axios.isAxiosError<{ message?: string }>(requestError)
        ? requestError.response?.data?.message ?? `Could not update ${person.name}. Please try again.`
        : `Could not update ${person.name}. Please try again.`
      notify(message, 'error')
      setLoadError(message)
      return false
    } finally {
      setSavingEmployeeId('')
    }
  }

  const exportCsv = () => {
    const rows = filteredEmployees.map((person) => [
      person.name,
      person.email,
      person.department,
      person.designation,
      person.salary,
    ].map((value) => {
      const cell = String(value ?? '')
      const safeCell = /^[\t\r\n ]*[=+\-@]/.test(cell) ? `'${cell}` : cell
      return `"${safeCell.replaceAll('"', '""')}"`
    }).join(','))
    const csv = ['Name,Email,Department,Designation,Monthly salary', ...rows].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'workforce-directory.csv'
    link.click()
    URL.revokeObjectURL(url)
    logAudit('EXPORT', `Exported ${filteredEmployees.length} employees to CSV`)
    notify(`Workforce CSV exported successfully (${filteredEmployees.length} employees).`)
  }

  const renderPeople = () => (
    <>
      {canManagePeople && (
        <section className="panel add-employee-panel">
          <div className="panel-heading"><div><span className="eyebrow">EMPLOYEE LIFECYCLE</span><h2>Add a team member</h2></div></div>
          <AddEmployee
            token={session.token}
            role={role}
            onAdded={({ employeeId, accountId, email }) => {
              void fetchEmployees()
              notify(accountId
                ? `Account created successfully. Account ID: ${accountId} · Email: ${email}`
                : `Employee added successfully. Employee ID: ${employeeId}`)
            }}
            onUnauthorized={onLogout}
          />
        </section>
      )}
      <section className="panel directory-panel">
        <div className="panel-heading"><div><span className="eyebrow">{role === 'Admin' ? 'ORGANIZATION' : 'PEOPLE OPERATIONS'}</span><h2>Employee directory <span className="count-pill">{filteredEmployees.length}</span></h2></div><button className="secondary-button" onClick={exportCsv}>Export CSV <span aria-hidden="true">↓</span></button></div>
        <div className="directory-filters">
          <label className="search-field"><span aria-hidden="true">⌕</span><input aria-label="Search employees" placeholder="Search name, email or role" value={search} onInput={(event) => setSearch(event.currentTarget.value)} /></label>
          <select aria-label="Filter by department" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.currentTarget.value)}>
            <option value="All">All departments</option>
            {departments.map((department) => <option key={department.name} value={department.name}>{department.name}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Employee</th><th>Department</th><th>Job title</th><th>Monthly salary</th>{canManagePeople && <th>Actions</th>}</tr></thead>
            <tbody>
              {filteredEmployees.map((person) => (
                <tr key={person._id || person.email}>
                  <td><div className="person-cell"><span className="avatar">{person.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span><strong>{person.name}</strong><small>{person.email}</small></span></div></td>
                  <td>{editingEmployeeId === person._id
                    ? <input aria-label={`Department for ${person.name}`} maxLength={120} value={employeeEdit.department} onInput={(event) => setEmployeeEdit({ ...employeeEdit, department: event.currentTarget.value })} />
                    : person.department || '—'}</td>
                  <td>{person.designation || '—'}</td>
                  <td>{editingEmployeeId === person._id
                    ? <input aria-label={`Monthly salary for ${person.name}`} type="number" min="0" step="0.01" value={employeeEdit.salary} onInput={(event) => setEmployeeEdit({ ...employeeEdit, salary: event.currentTarget.value })} />
                    : currency.format(Number(person.salary || 0))}</td>
                  {canManagePeople && <td className="row-actions">
                    {editingEmployeeId === person._id ? (
                      <>
                        <button className="table-action" disabled={savingEmployeeId === person._id} onClick={() => void saveEmployeeEdit(person)}>{savingEmployeeId === person._id ? 'Saving…' : 'Save'}</button>
                        <button className="table-action" disabled={savingEmployeeId === person._id} onClick={() => setEditingEmployeeId('')}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="table-action" onClick={() => handleEdit(person)}>Edit</button>
                        {canRemovePeople && <button className="table-action danger-action" onClick={() => void handleDelete(person)}>Remove</button>}
                      </>
                    )}
                  </td>}
                </tr>
              ))}
              {!filteredEmployees.length && <tr><td colSpan={canManagePeople ? 5 : 4} className="table-empty">No employees match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )

  const renderSection = () => {
    if (activeSection === 'overview') {
      return <Overview role={role} employee={employee} employees={role === 'Employee' ? ownEmployees : employees} departments={role === 'Employee' && employee ? [{ name: employee.department, count: 1 }] : departments} onNavigate={navigateTo} />
    }
    if (activeSection === 'salary' && role === 'HR') return <SalaryStructure
      employees={employees}
      salaryValues={salaryPreview}
      onSaveBasic={(employeeId, basicSalary) => setSalaryPreview((current) => ({ ...current, [employeeId]: basicSalary }))}
      onNotify={notify}
    />
    if (activeSection === 'people' && role !== 'Employee') return renderPeople()
    if (activeSection === 'pendingApprovals' && role === 'Admin') {
      return <PendingApprovals token={session.token} onNotify={notify} onUnauthorized={onLogout} />
    }
    if (activeSection === 'profile' && role === 'Employee') {
      return employee ? (
        <section className="panel profile-detail">
          <div className="profile-cover"><span className="avatar profile-avatar">{employee.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span></div>
          <h2>{employee.name}</h2><p className="muted-copy">{employee.designation} · {employee.department}</p>
          <dl className="profile-details">
            <div><dt>Work email</dt><dd>{employee.email}</dd></div>
            <div><dt>Department</dt><dd>{employee.department}</dd></div>
            <div><dt>Job title</dt><dd>{employee.designation}</dd></div>
            <div><dt>Joining date</dt><dd>{employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : 'Not provided'}</dd></div>
          </dl>
        </section>
      ) : <section className="panel empty-state"><h2>Profile not available</h2><p>Your HR team can help link your account to your employee record.</p></section>
    }
    if (activeSection === 'payroll') return <section className="panel module-panel"><div className="panel-heading"><div><span className="eyebrow">{role === 'Employee' ? 'CONFIDENTIAL · PERSONAL' : 'COMPENSATION OPERATIONS'}</span><h2>{role === 'Employee' ? 'Your pay details' : 'Payroll register'}</h2></div></div><Payroll token={session.token} employeeSelfService={role === 'Employee'} onNotify={notify} onUnauthorized={onLogout} /></section>
    if (activeSection === 'attendance') return <section className="panel module-panel"><Attendance employees={role === 'Employee' ? ownEmployees : employees} token={session.token} employeeSelfService={role === 'Employee'} onNotify={notify} onUnauthorized={onLogout} /></section>
    if (activeSection === 'leave') return <section className="panel module-panel"><div className="panel-heading"><div><span className="eyebrow">{role === 'Employee' ? 'TIME OFF' : 'EMPLOYEE REQUESTS'}</span><h2>{role === 'Employee' ? 'My leave requests' : role === 'HR' ? 'Review requests' : 'Leave management'}</h2></div></div><Leave token={session.token} employeeSelfService={role === 'Employee'} onNotify={notify} onUnauthorized={onLogout} /></section>
    if (activeSection === 'performance') return <section className="panel module-panel"><div className="panel-heading"><div><span className="eyebrow">GROWTH & DEVELOPMENT</span><h2>{role === 'Employee' ? 'My performance reviews' : 'Performance reviews'}</h2></div></div><Performance employees={role === 'Employee' ? ownEmployees : employees} token={session.token} role={role} onNotify={notify} onUnauthorized={onLogout} /></section>
    if (activeSection === 'offers' && role !== 'Employee') return <section className="panel module-panel"><OfferLetter employees={employees} token={session.token} onNotify={notify} onUnauthorized={onLogout} /></section>
    if (activeSection === 'audit' && role === 'Admin') return <section className="panel module-panel"><AuditLog token={session.token} onUnauthorized={onLogout} /></section>
    if (activeSection === 'departments' && role === 'Admin') return <section className="panel module-panel"><div className="panel-heading"><div><span className="eyebrow">ORGANIZATION STRUCTURE</span><h2>Department management</h2></div></div><DepartmentManagement token={session.token} onNotify={notify} onUnauthorized={onLogout} /></section>
    if (activeSection === 'analytics' && role === 'Admin') return <WorkforceAnalytics token={session.token} onNotify={notify} onUnauthorized={onLogout} />
    if (activeSection === 'documents') return <section className="panel module-panel"><div className="panel-heading"><div><span className="eyebrow">SECURE FILES</span><h2>{role === 'Employee' ? 'My documents' : 'Document management'}</h2></div></div><DocumentManagement token={session.token} role={role} onNotify={notify} onUnauthorized={onLogout} /></section>
    if (activeSection === 'announcements') return <Announcements token={session.token} role={role} onNotify={notify} onUnauthorized={onLogout} />
    if (activeSection === 'support') return <Support token={session.token} role={role} onNotify={notify} onUnauthorized={onLogout} />
    if (activeSection === 'team' && role === 'Employee') return <TeamDirectory token={session.token} onUnauthorized={onLogout} />
    if (activeSection === 'notifications') return <Notifications token={session.token} email={session.email} role={role} onUnauthorized={onLogout} />
    if (activeSection === 'peopleOps') return <PeopleOperations employees={role === 'Employee' ? ownEmployees : employees} token={session.token} role={role} onNotify={notify} onUnauthorized={onLogout} />
    if (activeSection === 'import' && role === 'HR') return <BulkEmployeeImport token={session.token} onImported={() => void fetchEmployees()} onNotify={notify} onUnauthorized={onLogout} />
    return <Overview role={role} employee={employee} employees={role === 'Employee' ? ownEmployees : employees} departments={departments} onNavigate={navigateTo} />
  }

  const sectionTitle = activeSection === 'overview' ? roleConfig.title : titleForSection[activeSection]
  const timeGreeting = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <div className={`workspace role-${role.toLowerCase()} theme-${theme} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {sidebarOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" onClick={(event) => { event.preventDefault(); navigateTo('overview') }}>
          <span className="brand-mark">N</span><span><strong>northstar</strong><small>PEOPLE PLATFORM</small></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {roleConfig.nav.map((item) => <button key={item.id} className={`nav-item ${activeSection === item.id ? 'nav-active' : ''}`} onClick={() => navigateTo(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span></button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card"><span className="help-icon">✦</span><strong>Need a hand?</strong><p>Contact your people operations team for support.</p><a href="mailto:people@company.com">Get support <span aria-hidden="true">→</span></a></div>
          <button className="user-menu" onClick={onLogout}><span className="avatar user-avatar">{session.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span className="user-details"><strong>{session.name}</strong><small>{role} account</small></span><span className="logout-icon" aria-label="Sign out">↗</span></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="menu-toggle" type="button" aria-label={window.matchMedia('(max-width: 767px)').matches ? 'Toggle navigation' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => {
            if (window.matchMedia('(max-width: 767px)').matches) setSidebarOpen((open) => !open)
            else setSidebarCollapsed((collapsed) => !collapsed)
          }}>{sidebarCollapsed ? '☰' : '☰'}</button>
          <div className="breadcrumb">Workspace <span>/</span> <strong>{sectionTitle}</strong></div>
          <div className="topbar-right"><span className="today-label">{timeGreeting}</span><span className="role-chip">{role} Portal</span><button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}><span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span><span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span></button><button className="mobile-logout" onClick={onLogout}>Sign out</button></div>
        </header>
        <div className="page-content">
          {feedback && <div className={`action-feedback feedback-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}><span>{feedback.message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setFeedback(null)}>×</button></div>}
          <div className="page-heading">
            <div>
              <p className="eyebrow">{role.toUpperCase()} PORTAL</p>
              <h1>{role} Portal</h1>
              <p className="section-context">{sectionTitle}</p>
              <p className="page-description">{activeSection === 'overview' ? roleConfig.description : activeSection === 'people' ? 'Keep employee records organized and up to date.' : 'Manage the details and actions for your organization.'}</p>
            </div>
            <span className="heading-date">{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
          {loadError && <div className="notice-error" role="alert"><span>{loadError}</span><button onClick={() => void fetchEmployees()}>Try again</button></div>}
          {activityError && <div className="notice-error" role="status">{activityError}</div>}
          {loading ? <section className="panel loading-state" role="status"><span className="loading-indicator" />Loading your workspace…</section> : renderSection()}
          {activities.length > 0 && (
            <section className="panel activity-panel" aria-labelledby="activity-heading">
              <div className="panel-heading">
                <div><span className="eyebrow">TEAM VISIBILITY</span><h2 id="activity-heading">Workplace updates</h2></div>
                <span className="activity-live"><span aria-hidden="true" /> Updates every 15 seconds</span>
              </div>
              <ul className="activity-list">
                {activities.slice(0, 5).map((activity) => (
                  <li key={activity._id}>
                    <span className={`activity-marker activity-${activity.category}`} aria-hidden="true">•</span>
                    <span className="activity-message">{activity.message}<small>{role === 'Employee' ? `${activity.actorRole.toUpperCase()} TEAM` : `${activity.actorRole.toUpperCase()} · ${activity.actorEmail}`}</small></span>
                    <time dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleString()}</time>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <footer className="workspace-footer"><span>Northstar People Platform</span><span>Secure, role-based workspace</span></footer>
        </div>
      </main>
    </div>
  )
}
