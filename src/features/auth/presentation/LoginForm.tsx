import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate, type Location } from 'react-router'

import { routes } from '@/app/router/routes'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { env } from '@/config/env'
import { useAuth } from '@/features/auth/application/useAuth'
import { loginSchema, type LoginFormValues } from '@/features/auth/domain/entities'
import { getErrorMessage } from '@/lib/errors'

import { DemoAccounts } from './DemoAccounts'
import { SubmitButton } from './SubmitButton'

interface LoginLocationState {
  from?: Location
}

export function LoginForm() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LoginLocationState | null)?.from

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const session = await signIn.mutateAsync(values)
      if (from) {
        navigate(`${from.pathname}${from.search}`, { replace: true })
        return
      }
      navigate(session.user.role === 'admin' ? routes.admin.dashboard : routes.account, {
        replace: true,
      })
    } catch {
      // Surfaced inline through signIn.error.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {signIn.error ? (
          <p role="alert" className="text-destructive text-sm">
            {getErrorMessage(signIn.error)}
          </p>
        ) : null}
        <SubmitButton isPending={signIn.isPending}>Sign in</SubmitButton>
      </form>
      {env.isMock ? (
        <DemoAccounts
          onUse={(email, password) => {
            form.setValue('email', email, { shouldValidate: true })
            form.setValue('password', password, { shouldValidate: true })
          }}
        />
      ) : null}
    </Form>
  )
}
