import { z } from 'zod'

/** Guest order lookup: both fields must match the order on record. */
export const trackOrderSchema = z.object({
  orderNumber: z
    .string()
    .trim()
    .min(1, 'Enter your order number.')
    .max(40, 'That order number looks too long.')
    .transform((value) => value.toUpperCase()),
  email: z.email('Enter a valid email address.').trim(),
})

export type TrackOrderFormValues = z.input<typeof trackOrderSchema>
export type TrackOrderInput = z.output<typeof trackOrderSchema>
