import { Link, Navigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { useAuth } from '@/features/auth/application/useAuth'
import { AuthCard } from '@/features/auth/presentation/AuthCard'
import { ForgotPasswordForm } from '@/features/auth/presentation/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  const { status } = useAuth()
  if (status === 'authenticated') return <Navigate to={routes.account} replace />

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you signed up with and we will send you a reset link."
      footer={
        <p>
          <Link to={routes.login} className="text-foreground underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}
