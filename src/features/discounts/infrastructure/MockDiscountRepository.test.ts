import { beforeEach, describe, expect, it } from 'vitest'

import type { Repositories } from '@/config/repositories'
import { isAppError } from '@/lib/errors'
import { createMockRepositoriesForTest } from '@/mocks/createMockRepositories'
import type { MockStore } from '@/mocks/MockStore'

import type { DiscountInput } from '../domain/entities'

const NEW_CODE: DiscountInput = {
  code: 'spring-5',
  type: 'fixed',
  value: 5,
  minSubtotal: 0,
  maxUses: null,
  startsAt: null,
  endsAt: null,
  isActive: true,
}

async function rejectsWith(promise: Promise<unknown>, code: string, message?: RegExp) {
  await expect(promise).rejects.toSatisfy((error: unknown) => {
    if (!isAppError(error) || error.code !== code) return false
    return message ? message.test(error.message) : true
  })
}

describe('MockDiscountRepository', () => {
  let repositories: Repositories
  let store: MockStore

  beforeEach(() => {
    ;({ repositories, store } = createMockRepositoriesForTest())
  })

  describe('validate', () => {
    it('applies a percent code case-insensitively and caps fixed codes at the subtotal', async () => {
      await expect(repositories.discounts.validate('welcome10', 2000)).resolves.toEqual({
        code: 'WELCOME10',
        type: 'percent',
        value: 10,
        amount: 200,
      })
      await expect(repositories.discounts.validate('FREESHIP', 100)).resolves.toMatchObject({
        amount: 100,
      })
    })

    it('rejects unknown, expired, under-minimum and inactive codes with reasons', async () => {
      await rejectsWith(repositories.discounts.validate('NOPE', 5000), 'validation', /not valid/)
      await rejectsWith(repositories.discounts.validate('LAUNCH20', 5000), 'validation', /expired/)
      await rejectsWith(
        repositories.discounts.validate('SUMMER500', 1000),
        'validation',
        /minimum order/,
      )
      const welcome = store.discounts.find((d) => d.code === 'WELCOME10')
      if (welcome) welcome.isActive = false
      await rejectsWith(
        repositories.discounts.validate('WELCOME10', 5000),
        'validation',
        /no longer active/,
      )
    })
  })

  describe('admin CRUD', () => {
    it('is admin-only', async () => {
      await rejectsWith(repositories.discounts.list(), 'forbidden')
      await repositories.auth.signIn({ email: 'buyer@demo.local', password: 'password' })
      await rejectsWith(repositories.discounts.create(NEW_CODE), 'forbidden')
    })

    it('creates, updates, removes and enforces unique codes', async () => {
      await repositories.auth.signIn({ email: 'admin@demo.local', password: 'password' })
      expect(await repositories.discounts.list()).toHaveLength(4)

      const created = await repositories.discounts.create(NEW_CODE)
      expect(created).toMatchObject({ code: 'SPRING-5', usedCount: 0, type: 'fixed' })
      expect(await repositories.discounts.list()).toHaveLength(5)

      await rejectsWith(
        repositories.discounts.create({ ...NEW_CODE, code: 'welcome10' }),
        'conflict',
      )

      const updated = await repositories.discounts.update(created.id, {
        ...NEW_CODE,
        isActive: false,
      })
      expect(updated.isActive).toBe(false)
      await rejectsWith(repositories.discounts.validate('SPRING-5', 500), 'validation')

      await repositories.discounts.remove(created.id)
      expect(await repositories.discounts.list()).toHaveLength(4)
      await rejectsWith(repositories.discounts.remove(created.id), 'not_found')
    })
  })
})
