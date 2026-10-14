import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import type { DraftDocumentState } from '../../application/useDraftDocument'
import type { DocumentKind } from '../../domain/documents'
import { RevisionsList } from './RevisionsList'

interface RevisionsSheetProps<K extends DocumentKind> {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: DraftDocumentState<K>
}

/** Document history inside the editor; restoring loads the version into the draft. */
export function RevisionsSheet<K extends DocumentKind>({
  open,
  onOpenChange,
  state,
}: RevisionsSheetProps<K>) {
  const { revisions, restore, document } = state
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>History</SheetTitle>
          <SheetDescription>
            Published versions of this document. Restoring replaces the draft only.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <RevisionsList
            revisions={revisions.data}
            isLoading={revisions.isPending}
            error={revisions.error}
            onRetry={() => void revisions.refetch()}
            publishedVersion={document?.publishedVersion ?? 0}
            onRestore={(version) => {
              restore.mutate(version, { onSuccess: () => onOpenChange(false) })
            }}
            isRestoring={restore.isPending}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
