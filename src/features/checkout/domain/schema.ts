import { z } from 'zod'

import { GCASH_REFERENCE_MESSAGE, isValidGcashReference } from '@/features/orders/domain/rules'

const phMobile = /^(09\d{9}|\+639\d{9})$/

export const checkoutSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Enter your full name.').max(80),
    email: z.email('Enter a valid email address.'),
    phone: z
      .string()
      .trim()
      .regex(phMobile, 'Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).'),
    addressLine: z.string().trim().min(5, 'Enter your street address.').max(160),
    barangay: z.string().trim().min(2, 'Enter your barangay.').max(80),
    city: z.string().trim().min(2, 'Enter your city or municipality.').max(80),
    province: z.string().trim().min(2, 'Enter your province.').max(80),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{4}$/, 'Postal code must be 4 digits.'),
    deliveryInstructions: z.string().trim().max(300),
    paymentMethod: z.enum(['cod', 'online', 'gcash'], { message: 'Choose a payment method.' }),
    /** GCash reference number from the buyer's receipt; only meaningful for `gcash`. */
    paymentReference: z.string().trim().max(40),
    customerNote: z.string().trim().max(300),
  })
  .superRefine((values, ctx) => {
    if (values.paymentMethod !== 'gcash') return
    if (!isValidGcashReference(values.paymentReference)) {
      ctx.addIssue({ code: 'custom', path: ['paymentReference'], message: GCASH_REFERENCE_MESSAGE })
    }
  })

export type CheckoutFormValues = z.infer<typeof checkoutSchema>

export const checkoutDefaults: CheckoutFormValues = {
  fullName: '',
  email: '',
  phone: '',
  addressLine: '',
  barangay: '',
  city: '',
  province: '',
  postalCode: '',
  deliveryInstructions: '',
  paymentMethod: 'cod',
  paymentReference: '',
  customerNote: '',
}
