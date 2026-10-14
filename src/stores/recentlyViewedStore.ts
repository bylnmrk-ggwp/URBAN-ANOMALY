import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const RECENTLY_VIEWED_LIMIT = 8
export const RECENTLY_VIEWED_STORAGE_VERSION = 1

interface RecentlyViewedState {
  /** Product ids, most recent first. Capped at RECENTLY_VIEWED_LIMIT. */
  items: string[]
  record: (productId: string) => void
  clear: () => void
}

/** Session-scoped so the list resets when the tab closes, like a browsing trail should. */
export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      record: (productId) =>
        set((state) => ({
          items: [productId, ...state.items.filter((id) => id !== productId)].slice(
            0,
            RECENTLY_VIEWED_LIMIT,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'recently-viewed',
      version: RECENTLY_VIEWED_STORAGE_VERSION,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ items: state.items }),
      migrate: (persisted, version) => {
        if (version !== RECENTLY_VIEWED_STORAGE_VERSION) return { items: [] }
        const candidate = persisted as { items?: unknown }
        const items = Array.isArray(candidate.items)
          ? candidate.items.filter((id): id is string => typeof id === 'string')
          : []
        return { items: items.slice(0, RECENTLY_VIEWED_LIMIT) }
      },
    },
  ),
)
