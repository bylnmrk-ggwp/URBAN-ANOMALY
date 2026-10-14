import { describe, expect, it } from 'vitest'

import { emptyImage } from './common'
import {
  createSection,
  faqSectionSchema,
  gallerySectionSchema,
  SECTION_META,
  sectionSchema,
  type SectionType,
} from './sections'

const image = (url: string, caption = '') => ({ mediaId: null, url, alt: 'alt', caption })

describe('faq section schema', () => {
  it('accepts the blank section from createSection and round-trips through the union', () => {
    const section = createSection('faq')
    expect(section.type).toBe('faq')
    expect(faqSectionSchema.safeParse(section).success).toBe(true)
    expect(sectionSchema.safeParse(section).success).toBe(true)
  })

  it('requires 1-20 items with a question (<=160) and an answer (<=2000)', () => {
    const base = createSection('faq')
    if (base.type !== 'faq') throw new Error('unreachable')
    expect(faqSectionSchema.safeParse({ ...base, items: [] }).success).toBe(false)
    const tooMany = Array.from({ length: 21 }, (_, i) => ({
      id: `q${i}`,
      question: 'Q',
      answer: 'A',
    }))
    expect(faqSectionSchema.safeParse({ ...base, items: tooMany }).success).toBe(false)
    expect(
      faqSectionSchema.safeParse({
        ...base,
        items: [{ id: 'q', question: 'x'.repeat(161), answer: 'A' }],
      }).success,
    ).toBe(false)
    expect(
      faqSectionSchema.safeParse({
        ...base,
        items: [{ id: 'q', question: 'Q', answer: 'x'.repeat(2001) }],
      }).success,
    ).toBe(false)
    expect(
      faqSectionSchema.safeParse({ ...base, items: [{ id: 'q', question: 'Q', answer: '' }] })
        .success,
    ).toBe(false)
  })
})

describe('gallery section schema', () => {
  it('accepts the blank section (two empty slots) and round-trips through the union', () => {
    const section = createSection('gallery')
    expect(section.type).toBe('gallery')
    expect(gallerySectionSchema.safeParse(section).success).toBe(true)
    expect(sectionSchema.safeParse(section).success).toBe(true)
  })

  it('requires 2-12 images, a layout and a caption flag', () => {
    const base = createSection('gallery')
    if (base.type !== 'gallery') throw new Error('unreachable')
    expect(
      gallerySectionSchema.safeParse({ ...base, images: [image('https://x.test/a.jpg')] }).success,
    ).toBe(false)
    const thirteen = Array.from({ length: 13 }, (_, i) => image(`https://x.test/${i}.jpg`))
    expect(gallerySectionSchema.safeParse({ ...base, images: thirteen }).success).toBe(false)
    expect(gallerySectionSchema.safeParse({ ...base, layout: 'masonry' }).success).toBe(false)
    expect(
      gallerySectionSchema.safeParse({
        ...base,
        images: [image('https://x.test/a.jpg', 'A'), { ...emptyImage, caption: '' }],
        layout: 'columns',
        showCaptions: false,
      }).success,
    ).toBe(true)
    expect(
      gallerySectionSchema.safeParse({
        ...base,
        images: [image('not a url'), image('https://x.test/a.jpg')],
      }).success,
    ).toBe(false)
  })
})

describe('section registry', () => {
  it('has meta and a factory for every section type in the union', () => {
    const types = sectionSchema.options.map((o) => o.shape.type.value) as SectionType[]
    expect(types).toEqual(expect.arrayContaining(['faq', 'gallery']))
    for (const type of types) {
      expect(SECTION_META[type]?.label, type).toBeTruthy()
      const created = createSection(type)
      expect(created.type).toBe(type)
      expect(sectionSchema.safeParse(created).success, type).toBe(true)
    }
  })
})
