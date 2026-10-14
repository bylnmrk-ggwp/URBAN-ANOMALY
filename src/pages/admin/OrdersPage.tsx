import { Inbox } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { DataTablePagination } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { type AdminOrderStatusFilter, useAdminOrders } from '@/features/orders/application/admin'
import { OrdersTable } from '@/features/orders/presentation/admin/OrdersTable'
import { isOrderTab } from '@/features/orders/presentation/admin/orderTabs'
import { OrdersToolbar } from '@/features/orders/presentation/admin/OrdersToolbar'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { pluralize } from '@/lib/format'

const PAGE_SIZE = 10

/** Date inputs produce `YYYY-MM-DD`; widen to the full day in local time before filtering. */
function toIsoBoundary(date: string, edge: 'start' | 'end'): string | undefined {
  if (!date) return undefined
  const d = new Date(`${date}T${edge === 'start' ? '00:00:00' : '23:59:59.999'}`)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

export default function OrdersPage() {
  // Status and search live in the URL so notifications and other pages can deep-link.
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status') ?? 'all'
  const status: AdminOrderStatusFilter = isOrderTab(statusParam) ? statusParam : 'all'
  const search = searchParams.get('search') ?? ''
  const [dates, setDates] = useState({ dateFrom: '', dateTo: '' })
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search.trim())

  const updateParams = (next: { status?: string; search?: string }) => {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value && value !== 'all') params.set(key, value)
      else params.delete(key)
    }
    setSearchParams(params, { replace: true })
    setPage(1)
  }

  const orders = useAdminOrders({
    status,
    search: debouncedSearch || undefined,
    dateFrom: toIsoBoundary(dates.dateFrom, 'start'),
    dateTo: toIsoBoundary(dates.dateTo, 'end'),
    page,
    pageSize: PAGE_SIZE,
  })

  const hasFilters = Boolean(debouncedSearch || dates.dateFrom || dates.dateTo || status !== 'all')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description={
          orders.data
            ? `${pluralize(orders.data.total, 'order')} ${hasFilters ? 'match the current filters' : 'in total'}.`
            : 'Track and fulfil customer orders.'
        }
      />

      <OrdersToolbar
        status={status}
        onStatusChange={(value) => updateParams({ status: value })}
        search={search}
        onSearchChange={(value) => updateParams({ search: value })}
        dateFrom={dates.dateFrom}
        dateTo={dates.dateTo}
        onDateChange={(range) => {
          setDates(range)
          setPage(1)
        }}
      />

      {orders.isError ? (
        <ErrorState
          title="Could not load orders"
          error={orders.error}
          onRetry={() => void orders.refetch()}
          isRetrying={orders.isRefetching}
        />
      ) : (
        <>
          <OrdersTable
            orders={orders.data?.items ?? []}
            isLoading={orders.isPending}
            emptyState={
              <EmptyState
                icon={Inbox}
                title={hasFilters ? 'No orders match these filters' : 'No orders yet'}
                description={
                  hasFilters
                    ? 'Try another status, search term or date range.'
                    : 'Orders placed on the storefront will appear here.'
                }
              />
            }
          />
          {orders.data ? (
            <DataTablePagination
              page={orders.data.page}
              totalPages={orders.data.totalPages}
              total={orders.data.total}
              pageSize={orders.data.pageSize}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  )
}
