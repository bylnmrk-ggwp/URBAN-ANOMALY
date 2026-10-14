import type { StatusTone } from '@/features/orders/domain/rules'

import type { CmsDocument } from '../../domain/documents'

export interface DraftStatus {
  label: string
  tone: StatusTone
}

/** Text + colour for the editor status badge; never colour alone. */
export function describeDraftStatus(document: CmsDocument | null, isDirty: boolean): DraftStatus {
  if (isDirty) return { label: 'Unsaved changes', tone: 'warning' }
  if (!document || document.publishedVersion === 0)
    return { label: 'Never published', tone: 'neutral' }
  if (document.hasUnpublishedChanges) return { label: 'Draft ahead of live', tone: 'info' }
  return { label: 'Published', tone: 'success' }
}
