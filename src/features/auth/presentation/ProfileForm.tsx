import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

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
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/application/useAuth'
import { profileSchema } from '@/features/auth/domain/entities'
import type { ProfileFormValues } from '@/features/auth/domain/entities'
import { getErrorMessage } from '@/lib/errors'

export function ProfileForm() {
  const { user, updateProfile } = useAuth()

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? '', phone: user?.phone ?? '' },
  })

  useEffect(() => {
    if (user && !form.formState.isDirty) {
      form.reset({ fullName: user.fullName, phone: user.phone })
    }
  }, [user, form])

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync(values)
      form.reset(values)
      toast.success('Profile updated')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update your profile.'))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-lg space-y-5">
        <div className="grid gap-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            value={user?.email ?? ''}
            readOnly
            disabled
            className="min-h-11"
          />
          <p className="text-muted-foreground text-sm">
            Your email is your sign-in and cannot be changed here.
          </p>
        </div>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input autoComplete="name" className="min-h-11" {...field} />
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
                  inputMode="tel"
                  autoComplete="tel"
                  className="min-h-11"
                  {...field}
                />
              </FormControl>
              <FormDescription>Used by couriers to reach you about deliveries.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          className="min-h-11"
          disabled={updateProfile.isPending || !form.formState.isDirty}
        >
          {updateProfile.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Save changes
        </Button>
      </form>
    </Form>
  )
}
