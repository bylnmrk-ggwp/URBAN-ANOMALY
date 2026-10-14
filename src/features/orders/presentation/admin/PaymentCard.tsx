import { Banknote } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PaymentMethodBadge, PaymentStatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice } from '@/lib/format'

import { useMarkCodCollected } from '../../application/admin'
import type { Order } from '../../domain/entities'

interface PaymentCardProps {
  order: Order
}

export function PaymentCard({ order }: PaymentCardProps) {
  const markCollected = useMarkCodCollected()
  const [confirming, setConfirming] = useState(false)

  const canCollect =
    order.paymentMethod === 'cod' &&
    order.paymentStatus !== 'paid' &&
    (order.status === 'shipped' || order.status === 'delivered')

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="text-muted-foreground size-4" aria-hidden="true" />
          Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">Method</dt>
            <dd className="mt-1">
              <PaymentMethodBadge method={order.paymentMethod} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">Status</dt>
            <dd className="mt-1">
              <PaymentStatusBadge status={order.paymentStatus} />
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground text-xs tracking-wide uppercase">Amount due</dt>
            <dd className="mt-1 font-semibold tabular-nums">{formatPrice(order.total)}</dd>
          </div>
        </dl>

        {order.paymentMethod === 'online' ? (
          <p className="text-muted-foreground text-xs">
            Payment status is updated automatically by the payment provider webhook and cannot be
            edited here.
          </p>
        ) : canCollect ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={markCollected.isPending}
          >
            Mark cash collected
          </Button>
        ) : order.paymentStatus === 'paid' ? (
          <p className="text-muted-foreground text-xs">Cash was collected on delivery.</p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Cash is collected by the courier. Record it here once the order is shipped or delivered.
          </p>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Mark cash as collected?"
        description={`This records ${formatPrice(order.total)} as paid in cash for ${order.orderNumber}.`}
        confirmLabel="Mark collected"
        isPending={markCollected.isPending}
        onConfirm={() => markCollected.mutate(order.id, { onSettled: () => setConfirming(false) })}
      />
    </Card>
  )
}
