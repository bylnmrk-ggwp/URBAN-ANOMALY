import type { AdminOrderStatusFilter } from '../../application/admin'

export const ORDER_TABS: { value: AdminOrderStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function isOrderTab(value: string): value is AdminOrderStatusFilter {
  return ORDER_TABS.some((t) => t.value === value)
}
