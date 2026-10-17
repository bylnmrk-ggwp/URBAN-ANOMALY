import { readFileSync } from 'node:fs'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { useUiStore } from '@/stores/uiStore'
import { act, render, screen } from '@/tests/render'

import { ThemeProvider, useTheme } from './ThemeProvider'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Replaces the blanket `matchMedia` mock from src/tests/setup.ts with one that keeps a live
 * `matches` value and really dispatches `change` to its listeners, so the provider's
 * subscription can be exercised and its cleanup observed.
 */
function stubColorScheme(initialDark: boolean) {
  let dark = initialDark
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const original = window.matchMedia

  window.matchMedia = vi.fn((query: string) => {
    const isDarkQuery = query === DARK_QUERY
    return {
      get matches() {
        return isDarkQuery && dark
      },
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (type: string, listener: (event: MediaQueryListEvent) => void) => {
        if (isDarkQuery && type === 'change') listeners.add(listener)
      },
      removeEventListener: (type: string, listener: (event: MediaQueryListEvent) => void) => {
        if (isDarkQuery && type === 'change') listeners.delete(listener)
      },
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList
  }) as unknown as typeof window.matchMedia

  return {
    listenerCount: () => listeners.size,
    emit(nextDark: boolean) {
      dark = nextDark
      act(() => {
        for (const listener of listeners) {
          listener({ matches: nextDark, media: DARK_QUERY } as MediaQueryListEvent)
        }
      })
    },
    restore() {
      window.matchMedia = original
    },
  }
}

/** Runs the blocking inline script from index.html against the current jsdom document. */
function runPrePaintScript() {
  const html = readFileSync(path.join(process.cwd(), 'index.html'), 'utf8')
  const inline = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1]
  if (!inline) throw new Error('index.html has no inline pre-paint script')
  new Function(inline)()
}

function ThemeProbe() {
  const { theme, resolvedTheme } = useTheme()
  return <span data-testid="theme">{`${theme}/${resolvedTheme}`}</span>
}

function renderProvider() {
  return render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  )
}

describe('ThemeProvider', () => {
  let media: ReturnType<typeof stubColorScheme> | null = null

  afterEach(() => {
    media?.restore()
    media = null
    useUiStore.setState({ theme: 'light' })
    document.documentElement.classList.remove('dark')
    document.documentElement.removeAttribute('style')
  })

  it('resolves the OS scheme on the first render and follows later changes on system', () => {
    media = stubColorScheme(false)
    useUiStore.setState({ theme: 'system' })

    renderProvider()

    // No commit needed for the first paint: the snapshot is read during render.
    expect(screen.getByTestId('theme')).toHaveTextContent('system/light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    media.emit(true)

    expect(screen.getByTestId('theme')).toHaveTextContent('system/dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')

    media.emit(false)

    expect(screen.getByTestId('theme')).toHaveTextContent('system/light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('listens only while the preference is system and unsubscribes on unmount', () => {
    media = stubColorScheme(true)
    useUiStore.setState({ theme: 'system' })

    const { unmount } = renderProvider()
    expect(media.listenerCount()).toBe(1)
    expect(screen.getByTestId('theme')).toHaveTextContent('system/dark')

    act(() => {
      useUiStore.setState({ theme: 'light' })
    })
    expect(media.listenerCount()).toBe(0)
    expect(screen.getByTestId('theme')).toHaveTextContent('light/light')

    // An explicit choice ignores the OS even when it changes.
    media.emit(false)
    expect(screen.getByTestId('theme')).toHaveTextContent('light/light')

    act(() => {
      useUiStore.setState({ theme: 'system' })
    })
    expect(media.listenerCount()).toBe(1)

    unmount()
    expect(media.listenerCount()).toBe(0)
  })

  it('agrees with the pre-paint script in index.html on the persisted preference', () => {
    media = stubColorScheme(false)
    useUiStore.getState().setTheme('dark')

    // The script reads this entry by hand, so the key and shape are part of the contract.
    const raw = window.localStorage.getItem('ui-preferences')
    expect(JSON.parse(raw ?? 'null')).toMatchObject({ state: { theme: 'dark' }, version: 1 })

    runPrePaintScript()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')

    // Mounting must confirm what the script painted rather than fight it.
    renderProvider()
    expect(screen.getByTestId('theme')).toHaveTextContent('dark/dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('pre-paints from the OS when the stored preference is system', () => {
    media = stubColorScheme(true)
    useUiStore.getState().setTheme('system')

    runPrePaintScript()
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    renderProvider()
    expect(screen.getByTestId('theme')).toHaveTextContent('system/dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
