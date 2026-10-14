import { useEffect, useState } from 'react'

import type { ContentFor, DocumentKey, DocumentKind } from '../domain/documents'
import { parseContent, parseDocumentKey } from '../domain/documents'

/**
 * postMessage protocol between the visual editor (parent window) and the storefront
 * rendered in its preview iframe. The storefront only accepts draft content when:
 *   1. it was opened with `?cmsPreview=<token>` (only the editor does this),
 *   2. the message origin equals its own origin,
 *   3. the message carries the same token.
 * Ordinary visitors have no token, so nothing can ever push draft content to them.
 */

export const PREVIEW_PARAM = 'cmsPreview'

export interface PreviewDraftMessage {
  type: 'cms:draft'
  token: string
  key: DocumentKey
  content: unknown
}

export interface PreviewSelectMessage {
  type: 'cms:select'
  token: string
  sectionId: string
}

export interface PreviewReadyMessage {
  type: 'cms:ready'
  token: string
}

export type PreviewMessage = PreviewDraftMessage | PreviewSelectMessage | PreviewReadyMessage

export function getPreviewToken(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(PREVIEW_PARAM)
}

export function isPreviewMode(): boolean {
  return getPreviewToken() !== null
}

type Listener = () => void
const overrides = new Map<DocumentKey, unknown>()
const listeners = new Set<Listener>()
let selectedSectionId: string | null = null
let selectionListeners = new Set<Listener>()

function notify() {
  for (const l of listeners) l()
}

/** Storefront side: start listening for draft pushes from the editor. Returns cleanup. */
export function installPreviewReceiver(): () => void {
  const token = getPreviewToken()
  if (!token) return () => {}
  const onMessage = (event: MessageEvent<PreviewMessage>) => {
    if (event.origin !== window.location.origin) return
    const data = event.data
    if (!data || typeof data !== 'object' || data.token !== token) return
    if (data.type === 'cms:draft') {
      overrides.set(data.key, data.content)
      notify()
    } else if (data.type === 'cms:select') {
      selectedSectionId = data.sectionId
      for (const l of selectionListeners) l()
    }
  }
  window.addEventListener('message', onMessage)
  window.parent?.postMessage(
    { type: 'cms:ready', token } satisfies PreviewReadyMessage,
    window.location.origin,
  )
  return () => {
    window.removeEventListener('message', onMessage)
    overrides.clear()
    selectionListeners = new Set()
  }
}

/** Storefront side: current draft override for a key, validated against the schema. */
export function usePreviewOverride<K extends DocumentKind>(
  kind: K,
  key: DocumentKey,
): ContentFor<K> | null {
  const [, force] = useState(0)
  useEffect(() => {
    if (!isPreviewMode()) return
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])
  if (!isPreviewMode()) return null
  const raw = overrides.get(key)
  if (raw === undefined) return null
  return parseContent(kind, raw)
}

export function useSelectedPreviewSection(): string | null {
  const [, force] = useState(0)
  useEffect(() => {
    if (!isPreviewMode()) return
    const l = () => force((n) => n + 1)
    selectionListeners.add(l)
    return () => {
      selectionListeners.delete(l)
    }
  }, [])
  return isPreviewMode() ? selectedSectionId : null
}

/** Storefront side: tell the editor which section the user clicked. */
export function reportSectionClick(sectionId: string) {
  const token = getPreviewToken()
  if (!token || !window.parent) return
  window.parent.postMessage(
    { type: 'cms:select', token, sectionId } satisfies PreviewSelectMessage,
    window.location.origin,
  )
}

/** Editor side: push a draft into the iframe. */
export function postDraftToPreview(
  frame: HTMLIFrameElement | null,
  token: string,
  key: DocumentKey,
  content: unknown,
) {
  frame?.contentWindow?.postMessage(
    { type: 'cms:draft', token, key, content } satisfies PreviewDraftMessage,
    window.location.origin,
  )
}

export function postSelectionToPreview(
  frame: HTMLIFrameElement | null,
  token: string,
  sectionId: string,
) {
  frame?.contentWindow?.postMessage(
    { type: 'cms:select', token, sectionId } satisfies PreviewSelectMessage,
    window.location.origin,
  )
}

/** Editor side: storefront path that renders a document key. */
export function previewPathFor(key: DocumentKey): string {
  const parsed = parseDocumentKey(key)
  if (!parsed) return '/'
  if (parsed.kind !== 'page') return '/'
  if (parsed.slug === 'home') return '/'
  if (parsed.slug === 'about') return '/about'
  return `/pages/${parsed.slug}`
}

export function createPreviewToken(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}
