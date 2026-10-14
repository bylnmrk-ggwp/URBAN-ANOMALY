import { Banknote, Check, Copy, CreditCard, QrCode } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { env } from '@/config/env'
import type { CheckoutFormValues } from '@/features/checkout/domain/schema'
import type { PaymentMethod } from '@/features/orders/domain/entities'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'

import { CheckoutTextField } from './CheckoutTextField'

/** Store-owned GCash details the buyer pays to; `null` hides the option altogether. */
export interface GcashCheckoutDetails {
  accountName: string
  number: string
  qrUrl: string
}

interface CheckoutPaymentFieldsProps {
  codEnabled: boolean
  onlinePaymentEnabled: boolean
  gcash: GcashCheckoutDetails | null
  /** Amount the buyer must send when paying through GCash. */
  total: number
}

interface PaymentOption {
  value: PaymentMethod
  title: string
  description: string
  icon: LucideIcon
  enabled: boolean
  /** Hidden rather than greyed out: the store has not set this method up at all. */
  hidden?: boolean
}

function CopyableText({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy. Select the text and copy it manually.')
    }
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="truncate font-medium select-all">{value}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-9 shrink-0"
        onClick={copy}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}

function GcashInstructions({ gcash, total }: { gcash: GcashCheckoutDetails; total: number }) {
  return (
    <div className="space-y-5 rounded-md border p-5" data-testid="gcash-instructions">
      <ol className="text-muted-foreground list-decimal space-y-1 pl-5 text-sm">
        <li>Open GCash and scan the QR code (or send to the number below).</li>
        <li>
          Send exactly <span className="text-foreground font-medium">{formatPrice(total)}</span>.
        </li>
        <li>Enter the reference number from your receipt and place the order.</li>
      </ol>
      <div className="bg-background mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-md border">
        <img src={gcash.qrUrl} alt="GCash QR code" className="size-full object-contain" />
      </div>
      <div className="divide-y rounded-md border px-4 *:py-3">
        <CopyableText label="Account name" value={gcash.accountName} />
        <CopyableText label="GCash number" value={gcash.number} />
        <CopyableText label="Amount to pay" value={formatPrice(total)} />
      </div>
      <CheckoutTextField
        name="paymentReference"
        label="GCash reference number"
        description="Found in your GCash receipt."
        placeholder="e.g. 1029384756123"
        autoComplete="off"
        inputMode="text"
      />
    </div>
  )
}

export function CheckoutPaymentFields({
  codEnabled,
  onlinePaymentEnabled,
  gcash,
  total,
}: CheckoutPaymentFieldsProps) {
  const { control, watch, setValue } = useFormContext<CheckoutFormValues>()
  const selected = watch('paymentMethod')
  const gcashAvailable = gcash !== null

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
    {
      value: 'gcash',
      title: 'GCash',
      description: 'Scan our QR code, pay, then enter your reference number.',
      icon: QrCode,
      enabled: gcashAvailable,
      hidden: !gcashAvailable,
    },
  ]

  // Keep the selection valid when the store disables the chosen method.
  useEffect(() => {
    const current = options.find((option) => option.value === selected)
    if (current?.enabled) return
    const fallback = options.find((option) => option.enabled)
    if (fallback) setValue('paymentMethod', fallback.value, { shouldValidate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- options derive from the three flags
  }, [selected, codEnabled, onlinePaymentEnabled, gcashAvailable, setValue])

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
                {options
                  .filter((option) => !option.hidden)
                  .map((option) => {
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
      {selected === 'gcash' && gcash ? <GcashInstructions gcash={gcash} total={total} /> : null}
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
