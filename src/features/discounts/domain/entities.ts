import { z } from 'zod'

import type { ISODateString } from '@/types/common'

export type DiscountType = 'percent' | 'fixed'

export interface DiscountCode {
  id: string
  code: string
  type: DiscountType
  value: number
  minSubtotal: number
  maxUses: number | null
  usedCount: number
  startsAt: ISODateString | null
  endsAt: ISODateString | null
  isActive: boolean
  createdAt: ISODateString
}

export interface DiscountInput {
  code: string
  type: DiscountType
  value: number
  minSubtotal: number
  maxUses: number | null
  startsAt: ISODateString | null
  endsAt: ISODateString | null
  isActive: boolean
}

/** Result of validating a code against a cart subtotal. */
export interface AppliedDiscount {
  code: string
  type: DiscountType
  value: number
  amount: number
}

export interface DiscountRepository {
  /** Storefront: throws AppError('validation', reason) when the code cannot be applied. */
  validate(code: string, subtotal: number): Promise<AppliedDiscount>
  // Admin
  list(): Promise<DiscountCode[]>
  create(input: DiscountInput): Promise<DiscountCode>
  update(id: string, input: DiscountInput): Promise<DiscountCode>
  remove(id: string): Promise<void>
}

export const discountFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Code must be at least 3 characters.')
      .max(20)
      .regex(/^[A-Z0-9-]+$/, 'Uppercase letters, numbers and hyphens only.'),
    type: z.enum(['percent', 'fixed']),
    value: z.coerce.number().positive('Enter a value greater than zero.'),
    minSubtotal: z.coerce.number().min(0),
    maxUses: z.coerce.number().int().min(1).nullable(),
    startsAt: z.string().nullable(),
    endsAt: z.string().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.type === 'percent' && v.value > 100) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percent cannot exceed 100.' })
    }
    if (v.startsAt && v.endsAt && v.startsAt > v.endsAt) {
      ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'End must be after start.' })
    }
  })
export type DiscountFormValues = z.infer<typeof discountFormSchema>

export function computeDiscountAmount(
  code: Pick<DiscountCode, 'type' | 'value'>,
  subtotal: number,
): number {
  const raw = code.type === 'percent' ? (subtotal * code.value) / 100 : code.value
  return Math.round(Math.min(raw, subtotal) * 100) / 100
}

/** Pure eligibility check shared by mock and backend contracts. Returns a reason or null. */
export function discountIneligibleReason(
  code: DiscountCode,
  subtotal: number,
  now: Date = new Date(),
): string | null {
  if (!code.isActive) return 'This code is no longer active.'
  if (code.startsAt && new Date(code.startsAt) > now) return 'This code is not active yet.'
  if (code.endsAt && new Date(code.endsAt) < now) return 'This code has expired.'
  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return 'This code has reached its usage limit.'
  }
  if (subtotal < code.minSubtotal) return 'Add more to reach the minimum order for this code.'
  return null
}
