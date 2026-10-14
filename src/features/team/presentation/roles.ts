import type { AdminRole } from '../domain/entities'

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: 'Owner',
  staff: 'Staff',
}

export function isAdminRole(value: string): value is AdminRole {
  return value === 'owner' || value === 'staff'
}
