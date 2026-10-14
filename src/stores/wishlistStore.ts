import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const WISHLIST_STORAGE_VERSION = 1

interface WishlistState {
  /** Product ids, oldest first. Product data is always re-read from the catalog. */
  items: string[]
  add: (productId: string) => void
  remove: (productId: string) => void
  /** Returns `true` when the product was added, `false` when it was removed. */
  toggle: (productId: string) => boolean
  clear: () => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (productId) =>
        set((state) =>
          state.items.includes(productId) ? state : { items: [...state.items, productId] },
        ),
      remove: (productId) =>
        set((state) => ({ items: state.items.filter((id) => id !== productId) })),
      toggle: (productId) => {
        const exists = get().items.includes(productId)
        if (exists) get().remove(productId)
        else get().add(productId)
        return !exists
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: 'wishlist',
      version: WISHLIST_STORAGE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      migrate: (persisted, version) => {
        // Future schema changes bump WISHLIST_STORAGE_VERSION and transform here.
        if (version !== WISHLIST_STORAGE_VERSION) return { items: [] }
        const candidate = persisted as { items?: unknown }
        const items = Array.isArray(candidate.items)
          ? candidate.items.filter((id): id is string => typeof id === 'string')
          : []
        return { items }
      },
    },
  ),
)

export const selectWishlistCount = (state: WishlistState) => state.items.length
export const selectIsWishlisted = (productId: string) => (state: WishlistState) =>
  state.items.includes(productId)
