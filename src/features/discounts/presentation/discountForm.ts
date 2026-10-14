import type { z } from 'zod'

import type { DiscountCode, DiscountInput, discountFormSchema } from '../domain/entities'

export type DiscountFormInput = z.input<typeof discountFormSchema>
export type DiscountFormOutput = z.output<typeof discountFormSchema>

/** ISO timestamp -> value accepted by `<input type="datetime-local">` (local time, minutes). */
export function toDateTimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** datetime-local value -> ISO timestamp (or null when empty / invalid). */
export function fromDateTimeLocal(local: string | null): string | null {
  if (!local) return null
  const d = new Date(local)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function emptyDiscountForm(): DiscountFormInput {
  return {
    code: '',
    type: 'percent',
    value: '',
    minSubtotal: 0,
    maxUses: null,
    startsAt: '',
    endsAt: '',
    isActive: true,
  }
}

export function discountToFormValues(discount: DiscountCode): DiscountFormInput {
  return {
    code: discount.code,
    type: discount.type,
    value: discount.value,
    minSubtotal: discount.minSubtotal,
    maxUses: discount.maxUses,
    startsAt: toDateTimeLocal(discount.startsAt),
    endsAt: toDateTimeLocal(discount.endsAt),
    isActive: discount.isActive,
  }
}

export function formValuesToDiscountInput(values: DiscountFormOutput): DiscountInput {
  return {
    code: values.code.toUpperCase(),
    type: values.type,
    value: values.value,
    minSubtotal: values.minSubtotal,
    maxUses: values.maxUses,
    startsAt: fromDateTimeLocal(values.startsAt),
    endsAt: fromDateTimeLocal(values.endsAt),
    isActive: values.isActive,
  }
}
