import { Loader2, RotateCcw, Save, Send } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'

import type { CmsDocument } from '../../domain/documents'
import { describeDraftStatus } from './draftStatus'

interface DraftActionsProps {
  document: CmsDocument | null
  isDirty: boolean
  isSaving: boolean
  isPublishing: boolean
  onSave: () => void
  onPublish: () => void
  onDiscard: () => void
  /** Human name used in the publish confirmation ("Publish the navigation?"). */
  subject: string
}

export function DraftActions({
  document,
  isDirty,
  isSaving,
  isPublishing,
  onSave,
  onPublish,
  onDiscard,
  subject,
}: DraftActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const status = describeDraftStatus(document, isDirty)
  const busy = isSaving || isPublishing
  const canPublish =
    isDirty || Boolean(document?.hasUnpublishedChanges) || document?.publishedVersion === 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2" aria-live="polite">
        <StatusBadge label={status.label} tone={status.tone} />
        {document ? (
          <span className="text-muted-foreground hidden text-xs sm:inline">
            v{document.draftVersion}
            {document.publishedVersion > 0 ? ` · live v${document.publishedVersion}` : ''}
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={!isDirty || busy}
          aria-label="Discard changes"
        >
          <RotateCcw aria-hidden="true" />
          <span className="hidden sm:inline">Discard</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={!isDirty || busy}
        >
          {isSaving ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          Save draft
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={!canPublish || busy}
        >
          {isPublishing ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          Publish
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Publish the ${subject}?`}
        description="Visitors will see these changes immediately. Any unsaved edits are saved first and a revision is recorded so you can roll back."
        confirmLabel="Publish"
        isPending={isPublishing}
        onConfirm={() => {
          setConfirmOpen(false)
          onPublish()
        }}
      />
    </div>
  )
}
