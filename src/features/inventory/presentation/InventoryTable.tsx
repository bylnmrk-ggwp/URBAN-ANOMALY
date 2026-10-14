import { History, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { ProductImage } from '@/components/common/ProductImage'
import { StockStatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'

import type { InventoryRow } from '../domain/entities'

interface InventoryTableProps {
  rows: InventoryRow[]
  isLoading: boolean
  emptyState: ReactNode
  onAdjust: (row: InventoryRow) => void
  onHistory: (row: InventoryRow) => void
}

/** Colour swatches are derived from the name only when it is a valid CSS colour keyword; otherwise neutral. */
function ColorCell({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="bg-muted size-3 shrink-0 rounded-full border"
        style={{ backgroundColor: name.toLowerCase().replace(/\s+/g, '') }}
        aria-hidden="true"
      />
      {name}
    </span>
  )
}

function Actions({
  row,
  onAdjust,
  onHistory,
}: Pick<InventoryTableProps, 'onAdjust' | 'onHistory'> & { row: InventoryRow }) {
  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Movement history for ${row.sku}`}
        onClick={() => onHistory(row)}
      >
        <History aria-hidden="true" />
      </Button>
      <Button variant="outline" size="sm" onClick={() => onAdjust(row)}>
        <SlidersHorizontal aria-hidden="true" />
        Adjust
      </Button>
    </div>
  )
}

export function InventoryTable({
  rows,
  isLoading,
  emptyState,
  onAdjust,
  onHistory,
}: InventoryTableProps) {
  const columns: DataTableColumn<InventoryRow>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (r) => (
        <div className="flex items-center gap-3">
          <ProductImage src={r.imageUrl} alt={r.productName} aspect="3/4" className="w-8 rounded" />
          <span className="max-w-48 truncate font-medium">{r.productName}</span>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      cell: (r) => <span className="font-mono text-xs">{r.sku}</span>,
      hideBelow: 'xl',
    },
    { key: 'size', header: 'Size', cell: (r) => r.size },
    {
      key: 'color',
      header: 'Color',
      cell: (r) => <ColorCell name={r.colorName} />,
      hideBelow: 'md',
    },
    {
      key: 'physical',
      header: 'Physical',
      align: 'right',
      cell: (r) => <span className="tabular-nums">{r.physicalStock}</span>,
      hideBelow: 'xl',
    },
    {
      key: 'reserved',
      header: 'Reserved',
      align: 'right',
      cell: (r) => <span className="text-muted-foreground tabular-nums">{r.reservedStock}</span>,
      hideBelow: 'xl',
    },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      cell: (r) => <span className="font-semibold tabular-nums">{r.availableStock}</span>,
    },
    {
      key: 'threshold',
      header: 'Threshold',
      align: 'right',
      cell: (r) => (
        <span className="text-muted-foreground tabular-nums">{r.lowStockThreshold}</span>
      ),
      hideBelow: 'xl',
    },
    { key: 'status', header: 'Status', cell: (r) => <StockStatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (r) => <Actions row={r} onAdjust={onAdjust} onHistory={onHistory} />,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.variantId}
      isLoading={isLoading}
      skeletonRows={10}
      emptyState={emptyState}
      caption="Inventory by variant"
      mobileCard={(r) => (
        <div className="bg-card space-y-3 rounded-lg border p-3">
          <div className="flex items-start gap-3">
            <ProductImage
              src={r.imageUrl}
              alt={r.productName}
              aspect="3/4"
              className="w-12 rounded"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.productName}</p>
              <p className="text-muted-foreground text-xs">
                {r.size} · <ColorCell name={r.colorName} /> ·{' '}
                <span className="font-mono">{r.sku}</span>
              </p>
              <div className="mt-1.5">
                <StockStatusBadge status={r.status} />
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-center text-xs min-[420px]:grid-cols-4">
            {[
              ['Physical', r.physicalStock],
              ['Reserved', r.reservedStock],
              ['Available', r.availableStock],
              ['Threshold', r.lowStockThreshold],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-muted rounded-md px-1 py-1.5">
                <dt className="text-muted-foreground uppercase">{label}</dt>
                <dd
                  className={label === 'Available' ? 'font-semibold tabular-nums' : 'tabular-nums'}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <Actions row={r} onAdjust={onAdjust} onHistory={onHistory} />
        </div>
      )}
    />
  )
}
