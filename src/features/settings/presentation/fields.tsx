import type { ReactNode } from 'react'
import type { FieldPath, UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import type { StoreSettingsFormValues, storeSettingsSchema } from '../domain/entities'

export type StoreSettingsFormInput = z.input<typeof storeSettingsSchema>
export type SettingsFormApi = UseFormReturn<
  StoreSettingsFormInput,
  unknown,
  StoreSettingsFormValues
>

type NumberFieldName = Extract<
  FieldPath<StoreSettingsFormInput>,
  'flatShippingFee' | 'freeShippingThreshold' | 'defaultLowStockThreshold'
>
type SwitchFieldName = Extract<
  FieldPath<StoreSettingsFormInput>,
  | 'codEnabled'
  | 'onlinePaymentEnabled'
  | 'notifyNewOrders'
  | 'notifyLowStock'
  | 'notifyPaymentEvents'
>

/** Coerced numeric fields are `unknown` on the input side; keep the input controlled. */
function inputValue(value: unknown): string | number {
  return typeof value === 'number' || typeof value === 'string' ? value : ''
}

interface NumberFieldProps {
  form: SettingsFormApi
  name: NumberFieldName
  label: string
  description?: string
  prefix?: string
  step?: number | string
}

export function NumberField({
  form,
  name,
  label,
  description,
  prefix,
  step = 1,
}: NumberFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="relative">
            {prefix ? (
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                {prefix}
              </span>
            ) : null}
            <FormControl>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step={step}
                className={prefix ? 'pl-7 tabular-nums' : 'tabular-nums'}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={inputValue(field.value)}
                onChange={(e) => field.onChange(e.target.value)}
              />
            </FormControl>
          </div>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

interface SwitchRowProps {
  form: SettingsFormApi
  name: SwitchFieldName
  label: string
  description?: string
  trailing?: ReactNode
}

export function SwitchRow({ form, name, label, description, trailing }: SwitchRowProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <FormLabel>{label}</FormLabel>
              {trailing}
            </div>
            {description ? (
              <FormDescription className="text-xs">{description}</FormDescription>
            ) : null}
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  )
}
