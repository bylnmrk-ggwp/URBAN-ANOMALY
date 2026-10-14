import { beforeEach, describe, expect, it } from 'vitest'

import {
  WISHLIST_STORAGE_VERSION,
  selectIsWishlisted,
  selectWishlistCount,
  useWishlistStore,
} from './wishlistStore'

describe('wishlistStore', () => {
  beforeEach(() => {
    useWishlistStore.setState({ items: [] })
    window.localStorage.clear()
  })

  it('adds a product once and keeps insertion order', () => {
    const { add } = useWishlistStore.getState()
    add('prod-02')
    add('prod-01')
    add('prod-02')
    expect(useWishlistStore.getState().items).toEqual(['prod-02', 'prod-01'])
    expect(selectWishlistCount(useWishlistStore.getState())).toBe(2)
  })

  it('toggles a product in and out and reports the new state', () => {
    const { toggle } = useWishlistStore.getState()
    expect(toggle('prod-01')).toBe(true)
    expect(selectIsWishlisted('prod-01')(useWishlistStore.getState())).toBe(true)
    expect(toggle('prod-01')).toBe(false)
    expect(selectIsWishlisted('prod-01')(useWishlistStore.getState())).toBe(false)
  })

  it('removes and clears', () => {
    const store = useWishlistStore.getState()
    store.add('a')
    store.add('b')
    store.remove('a')
    expect(useWishlistStore.getState().items).toEqual(['b'])
    store.clear()
    expect(useWishlistStore.getState().items).toEqual([])
  })

  it('persists only the ids under a versioned key', () => {
    useWishlistStore.getState().add('prod-05')
    const raw = window.localStorage.getItem('wishlist')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? '{}') as { state: unknown; version: number }
    expect(parsed.version).toBe(WISHLIST_STORAGE_VERSION)
    expect(parsed.state).toEqual({ items: ['prod-05'] })
  })

  it('drops persisted data written by an unknown version', () => {
    const migrate = useWishlistStore.persist.getOptions().migrate
    expect(migrate).toBeDefined()
    expect(migrate?.({ items: ['x'] }, WISHLIST_STORAGE_VERSION + 1)).toEqual({ items: [] })
    expect(migrate?.({ items: ['x', 3, null] }, WISHLIST_STORAGE_VERSION)).toEqual({
      items: ['x'],
    })
  })
})
