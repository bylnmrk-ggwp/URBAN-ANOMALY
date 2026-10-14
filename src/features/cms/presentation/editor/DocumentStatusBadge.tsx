import { StatusBadge } from '@/components/common/StatusBadge'

import { DOCUMENT_STATUS_LABEL, DOCUMENT_STATUS_TONE, type DocumentStatus } from './documentStatus'

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  return <StatusBadge label={DOCUMENT_STATUS_LABEL[status]} tone={DOCUMENT_STATUS_TONE[status]} />
}
