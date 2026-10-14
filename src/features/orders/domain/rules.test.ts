import { describe, expect, it } from 'vitest'

import {
  canCustomerCancel,
  canTransition,
  generateOrderNumber,
  getAvailableAdminActions,
  getProgressIndex,
  initialPaymentStatusFor,
  initialStatusFor,
  isPrepaidMethod,
  isTerminalStatus,
  isValidGcashReference,
} from './rules'

describe('order status transitions', () => {
  it('follows the fulfillment map', () => {
    expect(canTransition('pending_confirmation', 'confirmed')).toBe(true)
    expect(canTransition('confirmed', 'processing')).toBe(true)
    expect(canTransition('processing', 'shipped')).toBe(true)
    expect(canTransition('shipped', 'delivered')).toBe(true)
    expect(canTransition('shipped', 'cancelled')).toBe(false)
    expect(canTransition('delivered', 'processing')).toBe(false)
    expect(canTransition('cancelled', 'confirmed')).toBe(false)
  })

  it('marks delivered and cancelled as terminal', () => {
    expect(isTerminalStatus('delivered')).toBe(true)
    expect(isTerminalStatus('cancelled')).toBe(true)
    expect(isTerminalStatus('shipped')).toBe(false)
  })

  it('offers only valid admin actions', () => {
    const actions = getAvailableAdminActions({
      status: 'pending_confirmation',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
    }).map((a) => a.status)
    expect(actions).toEqual(['confirmed', 'cancelled'])
  })

  it('never lets an admin confirm an unpaid online order', () => {
    const unpaid = getAvailableAdminActions({
      status: 'pending_confirmation',
      paymentMethod: 'online',
      paymentStatus: 'pending',
    }).map((a) => a.status)
    expect(unpaid).toEqual(['cancelled'])

    const paid = getAvailableAdminActions({
      status: 'pending_confirmation',
      paymentMethod: 'online',
      paymentStatus: 'paid',
    }).map((a) => a.status)
    expect(paid).toContain('confirmed')
  })

  it('lets an admin confirm a GCash order only once its reference has been verified', () => {
    const unverified = getAvailableAdminActions({
      status: 'pending_confirmation',
      paymentMethod: 'gcash',
      paymentStatus: 'pending',
    }).map((a) => a.status)
    expect(unverified).toEqual(['cancelled'])

    const verified = getAvailableAdminActions({
      status: 'pending_confirmation',
      paymentMethod: 'gcash',
      paymentStatus: 'paid',
    }).map((a) => a.status)
    expect(verified).toEqual(['confirmed', 'cancelled'])
  })

  it('treats online and GCash as prepaid, COD as not', () => {
    expect(isPrepaidMethod('online')).toBe(true)
    expect(isPrepaidMethod('gcash')).toBe(true)
    expect(isPrepaidMethod('cod')).toBe(false)
  })

  it('lets buyers cancel only before preparation starts', () => {
    expect(canCustomerCancel({ status: 'pending_payment' })).toBe(true)
    expect(canCustomerCancel({ status: 'pending_confirmation' })).toBe(true)
    expect(canCustomerCancel({ status: 'confirmed' })).toBe(false)
  })
})

describe('initial states and progress', () => {
  it('starts COD at pending confirmation / unpaid and online at pending payment / pending', () => {
    expect(initialStatusFor('cod')).toBe('pending_confirmation')
    expect(initialPaymentStatusFor('cod')).toBe('unpaid')
    expect(initialStatusFor('online')).toBe('pending_payment')
    expect(initialPaymentStatusFor('online')).toBe('pending')
  })

  it('starts GCash at pending confirmation / pending so an admin verifies the reference', () => {
    expect(initialStatusFor('gcash')).toBe('pending_confirmation')
    expect(initialPaymentStatusFor('gcash')).toBe('pending')
  })

  it('accepts GCash references of 8-20 letters or digits only', () => {
    expect(isValidGcashReference('1029384756123')).toBe(true)
    expect(isValidGcashReference('ABC12345')).toBe(true)
    expect(isValidGcashReference('1234567')).toBe(false)
    expect(isValidGcashReference('1'.repeat(21))).toBe(false)
    expect(isValidGcashReference('1234 5678')).toBe(false)
    expect(isValidGcashReference('')).toBe(false)
  })

  it('maps statuses onto the timeline', () => {
    expect(getProgressIndex('pending_payment')).toBe(0)
    expect(getProgressIndex('pending_confirmation')).toBe(0)
    expect(getProgressIndex('shipped')).toBe(3)
    expect(getProgressIndex('delivered')).toBe(4)
    expect(getProgressIndex('cancelled')).toBe(-1)
  })

  it('formats order numbers', () => {
    expect(generateOrderNumber(42, new Date('2026-10-11T00:00:00Z'))).toBe('ORD-2610-00042')
  })
})
