/**
 * Shared render helpers for component and integration tests.
 *
 * Repository strategy: tests use the real composition root (`@/config/repositories`),
 * which resolves to the mock repositories because `VITE_DATA_MODE` defaults to `mock`
 * and `MockStore.delay()` is instant under Vitest. Vitest isolates modules per test
 * file, so every spec file gets its own fresh in-memory store, while tests inside one
 * file share it. Specs are therefore written so that they either do not depend on
 * cross-test state or create uniquely identified records. `resetMockSession()` signs
 * out between tests because the mock auth repository persists sessions in
 * `sessionStorage`, which `src/tests/setup.ts` does not clear.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'

import { AuthProvider } from '@/app/providers/AuthProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { repositories } from '@/config/repositories'
import { useCartStore } from '@/stores/cartStore'

// eslint-disable-next-line react-refresh/only-export-components -- test helper module, not a component file
export * from '@testing-library/react'
export { userEvent }

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Route pattern the `ui` is mounted on (e.g. `/products/:slug`). When set, the UI is
   * rendered inside `<Routes>` so `useParams()` resolves against `initialEntries`.
   */
  route?: string
  /** Initial history stack for the MemoryRouter. Defaults to `['/']`. */
  initialEntries?: string[]
  /** Extra sibling routes, rendered next to the main `route`. */
  extraRoutes?: ReactNode
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  })
}

export function renderWithProviders(
  ui: ReactElement,
  { route, initialEntries = ['/'], extraRoutes, ...options }: RenderWithProvidersOptions = {},
): RenderResult & { queryClient: QueryClient; user: ReturnType<typeof userEvent.setup> } {
  const queryClient = createTestQueryClient()
  // `delay: null` skips user-event's per-keystroke wait; typing long forms stays well under
  // the test timeout on slower machines.
  const user = userEvent.setup({ delay: null })

  const content = route ? (
    <Routes>
      <Route path={route} element={ui} />
      {extraRoutes}
    </Routes>
  ) : (
    ui
  )

  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ThemeProvider>
          <AuthProvider>
            <TooltipProvider>{content}</TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>
    </QueryClientProvider>,
    options,
  )

  return { ...result, queryClient, user }
}

export const DEMO_ACCOUNTS = {
  admin: { email: 'admin@demo.local', password: 'password' },
  buyer: { email: 'buyer@demo.local', password: 'password' },
} as const

/** Starts a session in the shared mock store before rendering. */
export async function signInAs(role: keyof typeof DEMO_ACCOUNTS) {
  return repositories.auth.signIn(DEMO_ACCOUNTS[role])
}

/** Clears the mock session and the in-memory cart so tests start from a known state. */
export async function resetMockSession() {
  await repositories.auth.signOut()
  window.sessionStorage.clear()
  useCartStore.setState({ items: [], lastAnnouncement: null })
}
