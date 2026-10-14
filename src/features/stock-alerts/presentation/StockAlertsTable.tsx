import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { StockAlertGroup } from '@/features/stock-alerts/application/hooks'
import { formatRelative, pluralize } from '@/lib/format'

interface StockAlertsTableProps {
  groups: StockAlertGroup[]
  isLoading: boolean
  emptyState: ReactNode
  onMarkNotified: (group: StockAlertGroup) => void
}

function EmailsDisclosure({ group }: { group: StockAlertGroup }) {
  if (group.waitingEmails.length === 0) {
    return <span className="text-muted-foreground text-sm">No one waiting</span>
  }
  return (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="group/trigger -ml-2 min-h-11 md:min-h-9">
          {pluralize(group.waitingEmails.length, 'email')}
          <ChevronDown
            className="size-4 transition-transform group-data-[state=open]/trigger:rotate-180"
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="mt-1 space-y-1 text-sm">
          {group.waitingEmails.map((email) => (
            <li key={email} className="break-all">
              {email}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  )
}

function WaitingBadge({ group }: { group: StockAlertGroup }) {
  return group.waitingCount > 0 ? (
    <Badge className="bg-warning/15 text-warning border-transparent tabular-nums">
      {group.waitingCount} waiting
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground tabular-nums">
      {group.notifiedCount} notified
    </Badge>
  )
}

export function StockAlertsTable({
  groups,
  isLoading,
  emptyState,
  onMarkNotified,
}: StockAlertsTableProps) {
  const columns: DataTableColumn<StockAlertGroup>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (group) => (
        <div className="min-w-0">
          <Link
            to={routes.product(group.productSlug)}
            className="font-medium hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {group.productName}
          </Link>
          <p className="text-muted-foreground text-xs">SKU {group.sku}</p>
        </div>
      ),
    },
    {
      key: 'variant',
      header: 'Variant',
      cell: (group) => `${group.size} · ${group.colorName}`,
    },
    { key: 'waiting', header: 'Waiting', cell: (group) => <WaitingBadge group={group} /> },
    {
      key: 'emails',
      header: 'Emails',
      hideBelow: 'lg',
      cell: (group) => <EmailsDisclosure group={group} />,
    },
    {
      key: 'latest',
      header: 'Last request',
      hideBelow: 'lg',
      cell: (group) => (
        <span className="text-muted-foreground">{formatRelative(group.latestAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: (group) => (
        <Button
          size="sm"
          variant="outline"
          disabled={group.waitingCount === 0}
          onClick={() => onMarkNotified(group)}
        >
          Mark notified
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={groups}
      rowKey={(group) => group.variantId}
      isLoading={isLoading}
      emptyState={emptyState}
      caption="Back-in-stock alerts grouped by variant"
      mobileCard={(group) => (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={routes.product(group.productSlug)} className="font-medium hover:underline">
                {group.productName}
              </Link>
              <p className="text-muted-foreground text-sm">
                {group.size} · {group.colorName}
              </p>
              <p className="text-muted-foreground text-xs">SKU {group.sku}</p>
            </div>
            <WaitingBadge group={group} />
          </div>
          <EmailsDisclosure group={group} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-xs">{formatRelative(group.latestAt)}</span>
            <Button
              size="sm"
              variant="outline"
              className="min-h-11"
              disabled={group.waitingCount === 0}
              onClick={() => onMarkNotified(group)}
            >
              Mark notified
            </Button>
          </div>
        </div>
      )}
    />
  )
}
