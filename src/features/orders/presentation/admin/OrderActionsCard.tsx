import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { useUpdateOrderStatus } from '../../application/admin'
import type { Order, OrderStatus } from '../../domain/entities'
import { getAvailableAdminActions, ORDER_STATUS_LABELS } from '../../domain/rules'

const CONFIRM_COPY: Partial<Record<OrderStatus, { title: string; description: string }>> = {
  confirmed: {
    title: 'Confirm this order?',
    description:
      'Reserved stock becomes committed and the customer is notified that the order is being prepared.',
  },
  processing: {
    title: 'Mark as processing?',
    description: 'Use this once the items are being picked and packed.',
  },
  shipped: {
    title: 'Mark as shipped?',
    description:
      'The customer is notified that the parcel is on its way. Add tracking details so they can follow it.',
  },
  delivered: {
    title: 'Mark as delivered?',
    description: 'This completes the order. Remember to record cash collected for COD orders.',
  },
  cancelled: {
    title: 'Cancel this order?',
    description:
      'Reserved stock is released back to inventory and the customer is notified. This cannot be undone.',
  },
}

interface OrderActionsCardProps {
  order: Order
}

export function OrderActionsCard({ order }: OrderActionsCardProps) {
  const noteId = useId()
  const updateStatus = useUpdateOrderStatus()
  const [pending, setPending] = useState<OrderStatus | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState(false)

  const actions = getAvailableAdminActions(order)
  const copy = pending ? CONFIRM_COPY[pending] : undefined
  const isCancel = pending === 'cancelled'

  const close = () => {
    setPending(null)
    setReason('')
    setReasonError(false)
  }

  const confirm = () => {
    if (!pending) return
    if (isCancel && reason.trim().length === 0) {
      setReasonError(true)
      return
    }
    updateStatus.mutate(
      { id: order.id, status: pending, note: isCancel ? reason.trim() : undefined },
      { onSuccess: close },
    )
  }

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
        <CardDescription>
          Current status:{' '}
          <span className="text-foreground">{ORDER_STATUS_LABELS[order.status]}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {order.status === 'pending_payment'
              ? 'Waiting for the payment provider to confirm payment. The order can still be cancelled once the payment fails or expires.'
              : 'No further actions are available for this order.'}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {actions.map((action) => (
              <Button
                key={action.status}
                variant={action.destructive ? 'outline' : 'default'}
                className={action.destructive ? 'text-destructive hover:text-destructive' : ''}
                disabled={updateStatus.isPending}
                onClick={() => setPending(action.status)}
              >
                {updateStatus.isPending && pending === action.status ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title={copy?.title ?? 'Update order status?'}
        description={
          <span className="block space-y-3">
            <span className="block">{copy?.description}</span>
            {isCancel ? (
              <span className="block space-y-1.5 text-left">
                <Label htmlFor={noteId} className="text-foreground">
                  Reason for cancellation
                </Label>
                <Textarea
                  id={noteId}
                  rows={2}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    setReasonError(false)
                  }}
                  placeholder="Shared with the customer in the status history."
                  aria-invalid={reasonError}
                />
                {reasonError ? (
                  <span className="text-destructive block text-xs">A reason is required.</span>
                ) : null}
              </span>
            ) : null}
          </span>
        }
        confirmLabel={pending ? ORDER_STATUS_LABELS[pending] : 'Confirm'}
        destructive={isCancel}
        isPending={updateStatus.isPending}
        onConfirm={confirm}
      />
    </Card>
  )
}
