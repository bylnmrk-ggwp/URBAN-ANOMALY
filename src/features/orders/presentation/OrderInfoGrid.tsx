import type { ReactNode } from 'react'

import { PaymentMethodBadge, PaymentStatusBadge } from '@/components/common/StatusBadge'
import type { Order } from '@/features/orders/domain/entities'
import { cn } from '@/lib/utils'

interface OrderInfoGridProps {
  order: Pick<
    Order,
    'customer' | 'shippingAddress' | 'paymentMethod' | 'paymentStatus' | 'tracking' | 'customerNote'
  >
  className?: string
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-md border p-5">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</h3>
      <div className="mt-3 space-y-1 text-sm">{children}</div>
    </div>
  )
}

export function OrderInfoGrid({ order, className }: OrderInfoGridProps) {
  const { customer, shippingAddress, tracking } = order
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      <InfoBlock title="Customer">
        <p className="font-medium">{customer.fullName}</p>
        <p className="text-muted-foreground break-words">{customer.email}</p>
        <p className="text-muted-foreground">{customer.phone}</p>
      </InfoBlock>

      <InfoBlock title="Shipping address">
        <address className="not-italic">
          <p>{shippingAddress.addressLine}</p>
          <p>
            {shippingAddress.barangay}, {shippingAddress.city}
          </p>
          <p>
            {shippingAddress.province} {shippingAddress.postalCode}
          </p>
        </address>
        {shippingAddress.deliveryInstructions ? (
          <p className="text-muted-foreground pt-1">
            Instructions: {shippingAddress.deliveryInstructions}
          </p>
        ) : null}
      </InfoBlock>

      <InfoBlock title="Payment">
        <div className="flex flex-wrap gap-2">
          <PaymentMethodBadge method={order.paymentMethod} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </InfoBlock>

      {tracking ? (
        <InfoBlock title="Tracking">
          <p className="font-medium">{tracking.courier}</p>
          <p className="text-muted-foreground font-mono text-xs break-all">
            {tracking.trackingNumber}
          </p>
        </InfoBlock>
      ) : order.customerNote ? (
        <InfoBlock title="Order note">
          <p className="text-muted-foreground">{order.customerNote}</p>
        </InfoBlock>
      ) : null}
    </div>
  )
}
