import { Inbox } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OrderSummary } from '@/features/orders/domain/entities'
import { formatPrice, formatRelative } from '@/lib/format'

interface RecentOrdersTableProps {
  orders: OrderSummary[] | undefined
  isLoading: boolean
}

const columns: DataTableColumn<OrderSummary>[] = [
  {
    key: 'orderNumber',
    header: 'Order',
    cell: (o) => (
      <Link to={routes.admin.orderDetails(o.id)} className="font-medium hover:underline">
        {o.orderNumber}
      </Link>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    cell: (o) => <span className="truncate">{o.customerName}</span>,
    hideBelow: 'sm',
  },
  { key: 'status', header: 'Status', cell: (o) => <OrderStatusBadge status={o.status} /> },
  {
    key: 'payment',
    header: 'Payment',
    cell: (o) => <PaymentStatusBadge status={o.paymentStatus} />,
    hideBelow: 'lg',
  },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    cell: (o) => <span className="tabular-nums">{formatPrice(o.total)}</span>,
  },
  {
    key: 'date',
    header: 'Placed',
    cell: (o) => <span className="text-muted-foreground">{formatRelative(o.createdAt)}</span>,
    hideBelow: 'md',
  },
]

export function RecentOrdersTable({ orders, isLoading }: RecentOrdersTableProps) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Recent orders</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link to={routes.admin.orders}>View all</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          rows={orders ?? []}
          rowKey={(o) => o.id}
          isLoading={isLoading}
          skeletonRows={5}
          caption="Most recent orders"
          emptyState={<EmptyState icon={Inbox} title="No orders yet" className="py-10" />}
        />
      </CardContent>
    </Card>
  )
}
