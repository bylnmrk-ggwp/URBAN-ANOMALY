import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/application/useAuth'
import { registerSchema, type RegisterFormValues } from '@/features/auth/domain/entities'
import { getErrorMessage } from '@/lib/errors'
import type { VerifyEmailLocationState } from '@/pages/storefront/VerifyEmailPage'

import { SubmitButton } from './SubmitButton'

/** Creates buyer accounts only; staff roles are granted server-side. */
export function RegisterForm() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async ({ fullName, email, phone, password }: RegisterFormValues) => {
    try {
      const result = await signUp.mutateAsync({ fullName, email, phone, password })
      if (result.status === 'verification_required') {
        const state: VerifyEmailLocationState = { email: result.email }
        navigate(routes.verifyEmail, { replace: true, state })
        return
      }
      navigate(routes.account, { replace: true })
    } catch {
      // Surfaced inline through signUp.error.
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mobile number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="09XXXXXXXXX"
                  {...field}
                />
              </FormControl>
              <FormDescription>Used by the courier for delivery updates.</FormDescription>
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
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {signUp.error ? (
          <p role="alert" className="text-destructive text-sm">
            {getErrorMessage(signUp.error)}
          </p>
        ) : null}
        <SubmitButton isPending={signUp.isPending}>Create account</SubmitButton>
      </form>
    </Form>
  )
}
