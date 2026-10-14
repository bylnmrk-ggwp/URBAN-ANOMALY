import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/features/orders/domain/entities'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
  type StatusTone,
} from '@/features/orders/domain/rules'
import type { StockStatus } from '@/features/inventory/domain/entities'
import { STOCK_STATUS_LABELS } from '@/features/inventory/domain/entities'
import type { ProductStatus } from '@/features/products/domain/entities'
import { cn } from '@/lib/utils'

const toneClasses: Record<StatusTone, string> = {
  neutral: 'bg-muted text-foreground border-border',
  info: 'bg-info/10 text-info border-info/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  destructive: 'bg-destructive/10 text-destructive border-destructive/20',
}

interface StatusBadgeProps {
  label: string
  tone: StatusTone
  className?: string
}

/** Generic status pill. Status is always conveyed by text, never colour alone. */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {label}
    </span>
  )
}

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus
  className?: string
}) {
  return (
    <StatusBadge
      label={ORDER_STATUS_LABELS[status]}
      tone={ORDER_STATUS_TONE[status]}
      className={className}
    />
  )
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus
  className?: string
}) {
  return (
    <StatusBadge
      label={PAYMENT_STATUS_LABELS[status]}
      tone={PAYMENT_STATUS_TONE[status]}
      className={className}
    />
  )
}

export function PaymentMethodBadge({
  method,
  className,
}: {
  method: PaymentMethod
  className?: string
}) {
  return <StatusBadge label={PAYMENT_METHOD_LABELS[method]} tone="neutral" className={className} />
}

const stockTone: Record<StockStatus, StatusTone> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'destructive',
}

export function StockStatusBadge({
  status,
  className,
}: {
  status: StockStatus
  className?: string
}) {
  return (
    <StatusBadge
      label={STOCK_STATUS_LABELS[status]}
      tone={stockTone[status]}
      className={className}
    />
  )
}

const productStatusTone: Record<ProductStatus, StatusTone> = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning',
}

const productStatusLabel: Record<ProductStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

export function ProductStatusBadge({
  status,
  className,
}: {
  status: ProductStatus
  className?: string
}) {
  return (
    <StatusBadge
      label={productStatusLabel[status]}
      tone={productStatusTone[status]}
      className={className}
    />
  )
}
