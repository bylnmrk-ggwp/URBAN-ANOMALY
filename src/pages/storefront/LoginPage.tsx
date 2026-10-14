import { Link, Navigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { useAuth } from '@/features/auth/application/useAuth'
import { AuthCard } from '@/features/auth/presentation/AuthCard'
import { LoginForm } from '@/features/auth/presentation/LoginForm'

export default function LoginPage() {
  const { status, isAdmin } = useAuth()
  if (status === 'authenticated') {
    return <Navigate to={isAdmin ? routes.admin.dashboard : routes.account} replace />
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to track orders and check out faster."
      footer={
        <>
          <p>
            <Link
              to={routes.forgotPassword}
              className="text-foreground underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
          <p>
            New here?{' '}
            <Link
              to={routes.register}
              className="text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  )
}
