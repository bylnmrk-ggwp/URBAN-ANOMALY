import { useQuery } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

import { defaultContentFor } from '../domain/defaults'
import type { ContentFor, DocumentKey, DocumentKind } from '../domain/documents'
import { usePreviewOverride } from './previewBridge'

export interface PublishedDocumentState<K extends DocumentKind> {
  content: ContentFor<K>
  /** True while the published copy is still loading and defaults are shown. */
  isFallback: boolean
  /** True when the storefront is inside the visual editor and shows a draft. */
  isPreview: boolean
  isError: boolean
}

/**
 * Storefront read. Renders synchronously from built-in defaults, then swaps to the
 * published document once loaded. Inside the editor preview, a pushed draft wins.
 * Never returns draft content outside preview mode.
 */
export function usePublishedDocument<K extends DocumentKind>(
  kind: K,
  key: DocumentKey,
): PublishedDocumentState<K> {
  const override = usePreviewOverride(kind, key)
  const query = useQuery({
    queryKey: queryKeys.cms.published(key),
    queryFn: () => repositories.cms.getPublished(kind, key),
    staleTime: 5 * 60_000,
  })
  const fallback = defaultContentFor(kind, key)

  if (override) return { content: override, isFallback: false, isPreview: true, isError: false }

  const published = query.data?.content ?? null
  const content = published ?? fallback
  if (!content) {
    throw new Error(`No published content or default for ${key}`)
  }
  return {
    content,
    isFallback: published === null,
    isPreview: false,
    isError: query.isError,
  }
}

/** Custom page lookup: published or not, used by the /pages/:slug route. */
export function usePublishedPage(slug: string) {
  return useQuery({
    queryKey: queryKeys.cms.published(`page:${slug}`),
    queryFn: () => repositories.cms.getPublished('page', `page:${slug}`),
    staleTime: 5 * 60_000,
  })
}
