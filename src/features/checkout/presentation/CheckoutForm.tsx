import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { useAuth } from '@/features/auth/application/useAuth'
import type { AuthUser } from '@/features/auth/domain/entities'
import { useStoreSettings } from '@/features/checkout/application/useStoreSettings'
import { checkoutDefaults, checkoutSchema } from '@/features/checkout/domain/schema'
import type { CheckoutFormValues } from '@/features/checkout/domain/schema'
import type { StoreSettings } from '@/features/settings/domain/entities'
import { getErrorMessage } from '@/lib/errors'
import { formatPrice } from '@/lib/format'

import { CheckoutContactFields } from './CheckoutContactFields'
import { CheckoutPaymentFields } from './CheckoutPaymentFields'
import type { GcashCheckoutDetails } from './CheckoutPaymentFields'
import { CheckoutShippingFields } from './CheckoutShippingFields'

interface CheckoutFormProps {
  total: number
  onSubmit: (values: CheckoutFormValues) => void
  isSubmitting: boolean
  submitError?: unknown
  /** Blocks submission (e.g. the cart has unavailable items). */
  disabledReason?: string | null
}

/** GCash is offered only once the owner has switched it on and uploaded the QR image. */
function gcashDetails(settings: StoreSettings | undefined): GcashCheckoutDetails | null {
  if (!settings?.gcashEnabled || !settings.gcashQrUrl) return null
  return {
    accountName: settings.gcashAccountName,
    number: settings.gcashNumber,
    qrUrl: settings.gcashQrUrl,
  }
}

function buildDefaults(user: AuthUser | null): CheckoutFormValues {
  if (!user) return checkoutDefaults
  const address = user.addresses.find((entry) => entry.isDefault) ?? user.addresses[0]
  return {
    ...checkoutDefaults,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    addressLine: address?.addressLine ?? '',
    barangay: address?.barangay ?? '',
    city: address?.city ?? '',
    province: address?.province ?? '',
    postalCode: address?.postalCode ?? '',
    deliveryInstructions: address?.deliveryInstructions ?? '',
  }
}

export function CheckoutForm({
  total,
  onSubmit,
  isSubmitting,
  submitError,
  disabledReason = null,
}: CheckoutFormProps) {
  const { user, status } = useAuth()
  const settings = useStoreSettings()
  const defaults = useMemo(() => buildDefaults(user), [user])

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: defaults,
    mode: 'onTouched',
  })

  // Prefill once the session resolves, but never clobber what the user already typed.
  // Skipped on mount: the initial defaults are already in the form, and resetting would
  // undo the payment-method fallback chosen by CheckoutPaymentFields in the same commit.
  const appliedDefaults = useRef(defaults)
  useEffect(() => {
    if (appliedDefaults.current === defaults) return
    appliedDefaults.current = defaults
    if (!form.formState.isDirty) form.reset(defaults)
  }, [defaults, form])

  const authResolving = status === 'loading'
  const disabled = isSubmitting || authResolving || disabledReason !== null

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-12"
        aria-busy={isSubmitting || undefined}
      >
        <CheckoutContactFields />
        <CheckoutShippingFields key={user?.id ?? 'guest'} savedAddresses={user?.addresses ?? []} />
        <CheckoutPaymentFields
          codEnabled={settings.data?.codEnabled ?? true}
          onlinePaymentEnabled={settings.data?.onlinePaymentEnabled ?? true}
          gcash={gcashDetails(settings.data)}
          total={total}
        />

        {submitError ? (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-3 rounded-md border p-4 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              {getErrorMessage(submitError, 'We could not place your order. Please try again.')}
            </p>
          </div>
        ) : null}

        <div className="space-y-3">
          <Button type="submit" size="lg" className="min-h-12 w-full text-base" disabled={disabled}>
            {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {isSubmitting ? 'Placing order…' : `Place order · ${formatPrice(total)}`}
          </Button>
          {disabledReason ? (
            <p className="text-muted-foreground text-center text-sm" role="status">
              {disabledReason}
            </p>
          ) : null}
          <p className="text-muted-foreground text-center text-xs">
            Final prices and stock are confirmed by the store when your order is placed.
          </p>
        </div>
      </form>
    </Form>
  )
}
