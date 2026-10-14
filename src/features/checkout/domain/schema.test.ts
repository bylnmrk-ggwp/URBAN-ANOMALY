import { describe, expect, it } from 'vitest'

import { checkoutDefaults, checkoutSchema } from './schema'

const valid = {
  ...checkoutDefaults,
  fullName: 'Maria Santos',
  email: 'maria@example.com',
  phone: '09171234567',
  addressLine: '12 Mabini St.',
  barangay: 'San Antonio',
  city: 'Pasig',
  province: 'Metro Manila',
  postalCode: '1605',
  paymentMethod: 'cod' as const,
}

describe('checkoutSchema', () => {
  it('accepts a complete PH address with COD', () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts +63 mobile numbers', () => {
    expect(checkoutSchema.safeParse({ ...valid, phone: '+639171234567' }).success).toBe(true)
  })

  it('rejects malformed phone, postal code and email', () => {
    const result = checkoutSchema.safeParse({
      ...valid,
      phone: '12345',
      postalCode: '16',
      email: 'nope',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0])
      expect(paths).toEqual(expect.arrayContaining(['phone', 'postalCode', 'email']))
    }
  })

  it('requires a payment method', () => {
    const result = checkoutSchema.safeParse({ ...valid, paymentMethod: 'cheque' })
    expect(result.success).toBe(false)
  })
})
