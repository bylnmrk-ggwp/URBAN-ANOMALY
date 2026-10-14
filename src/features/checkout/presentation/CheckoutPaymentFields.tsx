import { Banknote, CreditCard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useFormContext } from 'react-hook-form'

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { env } from '@/config/env'
import type { CheckoutFormValues } from '@/features/checkout/domain/schema'
import type { PaymentMethod } from '@/features/orders/domain/entities'
import { cn } from '@/lib/utils'

import { CheckoutTextField } from './CheckoutTextField'

interface CheckoutPaymentFieldsProps {
  codEnabled: boolean
  onlinePaymentEnabled: boolean
}

interface PaymentOption {
  value: PaymentMethod
  title: string
  description: string
  icon: LucideIcon
  enabled: boolean
}

export function CheckoutPaymentFields({
  codEnabled,
  onlinePaymentEnabled,
}: CheckoutPaymentFieldsProps) {
  const { control, watch, setValue } = useFormContext<CheckoutFormValues>()
  const selected = watch('paymentMethod')

  const options: PaymentOption[] = [
    {
      value: 'cod',
      title: 'Cash on Delivery',
      description: 'Pay cash when your order arrives.',
      icon: Banknote,
      enabled: codEnabled,
    },
    {
      value: 'online',
      title: 'Online Payment',
      description: 'GCash, Maya, cards via PayMongo.',
      icon: CreditCard,
      enabled: onlinePaymentEnabled,
    },
  ]

  // Keep the selection valid when the store disables the chosen method.
  useEffect(() => {
    const current = options.find((option) => option.value === selected)
    if (current?.enabled) return
    const fallback = options.find((option) => option.enabled)
    if (fallback) setValue('paymentMethod', fallback.value, { shouldValidate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options derive from the two flags
  }, [selected, codEnabled, onlinePaymentEnabled, setValue])

  return (
    <fieldset className="space-y-5">
      <legend className="mb-5 text-xl font-semibold tracking-tight">Payment</legend>
      <FormField
        control={control}
        name="paymentMethod"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="sr-only">Payment method</FormLabel>
            <FormControl>
              <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                {options.map((option) => {
                  const checked = field.value === option.value
                  const inputId = `payment-${option.value}`
                  const Icon = option.icon
                  return (
                    <label
                      key={option.value}
                      htmlFor={inputId}
                      className={cn(
                        'flex items-start gap-3 rounded-md border p-4 transition-colors',
                        option.enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                        checked ? 'border-foreground' : 'hover:border-muted-foreground/50',
                      )}
                    >
                      <RadioGroupItem
                        id={inputId}
                        value={option.value}
                        disabled={!option.enabled}
                        className="mt-0.5"
                      />
                      <span className="flex-1 space-y-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="size-4" aria-hidden="true" />
                          {option.title}
                          {!option.enabled ? (
                            <span className="text-muted-foreground font-normal">
                              (currently unavailable)
                            </span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground block text-sm">
                          {option.description}
                        </span>
                        {option.value === 'online' && env.isMock && option.enabled ? (
                          <span className="text-muted-foreground block text-xs">
                            Payment integration pending — demo mode will create an order awaiting
                            payment.
                          </span>
                        ) : null}
                      </span>
                    </label>
                  )
                })}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <CheckoutTextField
        name="customerNote"
        label="Order note"
        multiline
        optional
        placeholder="Anything we should know about this order?"
      />
    </fieldset>
  )
}
