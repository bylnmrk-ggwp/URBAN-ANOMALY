import type { ProductSize } from './entities'
import { PRODUCT_SIZES } from './entities'

export type FitPreference = 'regular' | 'relaxed'

export interface SizeRecommendationInput {
  /** Heel-to-toe length of the longer foot, in centimetres. */
  footLengthCm: number
  fit: FitPreference
}

export const SIZE_RECOMMENDATION_LIMITS = {
  footLengthCm: { min: 20, max: 32 },
} as const

/**
 * Foot-length chart for clogs and slides (US unisex sizing, roomy toe box):
 * 5 <= 23.0 cm · 6 <= 23.8 · 7 <= 24.6 · 8 <= 25.4 · 9 <= 26.2 · 10 <= 27.0 · 11 <= 27.8 · 12 above.
 * A relaxed fit preference (socks, wide feet) adds one size. Result is clamped to 5–12.
 */
export const FOOT_LENGTH_BANDS: { maxCm: number; size: ProductSize }[] = [
  { maxCm: 23.0, size: '5' },
  { maxCm: 23.8, size: '6' },
  { maxCm: 24.6, size: '7' },
  { maxCm: 25.4, size: '8' },
  { maxCm: 26.2, size: '9' },
  { maxCm: 27.0, size: '10' },
  { maxCm: 27.8, size: '11' },
]

function baseSizeForFoot(footLengthCm: number): ProductSize {
  return FOOT_LENGTH_BANDS.find((band) => footLengthCm <= band.maxCm)?.size ?? '12'
}

function shiftSize(size: ProductSize, steps: number): ProductSize {
  const index = PRODUCT_SIZES.indexOf(size)
  const next = Math.min(PRODUCT_SIZES.length - 1, Math.max(0, index + steps))
  return PRODUCT_SIZES[next] ?? size
}

/** Pure size suggestion from foot length. Input is clamped to sane limits. */
export function recommendSize({ footLengthCm, fit }: SizeRecommendationInput): ProductSize {
  const limits = SIZE_RECOMMENDATION_LIMITS.footLengthCm
  const length = Math.min(limits.max, Math.max(limits.min, footLengthCm))
  return shiftSize(baseSizeForFoot(length), fit === 'relaxed' ? 1 : 0)
}
