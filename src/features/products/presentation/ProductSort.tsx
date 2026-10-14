import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProductSort as ProductSortValue } from '@/features/products/domain/entities'

import { PRODUCT_SORT_OPTIONS, isProductSort } from './productSortOptions'

interface ProductSortProps {
  value: ProductSortValue
  onChange: (value: ProductSortValue) => void
  className?: string
}

export function ProductSort({ value, onChange, className }: ProductSortProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isProductSort(next)) onChange(next)
      }}
    >
      <SelectTrigger aria-label="Sort products" className={className}>
        <span className="text-muted-foreground mr-1 hidden sm:inline">Sort:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {PRODUCT_SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
