export const logAudit = (action: string, details: string) => {
  const role = localStorage.getItem('role') || 'Admin'
  const user = localStorage.getItem('userEmail') || 'unknown'
  const entry = { time: new Date().toLocaleString(), user, role, action, details }
  const logs = JSON.parse(localStorage.getItem('auditLogs') || '[]')
  logs.unshift(entry)
  localStorage.setItem('auditLogs', JSON.stringify(logs.slice(0,100)))
}
export const getAudits = () => JSON.parse(localStorage.getItem('auditLogs') || '[]')
