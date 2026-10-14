import { beforeEach, describe, expect, it } from 'vitest'

import { RECENTLY_VIEWED_LIMIT, useRecentlyViewedStore } from './recentlyViewedStore'

describe('recentlyViewedStore', () => {
  beforeEach(() => {
    useRecentlyViewedStore.setState({ items: [] })
    window.sessionStorage.clear()
  })

  it('puts the latest product first and de-duplicates', () => {
    const { record } = useRecentlyViewedStore.getState()
    record('a')
    record('b')
    record('a')
    expect(useRecentlyViewedStore.getState().items).toEqual(['a', 'b'])
  })

  it('keeps at most the configured number of ids', () => {
    const { record } = useRecentlyViewedStore.getState()
    for (let i = 0; i < RECENTLY_VIEWED_LIMIT + 3; i += 1) record(`p-${i}`)
    const items = useRecentlyViewedStore.getState().items
    expect(items).toHaveLength(RECENTLY_VIEWED_LIMIT)
    expect(items[0]).toBe(`p-${RECENTLY_VIEWED_LIMIT + 2}`)
  })

  it('persists to sessionStorage, not localStorage', () => {
    useRecentlyViewedStore.getState().record('x')
    expect(window.sessionStorage.getItem('recently-viewed')).toContain('"x"')
    expect(window.localStorage.getItem('recently-viewed')).toBeNull()
  })
})
