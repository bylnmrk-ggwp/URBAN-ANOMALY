import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { STOCK_STATUS_LABELS, type StockStatus } from '../domain/entities'

export type StockStatusFilter = StockStatus | 'all'

const STATUS_OPTIONS: StockStatusFilter[] = ['all', 'in_stock', 'low_stock', 'out_of_stock']

function isStatus(value: string): value is StockStatusFilter {
  return STATUS_OPTIONS.some((s) => s === value)
}

interface InventoryToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  status: StockStatusFilter
  onStatusChange: (value: StockStatusFilter) => void
}

export function InventoryToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: InventoryToolbarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Label htmlFor="inventory-search" className="sr-only">
          Search inventory
        </Label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id="inventory-search"
          type="search"
          placeholder="Search by product or SKU"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Select value={status} onValueChange={(v) => isStatus(v) && onStatusChange(v)}>
        <SelectTrigger aria-label="Filter by stock status" className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s === 'all' ? 'All stock levels' : STOCK_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
