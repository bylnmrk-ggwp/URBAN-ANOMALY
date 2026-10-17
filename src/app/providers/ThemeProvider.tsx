import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'

import { useUiStore, type ThemePreference } from '@/stores/uiStore'

type ResolvedTheme = 'light' | 'dark'

const DARK_QUERY = '(prefers-color-scheme: dark)'

interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** The OS colour-scheme query, or null where `matchMedia` is unavailable (SSR, old jsdom). */
function darkMediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia(DARK_QUERY)
}

function prefersDark(): boolean {
  return darkMediaQuery()?.matches ?? false
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  // The OS colour scheme is external mutable state, so `useSyncExternalStore` is a better fit
  // than state plus an effect: the snapshot is read during render, which keeps the first paint
  // correct without a second commit, and React owns the subscribe/unsubscribe lifecycle. The
  // subscription is deliberately a no-op unless the preference is 'system' — an explicit light
  // or dark choice listens to nothing, and switching away from 'system' tears the listener down
  // because `subscribe` changes identity with `theme`.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const media = theme === 'system' ? darkMediaQuery() : null
      if (!media) return () => {}
      media.addEventListener('change', onStoreChange)
      return () => media.removeEventListener('change', onStoreChange)
    },
    [theme],
  )
  const systemPrefersDark = useSyncExternalStore(subscribe, prefersDark, () => false)

  const resolvedTheme: ResolvedTheme =
    theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme

  // The inline script in index.html has already applied this before first paint; on mount this
  // writes the same two values, so the two never disagree.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Toaster may render outside the provider in isolated tests; fall back to light.
    return { theme: 'light', resolvedTheme: 'light', setTheme: () => {} }
  }
  return ctx
}
