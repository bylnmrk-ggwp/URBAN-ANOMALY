import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { repositories } from '@/config/repositories'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'

import type { InventoryFilters, StockAdjustmentInput } from '../domain/entities'

export function useInventory(filters: InventoryFilters) {
  return useQuery({
    queryKey: queryKeys.inventory.list(filters),
    queryFn: () => repositories.inventory.list(filters),
    placeholderData: keepPreviousData,
  })
}

export function useLowStock(limit: number) {
  return useQuery({
    queryKey: [...queryKeys.inventory.all, 'low-stock', limit] as const,
    queryFn: () => repositories.inventory.getLowStock(limit),
  })
}

export function useMovements(variantId: string | null) {
  return useQuery({
    queryKey: queryKeys.inventory.movements(variantId ?? ''),
    queryFn: () => repositories.inventory.getMovements(variantId ?? ''),
    enabled: Boolean(variantId),
  })
}

export function useRecentMovements(limit: number) {
  return useQuery({
    queryKey: [...queryKeys.inventory.all, 'recent-movements', limit] as const,
    queryFn: () => repositories.inventory.getRecentMovements(limit),
  })
}

export function useAdjustStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StockAdjustmentInput) => repositories.inventory.adjustStock(input),
    onSuccess: async (row) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary }),
      ])
      toast.success(`${row.sku} stock is now ${row.physicalStock}.`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not adjust stock.')),
  })
}
