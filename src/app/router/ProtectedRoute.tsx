import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { LoadingState } from '@/components/common/LoadingState'
import { useAuth } from '@/features/auth/application/useAuth'

import { routes } from './routes'
import { useSessionExpiredToast } from './useSessionExpiredToast'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()
  useSessionExpiredToast(status)

  if (status === 'loading') return <LoadingState fullPage />
  if (status !== 'authenticated') {
    return <Navigate to={routes.login} replace state={{ from: location }} />
  }
  return children
}
