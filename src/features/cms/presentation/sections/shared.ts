import type { Section } from '../../domain/sections'

/** Position hints the page renderer passes down; sections use them for heading level and image priority. */
export interface SectionContext {
  /** First visible section on the page: renders its title as an h1 and eager-loads its image. */
  isFirst: boolean
  /** First product collection on the page: eager-loads the first row of card images. */
  eager: boolean
}

export const DEFAULT_SECTION_CONTEXT: SectionContext = { isFirst: false, eager: false }

/** DOM id for in-page links (`/about#shipping`). Undefined when the section has no anchor. */
export function anchorId(section: Pick<Section, 'anchor'>): string | undefined {
  return section.anchor || undefined
}

/** Offsets anchored sections below the sticky header. Empty when there is no anchor. */
export function anchorClass(section: Pick<Section, 'anchor'>): string | undefined {
  return section.anchor ? 'scroll-mt-24' : undefined
}

/** Normalises a display phone number into a `tel:` target (keeps a leading +, strips the rest). */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  return `tel:${digits.startsWith('+') ? `+${digits.slice(1).replace(/\+/g, '')}` : digits}`
}
