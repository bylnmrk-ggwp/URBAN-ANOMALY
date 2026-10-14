import { z } from 'zod'

import type { ISODateString } from '@/types/common'

import { announcementContentSchema, navigationContentSchema } from './navigation'
import { pageContentSchema } from './sections'
import { themeContentSchema } from './theme'

export type DocumentKind = 'page' | 'navigation' | 'theme' | 'announcement'

/** `page:<slug>` or `global:<kind>`. */
export type DocumentKey =
  `page:${string}` | 'global:navigation' | 'global:theme' | 'global:announcement'

export const GLOBAL_KEYS = {
  navigation: 'global:navigation',
  theme: 'global:theme',
  announcement: 'global:announcement',
} as const satisfies Record<Exclude<DocumentKind, 'page'>, DocumentKey>

export function pageKey(slug: string): DocumentKey {
  return `page:${slug}`
}

export function parseDocumentKey(key: string): { kind: DocumentKind; slug: string } | null {
  if (key.startsWith('page:')) return { kind: 'page', slug: key.slice(5) }
  if (key === GLOBAL_KEYS.navigation) return { kind: 'navigation', slug: 'navigation' }
  if (key === GLOBAL_KEYS.theme) return { kind: 'theme', slug: 'theme' }
  if (key === GLOBAL_KEYS.announcement) return { kind: 'announcement', slug: 'announcement' }
  return null
}

export const CONTENT_SCHEMAS = {
  page: pageContentSchema,
  navigation: navigationContentSchema,
  theme: themeContentSchema,
  announcement: announcementContentSchema,
} as const

export type ContentFor<K extends DocumentKind> = z.infer<(typeof CONTENT_SCHEMAS)[K]>

/** One editable document. `published` is null until the first publish. */
export interface CmsDocument<K extends DocumentKind = DocumentKind> {
  key: DocumentKey
  kind: K
  title: string
  draft: ContentFor<K>
  published: ContentFor<K> | null
  draftVersion: number
  publishedVersion: number
  hasUnpublishedChanges: boolean
  updatedBy: string | null
  updatedAt: ISODateString
  publishedAt: ISODateString | null
  /** When set, the draft goes live automatically at this time. */
  scheduledAt: ISODateString | null
}

export interface DocumentSummary {
  key: DocumentKey
  kind: DocumentKind
  title: string
  draftVersion: number
  publishedVersion: number
  hasUnpublishedChanges: boolean
  updatedAt: ISODateString
  publishedAt: ISODateString | null
  scheduledAt: ISODateString | null
}

export interface Revision {
  id: string
  key: DocumentKey
  version: number
  note: string
  createdBy: string
  createdAt: ISODateString
}

export interface AuditEntry {
  id: string
  actor: string
  action:
    | 'save_draft'
    | 'publish'
    | 'restore'
    | 'media_upload'
    | 'media_delete'
    | 'create_page'
    | 'delete_page'
  documentKey: DocumentKey | null
  details: string
  createdAt: ISODateString
}

/** Parse stored JSON with the schema for its kind; null when invalid so callers can fall back. */
export function parseContent<K extends DocumentKind>(kind: K, raw: unknown): ContentFor<K> | null {
  const result = CONTENT_SCHEMAS[kind].safeParse(raw)
  return result.success ? (result.data as ContentFor<K>) : null
}

export const pageSlugSchema = z
  .string()
  .trim()
  .min(2, 'Slug is required.')
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.')

/** Slugs that collide with code-driven routes. */
export const RESERVED_PAGE_SLUGS = new Set([
  'shop',
  'cart',
  'checkout',
  'login',
  'register',
  'forgot-password',
  'account',
  'admin',
  'orders',
  'products',
  'collections',
])
