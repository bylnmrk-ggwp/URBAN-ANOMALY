import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { useAuth } from '@/features/auth/application/useAuth'
import { queryKeys } from '@/lib/queryKeys'

export function useOrderByNumber(orderNumber: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.byNumber(orderNumber ?? ''),
    queryFn: () => repositories.orders.getOrderByNumber(orderNumber ?? ''),
    enabled: Boolean(orderNumber),
  })
}

/** Guest lookup by order number + email. A mutation so nothing runs until the form submits. */
export function useTrackOrder() {
  return useMutation({
    mutationFn: ({ orderNumber, email }: { orderNumber: string; email: string }) =>
      repositories.orders.trackOrder(orderNumber, email),
  })
}

export function useMyOrders() {
  const { status } = useAuth()
  return useQuery({
    queryKey: queryKeys.orders.mine,
    queryFn: () => repositories.orders.getMyOrders(),
    enabled: status === 'authenticated',
  })
}

export function useMyOrder(id: string | undefined) {
  const { status } = useAuth()
  return useQuery({
    queryKey: queryKeys.orders.byId(id ?? ''),
    queryFn: () => repositories.orders.getMyOrderById(id ?? ''),
    enabled: Boolean(id) && status === 'authenticated',
  })
}

export function useCancelMyOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repositories.orders.cancelMyOrder(id),
    onSuccess: async (order) => {
      queryClient.setQueryData(queryKeys.orders.byId(order.id), order)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
      ])
    },
  })
}
