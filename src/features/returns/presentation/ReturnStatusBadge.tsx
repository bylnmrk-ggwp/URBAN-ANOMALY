import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusTone } from '@/features/orders/domain/rules'
import type { ReturnStatus } from '@/features/returns/domain/entities'
import { RETURN_STATUS_LABELS } from '@/features/returns/domain/entities'

const RETURN_STATUS_TONE: Record<ReturnStatus, StatusTone> = {
  requested: 'info',
  approved: 'info',
  received: 'warning',
  refunded: 'success',
  rejected: 'destructive',
}

export function ReturnStatusBadge({
  status,
  className,
}: {
  status: ReturnStatus
  className?: string
}) {
  return (
    <StatusBadge
      label={RETURN_STATUS_LABELS[status]}
      tone={RETURN_STATUS_TONE[status]}
      className={className}
    />
  )
}
