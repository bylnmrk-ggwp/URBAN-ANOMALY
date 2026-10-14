import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

import type { StockAlert } from '../domain/entities'

export function useStockAlerts() {
  return useQuery({
    queryKey: queryKeys.stockAlerts.all,
    queryFn: () => repositories.stockAlerts.list(),
  })
}

export function useSubscribeStockAlert() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { variantId: string; email: string }) =>
      repositories.stockAlerts.subscribe(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stockAlerts.all }),
  })
}

export function useMarkStockAlertsNotified() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variantId: string) => repositories.stockAlerts.markNotified(variantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.stockAlerts.all }),
  })
}

export interface StockAlertGroup {
  variantId: string
  productId: string
  productName: string
  productSlug: string
  sku: string
  size: StockAlert['size']
  colorName: string
  waitingCount: number
  notifiedCount: number
  /** Emails still waiting, oldest first. */
  waitingEmails: string[]
  latestAt: string
}

/** One row per variant for the admin table. Variants with waiting alerts sort first. */
export function groupStockAlerts(alerts: StockAlert[]): StockAlertGroup[] {
  const groups = new Map<string, StockAlertGroup>()
  for (const alert of [...alerts].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const group = groups.get(alert.variantId) ?? {
      variantId: alert.variantId,
      productId: alert.productId,
      productName: alert.productName,
      productSlug: alert.productSlug,
      sku: alert.sku,
      size: alert.size,
      colorName: alert.colorName,
      waitingCount: 0,
      notifiedCount: 0,
      waitingEmails: [],
      latestAt: alert.createdAt,
    }
    if (alert.status === 'waiting') {
      group.waitingCount += 1
      group.waitingEmails.push(alert.email)
    } else {
      group.notifiedCount += 1
    }
    if (alert.createdAt > group.latestAt) group.latestAt = alert.createdAt
    groups.set(alert.variantId, group)
  }
  return [...groups.values()].sort(
    (a, b) => b.waitingCount - a.waitingCount || b.latestAt.localeCompare(a.latestAt),
  )
}
