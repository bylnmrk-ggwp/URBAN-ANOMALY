import { Link, Navigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { useAuth } from '@/features/auth/application/useAuth'
import { AuthCard } from '@/features/auth/presentation/AuthCard'
import { RegisterForm } from '@/features/auth/presentation/RegisterForm'

export default function RegisterPage() {
  const { status } = useAuth()
  if (status === 'authenticated') return <Navigate to={routes.account} replace />

  return (
    <AuthCard
      title="Create your account"
      description="Save your details for faster checkout and order tracking."
      footer={
        <p>
          Already have an account?{' '}
          <Link to={routes.login} className="text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  )
}
