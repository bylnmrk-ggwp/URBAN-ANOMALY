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
import type { Category } from '@/features/categories/domain/entities'

import type { AdminProductSort, ProductStatus } from '../../domain/entities'

export type ProductStatusFilter = ProductStatus | 'all'

const STATUS_OPTIONS: { value: ProductStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
]

const SORT_OPTIONS: { value: AdminProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'stock_asc', label: 'Stock: low to high' },
]

const ALL_CATEGORIES = '__all__'

interface ProductsToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  status: ProductStatusFilter
  onStatusChange: (value: ProductStatusFilter) => void
  categoryId: string
  onCategoryChange: (value: string) => void
  sort: AdminProductSort
  onSortChange: (value: AdminProductSort) => void
  categories: Category[]
}

function isStatus(value: string): value is ProductStatusFilter {
  return STATUS_OPTIONS.some((o) => o.value === value)
}

function isSort(value: string): value is AdminProductSort {
  return SORT_OPTIONS.some((o) => o.value === value)
}

export function ProductsToolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  categoryId,
  onCategoryChange,
  sort,
  onSortChange,
  categories,
}: ProductsToolbarProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center">
      <div className="relative flex-1">
        <Label htmlFor="products-search" className="sr-only">
          Search products
        </Label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id="products-search"
          type="search"
          placeholder="Search by name or SKU"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="grid grid-cols-3 gap-2 md:flex">
        <Select value={status} onValueChange={(v) => isStatus(v) && onStatusChange(v)}>
          <SelectTrigger aria-label="Filter by status" className="w-full md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={categoryId || ALL_CATEGORIES}
          onValueChange={(v) => onCategoryChange(v === ALL_CATEGORIES ? '' : v)}
        >
          <SelectTrigger aria-label="Filter by category" className="w-full md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => isSort(v) && onSortChange(v)}>
          <SelectTrigger aria-label="Sort products" className="w-full md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
