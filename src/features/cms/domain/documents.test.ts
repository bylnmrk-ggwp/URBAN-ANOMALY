import { describe, expect, it } from 'vitest'

import { DEFAULT_DOCUMENTS } from './defaults'
import { CONTENT_SCHEMAS, GLOBAL_KEYS, pageKey, parseContent, parseDocumentKey } from './documents'

describe('document keys', () => {
  it('builds and parses page and global keys', () => {
    expect(pageKey('home')).toBe('page:home')
    expect(parseDocumentKey('page:about')).toEqual({ kind: 'page', slug: 'about' })
    expect(parseDocumentKey(GLOBAL_KEYS.theme)?.kind).toBe('theme')
    expect(parseDocumentKey('bogus')).toBeNull()
  })
})

describe('default documents', () => {
  it.each(DEFAULT_DOCUMENTS.map((d) => [d.key, d]))('%s validates against its schema', (_, doc) => {
    expect(CONTENT_SCHEMAS[doc.kind].safeParse(doc.content).success).toBe(true)
  })

  it('returns null for invalid stored content instead of throwing', () => {
    expect(parseContent('theme', { colors: { primary: 'red' } })).toBeNull()
    expect(
      parseContent('announcement', { text: 'hi', href: 'javascript:alert(1)', visible: true }),
    ).toBeNull()
  })
})
