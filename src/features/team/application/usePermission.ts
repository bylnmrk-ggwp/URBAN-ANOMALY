import { useAuth } from '@/features/auth/application/useAuth'

import type { Permission } from '../domain/entities'
import { hasPermission } from '../domain/entities'

/**
 * UI-only permission check derived from the signed-in admin's sub-role. Hides controls the
 * role lacks; the backend (RLS / RPC guards) remains the real enforcement point.
 */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth()
  return hasPermission(user?.adminRole, permission)
}
