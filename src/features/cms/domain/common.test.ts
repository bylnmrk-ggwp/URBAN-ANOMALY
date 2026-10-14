import { describe, expect, it } from 'vitest'

import { isCtaSet, isExternalHref, safeHrefSchema } from './common'

describe('safeHrefSchema', () => {
  it('accepts relative paths and https urls only', () => {
    expect(safeHrefSchema.safeParse('/shop?sort=newest').success).toBe(true)
    expect(safeHrefSchema.safeParse('https://example.com/x').success).toBe(true)
    expect(safeHrefSchema.safeParse('http://example.com').success).toBe(false)
    expect(safeHrefSchema.safeParse('//evil.com').success).toBe(false)
    expect(safeHrefSchema.safeParse('javascript:alert(1)').success).toBe(false)
    expect(safeHrefSchema.safeParse('data:text/html,hi').success).toBe(false)
  })

  it('classifies ctas and external links', () => {
    expect(isCtaSet({ label: 'Go', href: '/shop' })).toBe(true)
    expect(isCtaSet({ label: '', href: '/shop' })).toBe(false)
    expect(isExternalHref('https://x.y')).toBe(true)
    expect(isExternalHref('/about')).toBe(false)
  })
})

describe('imageRefSchema', () => {
  it('accepts http(s) and blob urls, rejects script schemes', async () => {
    const { imageRefSchema } = await import('./common')
    const ok = (url: string) => imageRefSchema.safeParse({ mediaId: null, url, alt: '' }).success
    expect(ok('https://images.example.com/a.jpg')).toBe(true)
    expect(ok('blob:http://localhost/abc')).toBe(true)
    expect(ok('')).toBe(true)
    expect(ok('javascript:alert(1)')).toBe(false)
    expect(ok('data:image/png;base64,AAAA')).toBe(false)
  })
})
