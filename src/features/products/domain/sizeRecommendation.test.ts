import { describe, expect, it } from 'vitest'

import { recommendSize } from './sizeRecommendation'

describe('recommendSize (footwear)', () => {
  it('maps foot length to US size bands', () => {
    expect(recommendSize({ footLengthCm: 22.5, fit: 'regular' })).toBe('5')
    expect(recommendSize({ footLengthCm: 24.6, fit: 'regular' })).toBe('7')
    expect(recommendSize({ footLengthCm: 25.0, fit: 'regular' })).toBe('8')
    expect(recommendSize({ footLengthCm: 27.5, fit: 'regular' })).toBe('11')
    expect(recommendSize({ footLengthCm: 29, fit: 'regular' })).toBe('12')
  })

  it('adds one size for a relaxed fit and clamps at the ends', () => {
    expect(recommendSize({ footLengthCm: 25.0, fit: 'relaxed' })).toBe('9')
    expect(recommendSize({ footLengthCm: 31, fit: 'relaxed' })).toBe('12')
    expect(recommendSize({ footLengthCm: 10, fit: 'regular' })).toBe('5')
  })
})
