import { zodResolver } from '@hookform/resolvers/zod'
import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/application/useAuth'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/features/auth/domain/entities'

import { SubmitButton } from './SubmitButton'

export function ForgotPasswordForm() {
  const { requestPasswordReset } = useAuth()
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async ({ email }: ForgotPasswordFormValues) => {
    // The outcome is deliberately not revealed so the form cannot be used to
    // probe which emails have accounts.
    await requestPasswordReset.mutateAsync(email).catch(() => undefined)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p role="status" className="bg-muted flex items-start gap-3 rounded-md border p-4 text-sm">
        <CircleCheck className="text-success mt-0.5 size-4 shrink-0" aria-hidden="true" />
        If an account exists for that email, we sent reset instructions.
      </p>
    )
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
        <SubmitButton isPending={requestPasswordReset.isPending}>Send reset link</SubmitButton>
      </form>
    </Form>
  )
}
