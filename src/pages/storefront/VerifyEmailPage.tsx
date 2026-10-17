import { Link, Navigate, useLocation } from 'react-router'

import { routes } from '@/app/router/routes'
import { useAuth } from '@/features/auth/application/useAuth'
import { AuthCard } from '@/features/auth/presentation/AuthCard'
import { VerifyEmailForm } from '@/features/auth/presentation/VerifyEmailForm'

/** Router state set by the screen that triggered the code: sign-up, or sign-in on an unverified account. */
export interface VerifyEmailLocationState {
  email?: string
}

export default function VerifyEmailPage() {
  const { status } = useAuth()
  const location = useLocation()
  const email = (location.state as VerifyEmailLocationState | null)?.email?.trim()

  if (status === 'authenticated') return <Navigate to={routes.account} replace />
  // The address is carried in router state rather than the URL, so arriving here
  // directly leaves nothing to verify against.
  if (!email) return <Navigate to={routes.register} replace />

  return (
    <AuthCard
      title="Verify your account"
      description="Enter the code we emailed you to finish setting up your account."
      footer={
        <p>
          Wrong address?{' '}
          <Link to={routes.register} className="text-foreground underline-offset-4 hover:underline">
            Start over
          </Link>
        </p>
      }
    >
      <VerifyEmailForm email={email} />
    </AuthCard>
  )
}
