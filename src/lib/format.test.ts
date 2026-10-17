import { describe, expect, it } from 'vitest'

import { formatPrice, formatRelative, pluralize, slugify } from './format'

describe('formatPrice', () => {
  it('formats pesos with two decimals and grouping', () => {
    expect(formatPrice(1299.5)).toBe('₱1,299.50')
    expect(formatPrice(0)).toBe('₱0.00')
  })
})

describe('slugify', () => {
  it('normalises names into url slugs', () => {
    expect(slugify('  Lava Premium Clog! ')).toBe('lava-premium-clog')
    expect(slugify('Straps & Accessories')).toBe('straps-accessories')
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-10-11T12:00:00Z')
  it('describes recent times relatively', () => {
    expect(formatRelative('2026-10-11T11:59:40Z', now)).toBe('just now')
    expect(formatRelative('2026-10-11T11:30:00Z', now)).toBe('30m ago')
    expect(formatRelative('2026-10-11T09:00:00Z', now)).toBe('3h ago')
    expect(formatRelative('2026-10-09T12:00:00Z', now)).toBe('2d ago')
  })
})

describe('pluralize', () => {
  it('handles singular and plural', () => {
    expect(pluralize(1, 'item')).toBe('1 item')
    expect(pluralize(3, 'item')).toBe('3 items')
  })
})
