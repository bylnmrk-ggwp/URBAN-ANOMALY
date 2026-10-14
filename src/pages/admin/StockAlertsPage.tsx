import { BellRing } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import {
  groupStockAlerts,
  useMarkStockAlertsNotified,
  useStockAlerts,
  type StockAlertGroup,
} from '@/features/stock-alerts/application/hooks'
import { StockAlertsTable } from '@/features/stock-alerts/presentation/StockAlertsTable'
import { getErrorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/format'

export default function StockAlertsPage() {
  const alerts = useStockAlerts()
  const markNotified = useMarkStockAlertsNotified()
  const [pending, setPending] = useState<StockAlertGroup | null>(null)

  const groups = alerts.data ? groupStockAlerts(alerts.data) : []
  const waitingTotal = groups.reduce((sum, group) => sum + group.waitingCount, 0)

  const confirm = async () => {
    if (!pending) return
    try {
      const count = await markNotified.mutateAsync(pending.variantId)
      toast.success(`Marked ${pluralize(count, 'alert')} as notified`, {
        description: `${pending.productName} · ${pending.size} · ${pending.colorName}`,
      })
      setPending(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not update the alerts.'))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock alerts"
        description={
          alerts.data
            ? `${pluralize(waitingTotal, 'customer')} waiting across ${pluralize(groups.length, 'variant')}.`
            : 'Customers who asked to be told when a sold-out variant returns.'
        }
      />

      {alerts.isError ? (
        <ErrorState
          title="Could not load stock alerts"
          error={alerts.error}
          onRetry={() => void alerts.refetch()}
          isRetrying={alerts.isRefetching}
        />
      ) : (
        <StockAlertsTable
          groups={groups}
          isLoading={alerts.isPending}
          onMarkNotified={setPending}
          emptyState={
            <EmptyState
              icon={BellRing}
              title="No stock alerts yet"
              description="Alerts appear here when a shopper subscribes to a sold-out size."
            />
          }
        />
      )}

      <p className="text-muted-foreground text-xs">
        Marking a variant as notified closes its waiting alerts. Email delivery is handled outside
        this demo.
      </p>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
        title="Mark as notified?"
        description={
          pending
            ? `${pluralize(pending.waitingCount, 'customer')} waiting for ${pending.productName} (${pending.size} · ${pending.colorName}) will be marked as notified.`
            : ''
        }
        confirmLabel="Mark notified"
        isPending={markNotified.isPending}
        onConfirm={() => void confirm()}
      />
    </div>
  )
}
