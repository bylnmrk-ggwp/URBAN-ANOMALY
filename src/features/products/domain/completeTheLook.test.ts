import { describe, expect, it } from 'vitest'

import { SEED_PRODUCTS } from '@/mocks/data/products'

import { pickCompleteTheLook } from './completeTheLook'

const clog = SEED_PRODUCTS.find((p) => p.id === 'prod-01')
if (!clog) throw new Error('seed clog missing')

describe('pickCompleteTheLook', () => {
  it('excludes the current product and its own category', () => {
    const picks = pickCompleteTheLook(clog, SEED_PRODUCTS, 4)
    expect(picks).toHaveLength(4)
    for (const pick of picks) {
      expect(pick.id).not.toBe(clog.id)
      expect(pick.categoryId).not.toBe(clog.categoryId)
      expect(pick.status).toBe('published')
    }
  })

  it('prefers complementary categories in order (straps before slides for a clog)', () => {
    const picks = pickCompleteTheLook(clog, SEED_PRODUCTS, 8)
    const slugs = picks.map((p) => p.categorySlug)
    const firstSlide = slugs.indexOf('slides')
    const lastStrap = slugs.lastIndexOf('straps-accessories')
    expect(lastStrap).toBeGreaterThan(-1)
    if (firstSlide !== -1) expect(lastStrap).toBeLessThan(firstSlide)
  })

  it('falls back to any other category for unknown categories', () => {
    const odd = { id: 'x', categoryId: 'cat-unknown', categorySlug: 'unknown' }
    const picks = pickCompleteTheLook(odd, SEED_PRODUCTS, 3)
    expect(picks).toHaveLength(3)
  })

  it('returns an empty list when nothing else exists', () => {
    expect(pickCompleteTheLook(clog, [clog], 4)).toEqual([])
  })
})
