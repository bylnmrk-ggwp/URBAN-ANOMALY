import type { ProductSort } from '@/features/products/domain/entities'

export const PRODUCT_SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'best_selling', label: 'Best selling' },
  { value: 'price_asc', label: 'Price: Low to high' },
  { value: 'price_desc', label: 'Price: High to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
]

export function isProductSort(value: string | null): value is ProductSort {
  return PRODUCT_SORT_OPTIONS.some((option) => option.value === value)
}
