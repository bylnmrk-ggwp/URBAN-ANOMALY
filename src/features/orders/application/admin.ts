import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { repositories } from '@/config/repositories'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'
import { paginate, type PaginatedResult } from '@/types/common'

import type {
  AdminOrderFilters,
  OrderStatus,
  OrderSummary,
  OrderTracking,
} from '../domain/entities'
import { ORDER_STATUS_LABELS } from '../domain/rules'

/**
 * The orders list exposes a single "Pending" tab that covers both pending
 * statuses, while the repository filter accepts one status at a time. For that
 * tab we fetch both statuses in one query function and paginate the merged
 * result client-side; pending orders are a small, short-lived set so this stays
 * cheap and keeps the repository contract untouched.
 */
export type AdminOrderStatusFilter = OrderStatus | 'all' | 'pending'

export interface AdminOrdersQuery extends Omit<AdminOrderFilters, 'status'> {
  status?: AdminOrderStatusFilter
}

const PENDING_STATUSES: OrderStatus[] = ['pending_confirmation', 'pending_payment']
const PENDING_FETCH_SIZE = 500

async function fetchAdminOrders(query: AdminOrdersQuery): Promise<PaginatedResult<OrderSummary>> {
  const { status = 'all', page = 1, pageSize = 10, ...rest } = query
  if (status !== 'pending') {
    return repositories.orders.getAdminOrders({ ...rest, status, page, pageSize })
  }
  const results = await Promise.all(
    PENDING_STATUSES.map((s) =>
      repositories.orders.getAdminOrders({
        ...rest,
        status: s,
        page: 1,
        pageSize: PENDING_FETCH_SIZE,
      }),
    ),
  )
  const merged = results
    .flatMap((r) => r.items)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return paginate(merged, page, pageSize)
}

export function useAdminOrders(query: AdminOrdersQuery) {
  return useQuery({
    queryKey: queryKeys.orders.admin(query),
    queryFn: () => fetchAdminOrders(query),
    placeholderData: keepPreviousData,
  })
}

export function useAdminOrder(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.byId(id ?? ''),
    queryFn: () => repositories.orders.getAdminOrderById(id ?? ''),
    enabled: Boolean(id),
  })
}

function useInvalidateOrderData() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all }),
    ])
}

export function useUpdateOrderStatus() {
  const invalidate = useInvalidateOrderData()
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: OrderStatus; note?: string }) =>
      repositories.orders.updateOrderStatus(id, status, note),
    onSuccess: async (order) => {
      await invalidate()
      toast.success(`${order.orderNumber} is now ${ORDER_STATUS_LABELS[order.status]}.`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not update the order status.')),
  })
}

export function useSetTracking() {
  const invalidate = useInvalidateOrderData()
  return useMutation({
    mutationFn: ({ id, tracking }: { id: string; tracking: OrderTracking }) =>
      repositories.orders.setTracking(id, tracking),
    onSuccess: async () => {
      await invalidate()
      toast.success('Tracking details saved.')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save tracking details.')),
  })
}

export function useMarkCodCollected() {
  const invalidate = useInvalidateOrderData()
  return useMutation({
    mutationFn: (id: string) => repositories.orders.markCodPaymentCollected(id),
    onSuccess: async (order) => {
      await invalidate()
      toast.success(`Cash collected for ${order.orderNumber}.`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not record the payment.')),
  })
}

export function useMarkGcashVerified() {
  const invalidate = useInvalidateOrderData()
  return useMutation({
    mutationFn: (id: string) => repositories.orders.markGcashPaymentVerified(id),
    onSuccess: async (order) => {
      await invalidate()
      toast.success(`GCash payment verified for ${order.orderNumber}.`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not record the payment.')),
  })
}

export function useUpdateAdminNotes() {
  const invalidate = useInvalidateOrderData()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      repositories.orders.updateAdminNotes(id, notes),
    onSuccess: async () => {
      await invalidate()
      toast.success('Notes saved.')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save notes.')),
  })
}
