import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'

import { usePermission } from '../application/usePermission'
import type { Permission } from '../domain/entities'

interface RequirePermissionProps {
  permission: Permission
  children: ReactNode
}

/** Renders a 403 instead of the page when the admin's sub-role lacks the permission. */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const allowed = usePermission(permission)
  if (allowed) return children
  return (
    <div className="flex flex-col items-center gap-6 py-10">
      <ErrorState
        title="403 – You don't have access to this page"
        message="This area is reserved for store owners. Ask an owner to change your role if you need it."
        className="w-full max-w-lg"
      />
      <Button asChild variant="outline">
        <Link to={routes.admin.dashboard}>Back to dashboard</Link>
      </Button>
    </div>
  )
}
