import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

import type { ReturnRequestInput, ReturnStatus } from '../domain/entities'

export function useOrderReturn(orderId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.returns.forOrder(orderId ?? ''),
    queryFn: () => repositories.returns.getForOrder(orderId ?? ''),
    enabled: Boolean(orderId),
  })
}

/** Refunds change the order's payment status, so order queries are refreshed too. */
function useInvalidateReturns() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.returns.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
    ])
}

export function useRequestReturn() {
  const invalidate = useInvalidateReturns()
  return useMutation({
    mutationFn: (input: ReturnRequestInput) => repositories.returns.request(input),
    onSuccess: invalidate,
  })
}

export function useAdminReturns(status: ReturnStatus | 'all' = 'all') {
  return useQuery({
    queryKey: queryKeys.returns.admin(status),
    queryFn: () => repositories.returns.listAdmin(status),
  })
}

export function useUpdateReturnStatus() {
  const invalidate = useInvalidateReturns()
  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNote,
    }: {
      id: string
      status: ReturnStatus
      adminNote: string
    }) => repositories.returns.updateStatus(id, status, adminNote),
    onSuccess: invalidate,
  })
}
