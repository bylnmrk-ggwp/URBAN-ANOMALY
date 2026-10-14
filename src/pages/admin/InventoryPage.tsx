import { Boxes } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { DataTablePagination } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { useInventory } from '@/features/inventory/application/hooks'
import type { InventoryRow } from '@/features/inventory/domain/entities'
import { AdjustStockDialog } from '@/features/inventory/presentation/AdjustStockDialog'
import { InventoryTable } from '@/features/inventory/presentation/InventoryTable'
import {
  InventoryToolbar,
  type StockStatusFilter,
} from '@/features/inventory/presentation/InventoryToolbar'
import { MovementsSheet } from '@/features/inventory/presentation/MovementsSheet'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const PAGE_SIZE = 15

export default function InventoryPage() {
  // `?search=` lets the dashboard deep-link straight to a variant.
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const [status, setStatus] = useState<StockStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null)
  const [history, setHistory] = useState<InventoryRow | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim())

  const inventory = useInventory({
    search: debouncedSearch || undefined,
    status,
    page,
    pageSize: PAGE_SIZE,
  })

  const setSearch = (value: string) => {
    setSearchParams(value ? { search: value } : {}, { replace: true })
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock levels per variant. Reserved units belong to unpaid or unconfirmed orders."
      />

      <InventoryToolbar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={(value) => {
          setStatus(value)
          setPage(1)
        }}
      />

      {inventory.isError ? (
        <ErrorState
          title="Could not load inventory"
          error={inventory.error}
          onRetry={() => void inventory.refetch()}
          isRetrying={inventory.isRefetching}
        />
      ) : (
        <>
          <InventoryTable
            rows={inventory.data?.items ?? []}
            isLoading={inventory.isPending}
            onAdjust={setAdjusting}
            onHistory={setHistory}
            emptyState={
              <EmptyState
                icon={Boxes}
                title="No variants found"
                description={
                  debouncedSearch || status !== 'all'
                    ? 'Try a different search or stock filter.'
                    : 'Variants appear here once products have been created.'
                }
              />
            }
          />
          {inventory.data ? (
            <DataTablePagination
              page={inventory.data.page}
              totalPages={inventory.data.totalPages}
              total={inventory.data.total}
              pageSize={inventory.data.pageSize}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}

      <p className="text-muted-foreground text-xs">
        Adjustments are recorded as audited movements; stock is never overwritten directly.
      </p>

      <AdjustStockDialog
        row={adjusting}
        onOpenChange={(open) => {
          if (!open) setAdjusting(null)
        }}
      />
      <MovementsSheet
        row={history}
        onOpenChange={(open) => {
          if (!open) setHistory(null)
        }}
      />
    </div>
  )
}
