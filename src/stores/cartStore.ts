import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { CartItem } from '@/features/cart/domain/entities'
import { CART_STORAGE_VERSION, MAX_QUANTITY_PER_LINE } from '@/features/cart/domain/entities'
import { countItems } from '@/features/cart/domain/rules'

interface CartState {
  items: CartItem[]
  /** Set after a successful cart action so the UI can announce it to screen readers. */
  lastAnnouncement: string | null
  addItem: (input: {
    productId: string
    variantId: string
    quantity: number
    maxQuantity: number
  }) => void
  setQuantity: (variantId: string, quantity: number, maxQuantity?: number) => void
  removeItem: (variantId: string) => void
  clearCart: () => void
  announce: (message: string | null) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      lastAnnouncement: null,
      addItem: ({ productId, variantId, quantity, maxQuantity }) =>
        set((state) => {
          const cap = Math.min(MAX_QUANTITY_PER_LINE, Math.max(0, maxQuantity))
          const existing = state.items.find((i) => i.variantId === variantId)
          if (existing) {
            const next = Math.min(cap, existing.quantity + quantity)
            return {
              items: state.items.map((i) =>
                i.variantId === variantId ? { ...i, quantity: next } : i,
              ),
            }
          }
          const item: CartItem = {
            productId,
            variantId,
            quantity: Math.min(cap, Math.max(1, quantity)),
            addedAt: new Date().toISOString(),
          }
          return { items: [...state.items, item] }
        }),
      setQuantity: (variantId, quantity, maxQuantity = MAX_QUANTITY_PER_LINE) =>
        set((state) => {
          const cap = Math.min(MAX_QUANTITY_PER_LINE, Math.max(0, maxQuantity))
          const next = Math.min(cap, Math.floor(quantity))
          if (next <= 0) return { items: state.items.filter((i) => i.variantId !== variantId) }
          return {
            items: state.items.map((i) =>
              i.variantId === variantId ? { ...i, quantity: next } : i,
            ),
          }
        }),
      removeItem: (variantId) =>
        set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      clearCart: () => set({ items: [] }),
      announce: (message) => set({ lastAnnouncement: message }),
    }),
    {
      name: 'shopping-cart',
      version: CART_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      migrate: (persisted, version) => {
        // Future schema changes bump CART_STORAGE_VERSION and transform here.
        if (version !== CART_STORAGE_VERSION) return { items: [] }
        return persisted as { items: CartItem[] }
      },
    },
  ),
)

export const selectCartCount = (state: CartState) => countItems(state.items)
