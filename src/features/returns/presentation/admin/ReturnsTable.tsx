import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import type { ReturnRequest } from '@/features/returns/domain/entities'
import { formatDateTime, formatPrice, pluralize } from '@/lib/format'

import { ReturnStatusBadge } from '../ReturnStatusBadge'

interface ReturnsTableProps {
  requests: ReturnRequest[]
  isLoading: boolean
  emptyState: ReactNode
  onSelect: (request: ReturnRequest) => void
}

function itemCount(request: ReturnRequest) {
  return request.items.reduce((sum, item) => sum + item.quantity, 0)
}

const columns: DataTableColumn<ReturnRequest>[] = [
  {
    key: 'order',
    header: 'Order',
    cell: (r) => (
      <Link
        to={routes.admin.orderDetails(r.orderId)}
        className="font-medium hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {r.orderNumber}
      </Link>
    ),
  },
  {
    key: 'customer',
    header: 'Customer',
    cell: (r) => (
      <div className="min-w-0">
        <p className="max-w-48 truncate">{r.customerName}</p>
        <p className="text-muted-foreground max-w-48 truncate text-xs">{r.customerEmail}</p>
      </div>
    ),
  },
  {
    key: 'items',
    header: 'Items',
    align: 'right',
    cell: (r) => <span className="tabular-nums">{itemCount(r)}</span>,
    hideBelow: 'md',
  },
  {
    key: 'amount',
    header: 'Refund',
    align: 'right',
    cell: (r) => <span className="font-medium tabular-nums">{formatPrice(r.refundAmount)}</span>,
  },
  {
    key: 'resolution',
    header: 'Resolution',
    cell: (r) => (r.resolution === 'refund' ? 'Refund' : 'Exchange'),
    hideBelow: 'lg',
  },
  { key: 'status', header: 'Status', cell: (r) => <ReturnStatusBadge status={r.status} /> },
  {
    key: 'date',
    header: 'Requested',
    cell: (r) => (
      <span className="text-muted-foreground whitespace-nowrap">{formatDateTime(r.createdAt)}</span>
    ),
    hideBelow: 'lg',
  },
]

export function ReturnsTable({ requests, isLoading, emptyState, onSelect }: ReturnsTableProps) {
  return (
    <DataTable
      columns={columns}
      rows={requests}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      emptyState={emptyState}
      caption="Return requests"
      onRowClick={onSelect}
      mobileCard={(r) => (
        <button
          type="button"
          onClick={() => onSelect(r)}
          className="bg-card block w-full space-y-2 rounded-lg border p-3 text-left text-sm"
          aria-label={`Open return for ${r.orderNumber}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium">{r.orderNumber}</p>
              <p className="text-muted-foreground text-xs">{formatDateTime(r.createdAt)}</p>
            </div>
            <span className="font-medium tabular-nums">{formatPrice(r.refundAmount)}</span>
          </div>
          <p className="truncate">
            {r.customerName} <span className="text-muted-foreground">· {r.customerEmail}</span>
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <ReturnStatusBadge status={r.status} />
            <span className="text-muted-foreground text-xs">
              {pluralize(itemCount(r), 'item')} ·{' '}
              {r.resolution === 'refund' ? 'Refund' : 'Exchange'}
            </span>
          </div>
        </button>
      )}
    />
  )
}
