import { describe, expect, it } from 'vitest'

import { availableStock } from '@/features/products/domain/rules'
import { MockStore } from '@/mocks/MockStore'
import { SEED_CLOG_IN_STOCK_VARIANT_ID, SEED_CLOG_SOLD_OUT_VARIANT_ID } from '@/tests/fixtures'

import { MockStockAlertRepository } from './MockStockAlertRepository'

function setup() {
  const store = new MockStore()
  return { store, repo: new MockStockAlertRepository(store) }
}

describe('MockStockAlertRepository', () => {
  it('seeds four waiting alerts that all point at sold-out variants', async () => {
    const { store, repo } = setup()
    const alerts = await repo.list()
    expect(alerts).toHaveLength(4)
    for (const alert of alerts) {
      expect(alert.status).toBe('waiting')
      const found = store.findVariant(alert.variantId)
      expect(found).not.toBeNull()
      if (found) expect(availableStock(found.variant)).toBe(0)
    }
  })

  it('creates an alert and de-duplicates by variant + email (case-insensitive)', async () => {
    const { repo } = setup()
    const first = await repo.subscribe({
      variantId: SEED_CLOG_SOLD_OUT_VARIANT_ID,
      email: 'New.Person@Example.com',
    })
    expect(first.email).toBe('new.person@example.com')
    expect(first.size).toBe('6')
    expect(first.colorName).toBe('Lava')

    const second = await repo.subscribe({
      variantId: SEED_CLOG_SOLD_OUT_VARIANT_ID,
      email: 'new.person@example.com',
    })
    expect(second.id).toBe(first.id)
    expect((await repo.list()).filter((a) => a.id === first.id)).toHaveLength(1)
  })

  it('rejects unknown variants and blank emails', async () => {
    const { repo } = setup()
    await expect(repo.subscribe({ variantId: 'nope', email: 'a@b.co' })).rejects.toThrow()
    await expect(
      repo.subscribe({ variantId: SEED_CLOG_IN_STOCK_VARIANT_ID, email: '   ' }),
    ).rejects.toThrow()
  })

  it('marks every waiting alert for a variant as notified and returns the count', async () => {
    const { repo } = setup()
    const [first] = await repo.list()
    expect(first).toBeDefined()
    const variantId = first?.variantId ?? ''
    const waiting = (await repo.list()).filter(
      (a) => a.variantId === variantId && a.status === 'waiting',
    ).length
    expect(waiting).toBeGreaterThan(0)

    expect(await repo.markNotified(variantId)).toBe(waiting)
    const after = (await repo.list()).filter((a) => a.variantId === variantId)
    for (const alert of after) {
      expect(alert.status).toBe('notified')
      expect(alert.notifiedAt).not.toBeNull()
    }
    expect(await repo.markNotified(variantId)).toBe(0)
  })
})
