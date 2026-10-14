import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'

interface UiState {
  theme: ThemePreference
  adminSidebarCollapsed: boolean
  /** Right-side cart drawer. Not persisted. */
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  setTheme: (theme: ThemePreference) => void
  toggleAdminSidebar: () => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'light',
      adminSidebarCollapsed: false,
      cartOpen: false,
      setCartOpen: (cartOpen) => set({ cartOpen }),
      setTheme: (theme) => set({ theme }),
      toggleAdminSidebar: () => set((s) => ({ adminSidebarCollapsed: !s.adminSidebarCollapsed })),
    }),
    {
      name: 'ui-preferences',
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        adminSidebarCollapsed: state.adminSidebarCollapsed,
      }),
    },
  ),
)
