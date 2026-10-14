import { StatusBadge } from '@/components/common/StatusBadge'
import { formatDateTime } from '@/lib/format'

/** "Scheduled · <date>" pill; renders nothing when there is no pending schedule. */
export function ScheduledBadge({
  scheduledAt,
  className,
}: {
  scheduledAt: string | null
  className?: string
}) {
  if (!scheduledAt) return null
  return (
    <StatusBadge
      tone="info"
      label={`Scheduled · ${formatDateTime(scheduledAt)}`}
      className={className}
    />
  )
}
