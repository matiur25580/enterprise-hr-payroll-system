export type Role = 'Admin' | 'HR' | 'Employee'

export type UserSession = {
  token: string
  role: Role
  email: string
  name: string
}

export const getRole = (): Role => {
  const role = localStorage.getItem('role')?.toLowerCase()
  if (role === 'admin') return 'Admin'
  if (role === 'hr') return 'HR'
  return 'Employee'
}

export const getUserEmail = () => localStorage.getItem('userEmail') || ''
export const canDelete = () => getRole() === 'Admin'
export const canEdit = () => getRole() === 'Admin' || getRole() === 'HR'
export const canAdd = () => getRole() === 'Admin' || getRole() === 'HR'
