import { useEffect, useState } from 'preact/hooks'
import axios from 'axios'
import { apiUrl } from '../services/api'
import type { Role } from '../utils/role'

type Employee = { _id: string; name: string; email: string }
type CandidateStage = 'Applied' | 'Screening' | 'Interview' | 'Offer' | 'Hired' | 'Rejected'
type Candidate = {
  _id: string
  name: string
  email: string
  position: string
  source: string
  stage: CandidateStage
  createdAt: string
}
type OnboardingTask = {
  _id: string
  employeeName: string
  employeeEmail: string
  title: string
  dueDate?: string
  status: 'Pending' | 'Completed'
}
type Shift = {
  _id: string
  employeeName: string
  employeeEmail: string
  date: string
  startTime: string
  endTime: string
  notes: string
}
type TrainingRecord = {
  _id: string
  employeeName: string
  employeeEmail: string
  course: string
  provider: string
  dueDate?: string
  status: 'Assigned' | 'In Progress' | 'Completed'
}

const candidateStages: CandidateStage[] = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']

export default function PeopleOperations({
  employees,
  token,
  role,
  onNotify,
  onUnauthorized,
}: {
  employees: Employee[]
  token: string
  role: Role
  onNotify: (message: string) => void
  onUnauthorized: () => void
}) {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [tasks, setTasks] = useState<OnboardingTask[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [training, setTraining] = useState<TrainingRecord[]>([])
  const [candidateForm, setCandidateForm] = useState({ name: '', email: '', position: '', source: '' })
  const [taskForm, setTaskForm] = useState({ employeeId: '', title: '', dueDate: '' })
  const [shiftForm, setShiftForm] = useState({ employeeId: '', date: '', startTime: '', endTime: '', notes: '' })
  const [trainingForm, setTrainingForm] = useState({ employeeId: '', course: '', provider: '', dueDate: '' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [updatingId, setUpdatingId] = useState('')
  const [error, setError] = useState('')
  const isEmployee = role === 'Employee'

  useEffect(() => {
    let active = true
    const headers = { Authorization: `Bearer ${token}` }
    const load = async () => {
      const [taskResponse, candidateResponse, shiftResponse, trainingResponse] = await Promise.all([
        axios.get<OnboardingTask[]>(`${apiUrl}/api/people/onboarding`, { headers }),
        isEmployee ? Promise.resolve({ data: [] as Candidate[] }) : axios.get<Candidate[]>(`${apiUrl}/api/people/candidates`, { headers }),
        axios.get<Shift[]>(`${apiUrl}/api/people/shifts`, { headers }),
        axios.get<TrainingRecord[]>(`${apiUrl}/api/people/training`, { headers }),
      ])
      if (!active) return
      setTasks(taskResponse.data)
      setCandidates(candidateResponse.data)
      setShifts(shiftResponse.data)
      setTraining(trainingResponse.data)
    }
    void load().catch((requestError: unknown) => {
      if (!active) return
      if (axios.isAxiosError(requestError) && requestError.response?.status === 401) {
        onUnauthorized()
        return
      }
      setError('Could not load hiring and onboarding records. Please try again.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [token, isEmployee])

  const addCandidate = async (event: Event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await axios.post<Candidate>(`${apiUrl}/api/people/candidates`, candidateForm, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCandidates((current) => [response.data, ...current])
      setCandidateForm({ name: '', email: '', position: '', source: '' })
      onNotify(`${response.data.name} was added to the hiring pipeline.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not add candidate.')
      } else {
        setError('Could not add candidate. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const updateCandidateStage = async (candidate: Candidate, stage: CandidateStage) => {
    setUpdatingId(candidate._id)
    setError('')
    try {
      const response = await axios.patch<Candidate>(`${apiUrl}/api/people/candidates/${candidate._id}`, { stage }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setCandidates((current) => current.map((item) => item._id === candidate._id ? response.data : item))
      onNotify(`${candidate.name} moved to ${stage}.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not update candidate stage.')
      } else {
        setError('Could not update candidate stage. Please try again.')
      }
    } finally {
      setUpdatingId('')
    }
  }

  const addTask = async (event: Event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await axios.post<OnboardingTask>(`${apiUrl}/api/people/onboarding`, {
        ...taskForm,
        dueDate: taskForm.dueDate || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setTasks((current) => [...current, response.data].sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')))
      setTaskForm({ employeeId: '', title: '', dueDate: '' })
      onNotify(`Onboarding task assigned to ${response.data.employeeName}.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not assign onboarding task.')
      } else {
        setError('Could not assign onboarding task. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTask = async (task: OnboardingTask) => {
    setUpdatingId(task._id)
    setError('')
    const status = task.status === 'Completed' ? 'Pending' : 'Completed'
    try {
      const response = await axios.patch<OnboardingTask>(`${apiUrl}/api/people/onboarding/${task._id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTasks((current) => current.map((item) => item._id === task._id ? response.data : item))
      onNotify(`Onboarding task marked ${status.toLowerCase()}.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not update onboarding task.')
      } else {
        setError('Could not update onboarding task. Please try again.')
      }
    } finally {
      setUpdatingId('')
    }
  }

  const addShift = async (event: Event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await axios.post<Shift>(`${apiUrl}/api/people/shifts`, shiftForm, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setShifts((current) => [...current, response.data].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)))
      setShiftForm({ employeeId: '', date: '', startTime: '', endTime: '', notes: '' })
      onNotify(`Shift scheduled for ${response.data.employeeName}.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not schedule shift.')
      } else {
        setError('Could not schedule shift. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const addTraining = async (event: Event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const response = await axios.post<TrainingRecord>(`${apiUrl}/api/people/training`, {
        ...trainingForm,
        dueDate: trainingForm.dueDate || undefined,
      }, { headers: { Authorization: `Bearer ${token}` } })
      setTraining((current) => [...current, response.data])
      setTrainingForm({ employeeId: '', course: '', provider: '', dueDate: '' })
      onNotify(`Training assigned to ${response.data.employeeName}.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not assign training.')
      } else {
        setError('Could not assign training. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const updateTrainingStatus = async (record: TrainingRecord, status: TrainingRecord['status']) => {
    setUpdatingId(record._id)
    setError('')
    try {
      const response = await axios.patch<TrainingRecord>(`${apiUrl}/api/people/training/${record._id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTraining((current) => current.map((item) => item._id === record._id ? response.data : item))
      onNotify(`${record.course} training marked ${status.toLowerCase()}.`)
    } catch (requestError) {
      if (axios.isAxiosError<{ message?: string }>(requestError)) {
        if (requestError.response?.status === 401) return onUnauthorized()
        setError(requestError.response?.data?.message ?? 'Could not update training status.')
      } else {
        setError('Could not update training status. Please try again.')
      }
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <section className="people-operations-workspace">
      {!isEmployee && (
        <>
          <form className="people-operation-form" onSubmit={addCandidate}>
            <div><span className="eyebrow">TALENT ACQUISITION</span><h2>Add candidate</h2></div>
            <label>Full name<input value={candidateForm.name} maxLength={120} minLength={2} onInput={(event) => setCandidateForm({ ...candidateForm, name: event.currentTarget.value })} required /></label>
            <label>Email<input type="email" value={candidateForm.email} maxLength={254} onInput={(event) => setCandidateForm({ ...candidateForm, email: event.currentTarget.value })} required /></label>
            <label>Position<input value={candidateForm.position} maxLength={120} minLength={2} onInput={(event) => setCandidateForm({ ...candidateForm, position: event.currentTarget.value })} required /></label>
            <label>Source<input value={candidateForm.source} maxLength={120} onInput={(event) => setCandidateForm({ ...candidateForm, source: event.currentTarget.value })} placeholder="Referral, careers site…" /></label>
            <button className="primary-button" type="submit" disabled={submitting}>{submitting ? 'Adding…' : 'Add to pipeline'}</button>
          </form>
          <section className="pipeline-panel">
            <div className="panel-heading"><div><span className="eyebrow">RECRUITING WORKFLOW</span><h2>Candidate pipeline <span className="count-pill">{candidates.length}</span></h2></div></div>
            {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading candidates…</div>
              : candidates.length ? (
                <div className="candidate-list">
                  {candidates.map((candidate) => (
                    <article className="candidate-card" key={candidate._id}>
                      <div><strong>{candidate.name}</strong><small>{candidate.position} · {candidate.email}</small><small>{candidate.source || 'Source not recorded'} · Added {new Date(candidate.createdAt).toLocaleDateString()}</small></div>
                      <label>Stage<select value={candidate.stage} disabled={updatingId === candidate._id} onChange={(event) => void updateCandidateStage(candidate, event.currentTarget.value as CandidateStage)}>{candidateStages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
                    </article>
                  ))}
                </div>
              ) : <p className="table-empty">No candidates yet. Add a candidate to start the hiring pipeline.</p>}
          </section>
        </>
      )}

      {!isEmployee && (
        <form className="people-operation-form onboarding-form" onSubmit={addTask}>
          <div><span className="eyebrow">EMPLOYEE LIFECYCLE</span><h2>Assign onboarding task</h2></div>
          <label>Employee<select value={taskForm.employeeId} onChange={(event) => setTaskForm({ ...taskForm, employeeId: event.currentTarget.value })} required>
            <option value="">Select employee</option>
            {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} · {employee.email}</option>)}
          </select></label>
          <label>Task<input value={taskForm.title} maxLength={160} minLength={3} onInput={(event) => setTaskForm({ ...taskForm, title: event.currentTarget.value })} placeholder="Complete tax and payroll setup" required /></label>
          <label>Due date<input type="date" value={taskForm.dueDate} onInput={(event) => setTaskForm({ ...taskForm, dueDate: event.currentTarget.value })} /></label>
          <button className="primary-button" type="submit" disabled={submitting || employees.length === 0}>{submitting ? 'Assigning…' : 'Assign task'}</button>
        </form>
      )}

      <section className="onboarding-panel">
        <div className="panel-heading"><div><span className="eyebrow">GETTING STARTED</span><h2>{isEmployee ? 'My onboarding checklist' : 'Onboarding progress'} <span className="count-pill">{tasks.filter((task) => task.status === 'Completed').length}/{tasks.length}</span></h2></div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading onboarding checklist…</div>
          : tasks.length ? (
            <ul className="onboarding-task-list">
              {tasks.map((task) => (
                <li key={task._id} className={task.status === 'Completed' ? 'task-completed' : ''}>
                  <span className="task-check" aria-hidden="true">{task.status === 'Completed' ? '✓' : '○'}</span>
                  <span className="task-details"><strong>{task.title}</strong><small>{!isEmployee && `${task.employeeName} · ${task.employeeEmail} · `}{task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'No due date'}</small></span>
                  <button className="table-action" type="button" disabled={updatingId === task._id} onClick={() => void toggleTask(task)}>{updatingId === task._id ? 'Saving…' : task.status === 'Completed' ? 'Reopen' : 'Complete'}</button>
                </li>
              ))}
            </ul>
          ) : <p className="table-empty">{isEmployee ? 'Your HR team has not assigned any onboarding tasks.' : 'No onboarding tasks have been assigned.'}</p>}
      </section>

      {!isEmployee && (
        <form className="people-operation-form" onSubmit={addShift}>
          <div><span className="eyebrow">WORKFORCE PLANNING</span><h2>Schedule a shift</h2></div>
          <label>Employee<select value={shiftForm.employeeId} onChange={(event) => setShiftForm({ ...shiftForm, employeeId: event.currentTarget.value })} required>
            <option value="">Select employee</option>
            {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
          </select></label>
          <label>Date<input type="date" value={shiftForm.date} onInput={(event) => setShiftForm({ ...shiftForm, date: event.currentTarget.value })} required /></label>
          <label>Start time<input type="time" value={shiftForm.startTime} onInput={(event) => setShiftForm({ ...shiftForm, startTime: event.currentTarget.value })} required /></label>
          <label>End time<input type="time" value={shiftForm.endTime} onInput={(event) => setShiftForm({ ...shiftForm, endTime: event.currentTarget.value })} required /></label>
          <label>Notes<input value={shiftForm.notes} maxLength={500} onInput={(event) => setShiftForm({ ...shiftForm, notes: event.currentTarget.value })} /></label>
          <button className="primary-button" type="submit" disabled={submitting || employees.length === 0}>{submitting ? 'Scheduling…' : 'Schedule shift'}</button>
        </form>
      )}
      <section className="onboarding-panel">
        <div className="panel-heading"><div><span className="eyebrow">SHIFT ROTA</span><h2>{isEmployee ? 'My upcoming shifts' : 'Scheduled shifts'} <span className="count-pill">{shifts.length}</span></h2></div></div>
        {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading shifts…</div>
          : shifts.length ? <div className="operation-record-list">{shifts.map((shift) => (
            <article key={shift._id}>
              <strong>{new Date(`${shift.date}T00:00:00`).toLocaleDateString()} · {shift.startTime}–{shift.endTime}{shift.endTime < shift.startTime ? ' (overnight)' : ''}</strong>
              <small>{!isEmployee && `${shift.employeeName} · ${shift.employeeEmail} · `}{shift.notes || 'No notes'}</small>
            </article>
          ))}</div> : <p className="table-empty">{isEmployee ? 'No shifts have been scheduled for you.' : 'No shifts have been scheduled.'}</p>}
      </section>

      {!isEmployee && (
        <form className="people-operation-form" onSubmit={addTraining}>
          <div><span className="eyebrow">LEARNING & DEVELOPMENT</span><h2>Assign training</h2></div>
          <label>Employee<select value={trainingForm.employeeId} onChange={(event) => setTrainingForm({ ...trainingForm, employeeId: event.currentTarget.value })} required>
            <option value="">Select employee</option>
            {employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}
          </select></label>
          <label>Course<input value={trainingForm.course} minLength={2} maxLength={160} onInput={(event) => setTrainingForm({ ...trainingForm, course: event.currentTarget.value })} required /></label>
          <label>Provider<input value={trainingForm.provider} maxLength={120} onInput={(event) => setTrainingForm({ ...trainingForm, provider: event.currentTarget.value })} /></label>
          <label>Due date<input type="date" value={trainingForm.dueDate} onInput={(event) => setTrainingForm({ ...trainingForm, dueDate: event.currentTarget.value })} /></label>
          <button className="primary-button" type="submit" disabled={submitting || employees.length === 0}>{submitting ? 'Assigning…' : 'Assign training'}</button>
        </form>
      )}
      <section className="onboarding-panel">
        <div className="panel-heading"><div><span className="eyebrow">LEARNING & DEVELOPMENT</span><h2>{isEmployee ? 'My training records' : 'Training records'} <span className="count-pill">{training.length}</span></h2></div></div>
        {loading ? <div className="loading-state" role="status"><span className="loading-indicator" />Loading training records…</div>
          : training.length ? <div className="operation-record-list">{training.map((record) => (
            <article key={record._id}>
              <div><strong>{record.course}</strong><small>{!isEmployee && `${record.employeeName} · ${record.employeeEmail} · `}{record.provider || 'Provider not recorded'}{record.dueDate ? ` · Due ${new Date(record.dueDate).toLocaleDateString()}` : ''}</small></div>
              <select aria-label={`Training status for ${record.course}`} value={record.status} disabled={updatingId === record._id} onChange={(event) => void updateTrainingStatus(record, event.currentTarget.value as TrainingRecord['status'])}>
                <option>Assigned</option><option>In Progress</option><option>Completed</option>
              </select>
            </article>
          ))}</div> : <p className="table-empty">{isEmployee ? 'No training has been assigned to you.' : 'No training records have been created.'}</p>}
      </section>
    </section>
  )
}
