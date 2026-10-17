import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
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
import { verifyEmailSchema, type VerifyEmailFormValues } from '@/features/auth/domain/entities'
import { getErrorMessage } from '@/lib/errors'

import { SubmitButton } from './SubmitButton'

/** Seconds between resends, so a mistyped address cannot be used to spam a mailbox. */
const RESEND_COOLDOWN_SECONDS = 60

interface VerifyEmailFormProps {
  /** The address the code was sent to; collected on the previous screen. */
  email: string
}

export function VerifyEmailForm({ email }: VerifyEmailFormProps) {
  const { verifyEmail, resendVerificationCode } = useAuth()
  const navigate = useNavigate()
  const [cooldown, setCooldown] = useState(0)
  const [resent, setResent] = useState(false)

  const form = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: '' },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  const onSubmit = async ({ code }: VerifyEmailFormValues) => {
    try {
      const session = await verifyEmail.mutateAsync({ email, code })
      navigate(session.user.role === 'admin' ? routes.admin.dashboard : routes.account, {
        replace: true,
      })
    } catch {
      // Surfaced inline through verifyEmail.error.
      form.setValue('code', '', { shouldValidate: false })
    }
  }

  const onResend = async () => {
    setResent(false)
    // The outcome is deliberately not revealed: the screen must not confirm
    // whether an address has an account waiting on it.
    await resendVerificationCode.mutateAsync(email).catch(() => undefined)
    setCooldown(RESEND_COOLDOWN_SECONDS)
    setResent(true)
    form.setValue('code', '', { shouldValidate: false })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification code</FormLabel>
              <FormControl>
                <Input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="000000"
                  className="text-center font-mono text-2xl tracking-[0.4em]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                We sent a 6-digit code to {email}. It expires in an hour.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {verifyEmail.error ? (
          <p role="alert" className="text-destructive text-sm">
            {getErrorMessage(verifyEmail.error)}
          </p>
        ) : null}
        {resent ? (
          <p role="status" className="text-muted-foreground text-sm">
            If that address has an account waiting, a new code is on its way. The previous code no
            longer works.
          </p>
        ) : null}
        <SubmitButton isPending={verifyEmail.isPending}>Verify my account</SubmitButton>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={onResend}
          disabled={resendVerificationCode.isPending || cooldown > 0}
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Send me a new code'}
        </Button>
      </form>
    </Form>
  )
}
