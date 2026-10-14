import { describe, expect, it } from 'vitest'

import {
  BUILT_IN_PAGE_SLUGS,
  DEFAULT_DOCUMENTS,
  DEFAULT_MEDIA,
} from '@/features/cms/domain/defaults'
import { parseContent, RESERVED_PAGE_SLUGS } from '@/features/cms/domain/documents'

// Vite `?raw` import: no node:fs needed, and the path is checked at transform time.
import sql from '../../../../supabase/migrations/0002_cms.sql?raw'

/**
 * The SQL seed in 0002_cms.sql is a hand-maintained copy of the TypeScript defaults. These
 * tests fail when either side drifts, so Supabase mode and mock mode start from the same
 * content.
 */

interface SeededDocument {
  key: string
  kind: string
  title: string
  content: unknown
}

function extractSeededDocuments(): SeededDocument[] {
  const pattern =
    /select '([^']+)', '(\w+)', '((?:[^']|'')+)', c, c, 1, 1, 'Store Admin', now\(\)\s*\nfrom \(select \$json\$\n([\s\S]*?)\n\$json\$::jsonb as c\) seed;/g
  const docs: SeededDocument[] = []
  for (const match of sql.matchAll(pattern)) {
    const [, key = '', kind = '', title = '', json = 'null'] = match
    docs.push({ key, kind, title: title.replace(/''/g, "'"), content: JSON.parse(json) })
  }
  return docs
}

/** Quoted string literals between `marker` and the next `closer`. */
function quotedListAfter(marker: string, closer: string): string[] {
  const start = sql.indexOf(marker)
  expect(start, `marker "${marker}" present in SQL`).toBeGreaterThan(-1)
  const end = sql.indexOf(closer, start)
  const body = sql.slice(start + marker.length, end)
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1] ?? '')
}

describe('0002_cms.sql seed parity', () => {
  const seeded = extractSeededDocuments()

  it('seeds exactly the default documents, in order', () => {
    expect(seeded.map((d) => d.key)).toEqual(DEFAULT_DOCUMENTS.map((d) => d.key))
    expect(seeded.map((d) => d.kind)).toEqual(DEFAULT_DOCUMENTS.map((d) => d.kind))
    expect(seeded.map((d) => d.title)).toEqual(DEFAULT_DOCUMENTS.map((d) => d.title))
  })

  it.each(DEFAULT_DOCUMENTS.map((doc, index) => ({ key: doc.key, doc, index })))(
    'seeded content for $key equals the TypeScript default',
    ({ doc, index }) => {
      const actual = seeded.find((_, i) => i === index)
      expect(actual).toBeDefined()
      expect(actual?.content).toEqual(doc.content)
      expect(parseContent(doc.kind, actual?.content)).not.toBeNull()
    },
  )

  it('seeds the default media library', () => {
    const match = /\$media\$\n([\s\S]*?)\n\$media\$::jsonb/.exec(sql)
    expect(match?.[1]).toBeDefined()
    expect(JSON.parse(match?.[1] ?? 'null')).toEqual(DEFAULT_MEDIA)
  })

  it('mirrors RESERVED_PAGE_SLUGS in cms_is_reserved_slug', () => {
    expect(new Set(quotedListAfter('select p_slug in (', ');'))).toEqual(RESERVED_PAGE_SLUGS)
  })

  it('refuses to delete the built-in pages', () => {
    const guarded = quotedListAfter('if p_slug in (', ')')
    expect([...guarded].sort()).toEqual([...BUILT_IN_PAGE_SLUGS].sort())
  })
})
