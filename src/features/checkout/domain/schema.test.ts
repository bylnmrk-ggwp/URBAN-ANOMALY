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

  it('ignores the reference number unless GCash is chosen', () => {
    expect(checkoutSchema.safeParse({ ...valid, paymentReference: '' }).success).toBe(true)
    expect(
      checkoutSchema.safeParse({ ...valid, paymentMethod: 'online', paymentReference: '' }).success,
    ).toBe(true)
  })

  it('requires a well-formed GCash reference number for GCash orders', () => {
    const gcash = { ...valid, paymentMethod: 'gcash' as const }

    const missing = checkoutSchema.safeParse({ ...gcash, paymentReference: '' })
    expect(missing.success).toBe(false)
    if (!missing.success) {
      expect(missing.error.issues.map((i) => i.path[0])).toEqual(['paymentReference'])
    }

    expect(checkoutSchema.safeParse({ ...gcash, paymentReference: '1234567' }).success).toBe(false)
    expect(checkoutSchema.safeParse({ ...gcash, paymentReference: '1234 5678 90' }).success).toBe(
      false,
    )

    const trimmed = checkoutSchema.safeParse({ ...gcash, paymentReference: ' 1029384756123 ' })
    expect(trimmed.success).toBe(true)
    if (trimmed.success) expect(trimmed.data.paymentReference).toBe('1029384756123')
  })
})
