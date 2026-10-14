import { useEffect, useRef, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import {
  postDraftToPreview,
  postSelectionToPreview,
  PREVIEW_PARAM,
  previewPathFor,
  type PreviewMessage,
} from '../../application/previewBridge'
import type { DocumentKey } from '../../domain/documents'
import { DEVICE_WIDTHS, type PreviewDevice } from './devices'

interface PreviewFrameProps {
  docKey: DocumentKey
  /** Session token the storefront must echo back; created once by the shell. */
  token: string
  draft: unknown
  device: PreviewDevice
  selectedId: string | null
  onSelect: (sectionId: string) => void
  className?: string
}

/**
 * Renders the real storefront route in an iframe and keeps it fed with the draft over
 * postMessage. Same-origin on purpose (no `sandbox`): the bridge checks origin + token.
 */
export function PreviewFrame({
  docKey,
  token,
  draft,
  device,
  selectedId,
  onSelect,
  className,
}: PreviewFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  // Latest draft for the load/ready handlers, kept in sync by the posting effect below.
  const draftRef = useRef(draft)
  const src = `${previewPathFor(docKey)}?${PREVIEW_PARAM}=${encodeURIComponent(token)}`
  // The storefront has sent `cms:ready` for this exact src; a new src waits for a new handshake.
  const [readySrc, setReadySrc] = useState<string | null>(null)
  const ready = readySrc === src

  // Messages from the storefront: ready handshake and click-to-select.
  useEffect(() => {
    const onMessage = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin) return
      const data = event.data
      if (!data || typeof data !== 'object' || data.token !== token) return
      if (data.type === 'cms:ready') {
        setReadySrc(src)
        postDraftToPreview(frameRef.current, token, docKey, draftRef.current)
      } else if (data.type === 'cms:select') {
        onSelect(data.sectionId)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [docKey, onSelect, src, token])

  // Push every draft change; the storefront re-renders from it.
  useEffect(() => {
    draftRef.current = draft
    postDraftToPreview(frameRef.current, token, docKey, draft)
  }, [docKey, draft, token])

  useEffect(() => {
    if (selectedId) postSelectionToPreview(frameRef.current, token, selectedId)
  }, [selectedId, token])

  return (
    <div
      className={cn(
        'bg-muted flex h-full min-h-0 w-full justify-center overflow-auto p-3 sm:p-6',
        className,
      )}
    >
      <div
        className="bg-background relative h-full min-h-[480px] max-w-full shrink-0 overflow-hidden rounded-md border shadow-xs transition-[width] duration-200"
        style={{ width: DEVICE_WIDTHS[device] }}
      >
        {!ready ? (
          <div className="absolute inset-0 z-10 space-y-4 p-6" aria-hidden="true">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : null}
        <iframe
          ref={frameRef}
          title="Page preview"
          src={src}
          className="block h-full w-full border-0"
          onLoad={() => postDraftToPreview(frameRef.current, token, docKey, draftRef.current)}
        />
      </div>
    </div>
  )
}
