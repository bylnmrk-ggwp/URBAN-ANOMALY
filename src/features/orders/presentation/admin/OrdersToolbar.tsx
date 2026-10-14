import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { AdminOrderStatusFilter } from '../../application/admin'
import { isOrderTab, ORDER_TABS } from './orderTabs'

interface OrdersToolbarProps {
  status: AdminOrderStatusFilter
  onStatusChange: (value: AdminOrderStatusFilter) => void
  search: string
  onSearchChange: (value: string) => void
  dateFrom: string
  dateTo: string
  onDateChange: (range: { dateFrom: string; dateTo: string }) => void
}

export function OrdersToolbar({
  status,
  onStatusChange,
  search,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateChange,
}: OrdersToolbarProps) {
  const hasDates = Boolean(dateFrom || dateTo)

  return (
    <div className="space-y-3">
      <Tabs value={status} onValueChange={(v) => isOrderTab(v) && onStatusChange(v)}>
        <div className="overflow-x-auto pb-1">
          <TabsList variant="line" aria-label="Filter orders by status">
            {ORDER_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="px-3">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
        <div className="relative flex-1">
          <Label htmlFor="orders-search" className="sr-only">
            Search orders
          </Label>
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id="orders-search"
            type="search"
            placeholder="Order number, customer name or email"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor="orders-from" className="text-muted-foreground text-xs">
              From
            </Label>
            <Input
              id="orders-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => onDateChange({ dateFrom: e.target.value, dateTo })}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <Label htmlFor="orders-to" className="text-muted-foreground text-xs">
              To
            </Label>
            <Input
              id="orders-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => onDateChange({ dateFrom, dateTo: e.target.value })}
            />
          </div>
          {hasDates ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear date range"
              onClick={() => onDateChange({ dateFrom: '', dateTo: '' })}
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
