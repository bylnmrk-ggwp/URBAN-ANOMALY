import type { ReactNode } from 'react'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { formatDate, formatPrice, pluralize } from '@/lib/format'

import type { Customer } from '../domain/entities'

interface CustomersTableProps {
  customers: Customer[]
  isLoading: boolean
  emptyState: ReactNode
  onSelect: (customer: Customer) => void
}

const columns: DataTableColumn<Customer>[] = [
  {
    key: 'name',
    header: 'Customer',
    cell: (c) => (
      <div className="min-w-0">
        <p className="font-medium">{c.fullName}</p>
        <p className="text-muted-foreground truncate text-xs md:hidden">{c.email}</p>
      </div>
    ),
  },
  {
    key: 'email',
    header: 'Email',
    cell: (c) => <span className="text-muted-foreground">{c.email}</span>,
    hideBelow: 'md',
  },
  { key: 'phone', header: 'Phone', cell: (c) => c.phone || '—', hideBelow: 'lg' },
  {
    key: 'orders',
    header: 'Orders',
    align: 'right',
    cell: (c) => <span className="tabular-nums">{c.totalOrders}</span>,
  },
  {
    key: 'spent',
    header: 'Total spent',
    align: 'right',
    cell: (c) => <span className="font-medium tabular-nums">{formatPrice(c.totalSpent)}</span>,
  },
  {
    key: 'last',
    header: 'Last order',
    cell: (c) => (
      <span className="text-muted-foreground">
        {c.lastOrderAt ? formatDate(c.lastOrderAt) : '—'}
      </span>
    ),
    hideBelow: 'lg',
  },
]

export function CustomersTable({
  customers,
  isLoading,
  emptyState,
  onSelect,
}: CustomersTableProps) {
  return (
    <DataTable
      columns={columns}
      rows={customers}
      rowKey={(c) => c.id}
      isLoading={isLoading}
      skeletonRows={8}
      emptyState={emptyState}
      caption="Customers"
      onRowClick={onSelect}
      mobileCard={(c) => (
        <button
          type="button"
          onClick={() => onSelect(c)}
          className="bg-card hover:bg-accent focus-visible:ring-ring/50 flex w-full items-start justify-between gap-3 rounded-lg border p-3 text-left text-sm focus-visible:ring-[3px]"
        >
          <div className="min-w-0">
            <p className="font-medium">{c.fullName}</p>
            <p className="text-muted-foreground truncate text-xs">{c.email}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {pluralize(c.totalOrders, 'order')}
              {c.lastOrderAt ? ` · last ${formatDate(c.lastOrderAt)}` : ''}
            </p>
          </div>
          <span className="shrink-0 font-medium tabular-nums">{formatPrice(c.totalSpent)}</span>
        </button>
      )}
    />
  )
}
