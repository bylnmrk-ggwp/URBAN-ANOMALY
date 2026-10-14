import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'

import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/application/useAuth'

import { routes } from './routes'
import { useSessionExpiredToast } from './useSessionExpiredToast'

/**
 * Gates the admin area. The role comes from the auth repository's resolved
 * profile (never client storage). Buyers see an explicit 403 rather than a
 * silent redirect so they understand why the page is unavailable.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const location = useLocation()
  useSessionExpiredToast(status)

  if (status === 'loading') return <LoadingState fullPage />
  if (status !== 'authenticated' || !user) {
    return <Navigate to={routes.login} replace state={{ from: location }} />
  }
  if (user.role !== 'admin') {
    return (
      <div className="container-x flex min-h-screen flex-col items-center justify-center gap-6 py-16">
        <ErrorState
          title="403 – You don't have access to the admin area"
          message="This section is reserved for store staff. If you believe this is a mistake, contact the store owner."
          className="w-full max-w-lg"
        />
        <Button asChild variant="outline">
          <Link to={routes.home}>Back to store</Link>
        </Button>
      </div>
    )
  }
  return children
}
