import { useCallback, useEffect, useMemo, useState } from 'react'

import { useProductsByIds } from '@/features/products/application/storefront'
import type { Product, ProductVariant } from '@/features/products/domain/entities'
import { availableStock } from '@/features/products/domain/rules'
import { useCartStore } from '@/stores/cartStore'
import { useUiStore } from '@/stores/uiStore'

import type { ResolvedCartLine } from '../domain/entities'
import {
  calculateTotals,
  hasBlockingIssues as linesHaveBlockingIssues,
  resolveCartLines,
} from '../domain/rules'

/** Variant id -> stock the line was reduced to. Kept so the notice survives the store sync. */
export type QuantityAdjustments = Record<string, number>

/**
 * Joins the persisted cart (ids + quantities only) with trusted catalog data so that
 * prices and stock always reflect the current catalog.
 */
export function useCart() {
  const items = useCartStore((state) => state.items)
  const storeAddItem = useCartStore((state) => state.addItem)
  const storeSetQuantity = useCartStore((state) => state.setQuantity)
  const storeRemoveItem = useCartStore((state) => state.removeItem)
  const storeClearCart = useCartStore((state) => state.clearCart)
  const announce = useCartStore((state) => state.announce)
  const [adjustments, setAdjustments] = useState<QuantityAdjustments>({})

  const productIds = useMemo(
    () => [...new Set(items.map((item) => item.productId))].sort(),
    [items],
  )
  const query = useProductsByIds(productIds)
  const products = query.data

  const coversAllItems = products
    ? items.every((item) => products.some((product) => product.id === item.productId))
    : items.length === 0
  const isLoading =
    items.length > 0 &&
    !coversAllItems &&
    (query.isPending || query.isPlaceholderData || query.isFetching)

  const lines = useMemo<ResolvedCartLine[]>(() => {
    if (items.length === 0 || !products || isLoading) return []
    return resolveCartLines(items, products)
  }, [items, products, isLoading])

  // Remember which lines the catalog reduced so the notice survives the store sync below.
  const [seenLines, setSeenLines] = useState(lines)
  if (lines !== seenLines) {
    setSeenLines(lines)
    const reduced = lines.filter((line) => line.issue === 'quantity_reduced')
    if (reduced.length > 0) {
      const next = { ...adjustments }
      for (const line of reduced) next[line.item.variantId] = line.availableStock
      setAdjustments(next)
    }
  }

  // Sync persisted quantities down once the catalog reports less stock than requested.
  useEffect(() => {
    for (const line of lines) {
      if (line.issue === 'quantity_reduced') {
        storeSetQuantity(line.item.variantId, line.item.quantity, line.availableStock)
      }
    }
  }, [lines, storeSetQuantity])

  const clearAdjustment = useCallback((variantId: string) => {
    setAdjustments((current) => {
      if (!(variantId in current)) return current
      const next = { ...current }
      delete next[variantId]
      return next
    })
  }, [])

  const addItem = useCallback(
    (product: Product, variant: ProductVariant, quantity: number) => {
      storeAddItem({
        productId: product.id,
        variantId: variant.id,
        quantity,
        maxQuantity: availableStock(variant),
      })
      const message = `Added ${quantity} × ${product.name} (${variant.size}, ${variant.color.name}) to your cart`
      announce(message)
      // The drawer opens to confirm the add; the toast would only cover it.
      useUiStore.getState().setCartOpen(true)
    },
    [storeAddItem, announce],
  )

  const setQuantity = useCallback(
    (line: ResolvedCartLine, quantity: number) => {
      clearAdjustment(line.item.variantId)
      storeSetQuantity(line.item.variantId, quantity, line.availableStock)
    },
    [storeSetQuantity, clearAdjustment],
  )

  const removeLine = useCallback(
    (line: ResolvedCartLine) => {
      clearAdjustment(line.item.variantId)
      storeRemoveItem(line.item.variantId)
      const name = line.product?.name ?? 'Item'
      announce(`Removed ${name} from your cart`)
    },
    [storeRemoveItem, clearAdjustment, announce],
  )

  const clearCart = useCallback(() => {
    setAdjustments({})
    storeClearCart()
  }, [storeClearCart])

  const totals = useMemo(() => calculateTotals(lines), [lines])

  return {
    items,
    lines,
    totals,
    adjustments,
    isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    hasBlockingIssues: linesHaveBlockingIssues(lines),
    addItem,
    setQuantity,
    removeLine,
    clearCart,
  }
}

export type CartController = ReturnType<typeof useCart>
