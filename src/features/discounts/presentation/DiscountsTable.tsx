import { Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { formatDate, formatPrice } from '@/lib/format'

import type { DiscountCode } from '../domain/entities'
import { discountIneligibleReason } from '../domain/entities'

interface DiscountsTableProps {
  discounts: DiscountCode[]
  isLoading: boolean
  emptyState: ReactNode
  onEdit: (discount: DiscountCode) => void
  onRemove: (discount: DiscountCode) => void
  onToggleActive: (discount: DiscountCode, isActive: boolean) => void
  togglingId: string | null
}

function describeValue(d: DiscountCode): string {
  return d.type === 'percent' ? `${d.value}% off` : `${formatPrice(d.value)} off`
}

function describeWindow(d: DiscountCode): string {
  if (!d.startsAt && !d.endsAt) return 'Always'
  const from = d.startsAt ? formatDate(d.startsAt) : '…'
  const to = d.endsAt ? formatDate(d.endsAt) : '…'
  return `${from} – ${to}`
}

function Status({ d }: { d: DiscountCode }) {
  if (!d.isActive) return <StatusBadge label="Inactive" tone="neutral" />
  const reason = discountIneligibleReason(d, Number.MAX_SAFE_INTEGER)
  if (reason?.includes('expired')) return <StatusBadge label="Expired" tone="destructive" />
  if (reason?.includes('not active yet')) return <StatusBadge label="Scheduled" tone="info" />
  if (reason?.includes('limit')) return <StatusBadge label="Used up" tone="warning" />
  return <StatusBadge label="Active" tone="success" />
}

export function DiscountsTable({
  discounts,
  isLoading,
  emptyState,
  onEdit,
  onRemove,
  onToggleActive,
  togglingId,
}: DiscountsTableProps) {
  const actions = (d: DiscountCode) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit ${d.code}`}
        onClick={() => onEdit(d)}
        className="min-h-11 min-w-11 md:min-h-9 md:min-w-9"
      >
        <Pencil aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${d.code}`}
        onClick={() => onRemove(d)}
        className="text-destructive min-h-11 min-w-11 md:min-h-9 md:min-w-9"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  )

  const toggle = (d: DiscountCode) => (
    <Switch
      checked={d.isActive}
      disabled={togglingId === d.id}
      onCheckedChange={(next) => onToggleActive(d, next)}
      aria-label={`${d.isActive ? 'Deactivate' : 'Activate'} ${d.code}`}
    />
  )

  const columns: DataTableColumn<DiscountCode>[] = [
    {
      key: 'code',
      header: 'Code',
      cell: (d) => (
        <div className="space-y-1">
          <p className="font-mono font-medium">{d.code}</p>
          <Status d={d} />
        </div>
      ),
    },
    { key: 'value', header: 'Value', cell: describeValue },
    {
      key: 'min',
      header: 'Min. subtotal',
      cell: (d) => (d.minSubtotal > 0 ? formatPrice(d.minSubtotal) : '—'),
      hideBelow: 'lg',
    },
    {
      key: 'uses',
      header: 'Uses',
      cell: (d) => (
        <span className="tabular-nums">
          {d.usedCount}
          {d.maxUses !== null ? ` / ${d.maxUses}` : ''}
        </span>
      ),
    },
    { key: 'window', header: 'Window', cell: describeWindow, hideBelow: 'lg' },
    { key: 'active', header: 'Active', cell: toggle },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: actions,
      align: 'right',
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={discounts}
      rowKey={(d) => d.id}
      isLoading={isLoading}
      emptyState={emptyState}
      caption="Discount codes"
      mobileCard={(d) => (
        <article className="space-y-3 rounded-lg border p-4" aria-label={d.code}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="font-mono font-medium">{d.code}</p>
              <Status d={d} />
            </div>
            {toggle(d)}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Value</dt>
            <dd>{describeValue(d)}</dd>
            <dt className="text-muted-foreground">Min. subtotal</dt>
            <dd>{d.minSubtotal > 0 ? formatPrice(d.minSubtotal) : '—'}</dd>
            <dt className="text-muted-foreground">Uses</dt>
            <dd className="tabular-nums">
              {d.usedCount}
              {d.maxUses !== null ? ` / ${d.maxUses}` : ''}
            </dd>
            <dt className="text-muted-foreground">Window</dt>
            <dd className="break-words">{describeWindow(d)}</dd>
          </dl>
          {actions(d)}
        </article>
      )}
    />
  )
}
