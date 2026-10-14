import { z } from 'zod'

import type { ISODateString } from '@/types/common'

/**
 * Admin sub-roles. `owner` has every permission; `staff` runs day-to-day operations.
 * In Supabase mode this maps to a `profiles.admin_role` column enforced by RLS;
 * the matrix below only hides UI and must never be the sole check.
 */
export type AdminRole = 'owner' | 'staff'

export type Permission =
  | 'orders.manage'
  | 'products.manage'
  | 'inventory.manage'
  | 'customers.view'
  | 'content.edit'
  | 'content.publish'
  | 'theme.edit'
  | 'discounts.manage'
  | 'reviews.moderate'
  | 'returns.manage'
  | 'settings.edit'
  | 'team.manage'

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  owner: [
    'orders.manage',
    'products.manage',
    'inventory.manage',
    'customers.view',
    'content.edit',
    'content.publish',
    'theme.edit',
    'discounts.manage',
    'reviews.moderate',
    'returns.manage',
    'settings.edit',
    'team.manage',
  ],
  staff: [
    'orders.manage',
    'products.manage',
    'inventory.manage',
    'customers.view',
    'content.edit',
    'reviews.moderate',
    'returns.manage',
  ],
}

export function hasPermission(role: AdminRole | null | undefined, permission: Permission): boolean {
  return role ? ROLE_PERMISSIONS[role].includes(permission) : false
}

export interface TeamMember {
  id: string
  email: string
  fullName: string
  role: AdminRole
  status: 'active' | 'invited'
  lastActiveAt: ISODateString | null
  createdAt: ISODateString
}

export interface TeamRepository {
  list(): Promise<TeamMember[]>
  invite(input: { email: string; fullName: string; role: AdminRole }): Promise<TeamMember>
  updateRole(id: string, role: AdminRole): Promise<TeamMember>
  remove(id: string): Promise<void>
}

export const inviteSchema = z.object({
  email: z.email('Enter a valid email address.'),
  fullName: z.string().trim().min(2, 'Enter a name.').max(80),
  role: z.enum(['owner', 'staff']),
})
export type InviteFormValues = z.infer<typeof inviteSchema>
