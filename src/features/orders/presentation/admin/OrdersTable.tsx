import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import {
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
} from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { formatDateTime, formatPrice, pluralize } from '@/lib/format'

import type { OrderSummary } from '../../domain/entities'

interface OrdersTableProps {
  orders: OrderSummary[]
  isLoading: boolean
  emptyState: ReactNode
}

const columns: DataTableColumn<OrderSummary>[] = [
  {
    key: 'number',
    header: 'Order',
    cell: (o) => (
      <Link
        to={routes.admin.orderDetails(o.id)}
        className="font-medium hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {o.orderNumber}
      </Link>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    cell: (o) => (
      <div className="min-w-0">
        <p className="max-w-48 truncate">{o.customerName}</p>
        <p className="text-muted-foreground max-w-48 truncate text-xs">{o.customerEmail}</p>
      </div>
    ),
  },
  {
    key: 'date',
    header: 'Date',
    cell: (o) => (
      <span className="text-muted-foreground whitespace-nowrap">{formatDateTime(o.createdAt)}</span>
    ),
    hideBelow: 'lg',
  },
  {
    key: 'items',
    header: 'Items',
    align: 'right',
    cell: (o) => <span className="tabular-nums">{o.itemCount}</span>,
    hideBelow: 'md',
  },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    cell: (o) => <span className="font-medium tabular-nums">{formatPrice(o.total)}</span>,
  },
  {
    key: 'method',
    header: 'Method',
    cell: (o) => <PaymentMethodBadge method={o.paymentMethod} />,
    hideBelow: 'lg',
  },
  {
    key: 'payment',
    header: 'Payment',
    cell: (o) => <PaymentStatusBadge status={o.paymentStatus} />,
    hideBelow: 'md',
  },
  { key: 'status', header: 'Status', cell: (o) => <OrderStatusBadge status={o.status} /> },
  {
    key: 'actions',
    header: <span className="sr-only">Actions</span>,
    align: 'right',
    cell: (o) => (
      <Button asChild variant="ghost" size="sm">
        <Link to={routes.admin.orderDetails(o.id)} onClick={(e) => e.stopPropagation()}>
          View
        </Link>
      </Button>
    ),
  },
]

export function OrdersTable({ orders, isLoading, emptyState }: OrdersTableProps) {
  const navigate = useNavigate()

  return (
    <DataTable
      columns={columns}
      rows={orders}
      rowKey={(o) => o.id}
      isLoading={isLoading}
      skeletonRows={10}
      emptyState={emptyState}
      caption="Orders"
      onRowClick={(o) => void navigate(routes.admin.orderDetails(o.id))}
      mobileCard={(o) => (
        <Link
          to={routes.admin.orderDetails(o.id)}
          className="bg-card block space-y-2 rounded-lg border p-3 text-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium">{o.orderNumber}</p>
              <p className="text-muted-foreground text-xs">{formatDateTime(o.createdAt)}</p>
            </div>
            <span className="font-medium tabular-nums">{formatPrice(o.total)}</span>
          </div>
          <p className="truncate">
            {o.customerName} <span className="text-muted-foreground">· {o.customerEmail}</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <OrderStatusBadge status={o.status} />
            <PaymentStatusBadge status={o.paymentStatus} />
            <PaymentMethodBadge method={o.paymentMethod} />
            <span className="text-muted-foreground text-xs">{pluralize(o.itemCount, 'item')}</span>
          </div>
        </Link>
      )}
    />
  )
}
