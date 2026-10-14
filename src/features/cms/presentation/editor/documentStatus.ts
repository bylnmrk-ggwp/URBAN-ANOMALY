import type { StatusTone } from '@/features/orders/domain/rules'

import type { DocumentSummary } from '../../domain/documents'

export type DocumentStatus = 'never_published' | 'draft_changes' | 'published'

/** Derives the badge state; `isDirty` folds in unsaved editor changes. */
export function documentStatus(
  doc: Pick<DocumentSummary, 'publishedVersion' | 'hasUnpublishedChanges'>,
  isDirty = false,
): DocumentStatus {
  if (doc.publishedVersion === 0) return 'never_published'
  if (doc.hasUnpublishedChanges || isDirty) return 'draft_changes'
  return 'published'
}

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  never_published: 'Never published',
  draft_changes: 'Draft changes',
  published: 'Published',
}

export const DOCUMENT_STATUS_TONE: Record<DocumentStatus, StatusTone> = {
  never_published: 'neutral',
  draft_changes: 'warning',
  published: 'success',
}
