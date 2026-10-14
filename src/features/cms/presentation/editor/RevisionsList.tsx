import { History } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/format'

import type { Revision } from '../../domain/documents'

interface RevisionsListProps {
  revisions: Revision[] | undefined
  isLoading: boolean
  error?: unknown
  onRetry?: () => void
  /** Currently published version, marked in the list. */
  publishedVersion: number
  onRestore: (version: number) => void
  isRestoring: boolean
  /** Optional: open the editor with this version restored into the draft. */
  onPreview?: (version: number) => void
}

export function RevisionsList({
  revisions,
  isLoading,
  error,
  onRetry,
  publishedVersion,
  onRestore,
  isRestoring,
  onPreview,
}: RevisionsListProps) {
  const [pending, setPending] = useState<number | null>(null)

  if (error) {
    return <ErrorState title="Could not load history" error={error} onRetry={onRetry} />
  }
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-md" />
        ))}
      </div>
    )
  }
  if (!revisions || revisions.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No published versions yet"
        description="Every publish adds a version here that you can restore later."
        className="py-10"
      />
    )
  }

  return (
    <>
      <ol className="divide-y rounded-md border" aria-label="Published versions">
        {revisions.map((revision) => (
          <li key={revision.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                Version {revision.version}
                {revision.version === publishedVersion ? (
                  <span className="bg-success/10 text-success rounded-full px-2 py-0.5 text-[11px] font-medium">
                    Live
                  </span>
                ) : null}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {revision.note ? `“${revision.note}” · ` : ''}
                {revision.createdBy} · {formatDateTime(revision.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onPreview ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  disabled={isRestoring}
                  onClick={() => onPreview(revision.version)}
                >
                  Preview
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                disabled={isRestoring}
                onClick={() => setPending(revision.version)}
              >
                Restore to draft
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={`Restore version ${pending ?? ''} to draft?`}
        description="The current draft is replaced with this version. Nothing is published until you press Publish, so the live page does not change."
        confirmLabel="Restore to draft"
        isPending={isRestoring}
        onConfirm={() => {
          if (pending !== null) onRestore(pending)
          setPending(null)
        }}
      />
    </>
  )
}
