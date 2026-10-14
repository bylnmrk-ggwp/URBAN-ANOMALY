import { AppError } from '@/lib/errors'
import type { MockStore } from '@/mocks/MockStore'
import { SEED_DISCOUNTS } from '@/mocks/data/discounts'
import { clone, nowIso } from '@/mocks/helpers'

import type {
  AppliedDiscount,
  DiscountCode,
  DiscountInput,
  DiscountRepository,
} from '../domain/entities'
import { computeDiscountAmount, discountIneligibleReason } from '../domain/entities'

export class MockDiscountRepository implements DiscountRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
    if (this.store.discounts.length === 0) this.store.discounts = clone(SEED_DISCOUNTS)
  }

  async validate(code: string, subtotal: number): Promise<AppliedDiscount> {
    await this.store.delay()
    const normalized = code.trim().toUpperCase()
    const found = this.store.discounts.find((d) => d.code === normalized)
    if (!found) throw new AppError('validation', 'That code is not valid.')
    const reason = discountIneligibleReason(found, subtotal)
    if (reason) throw new AppError('validation', reason)
    return {
      code: found.code,
      type: found.type,
      value: found.value,
      amount: computeDiscountAmount(found, subtotal),
    }
  }

  async list(): Promise<DiscountCode[]> {
    await this.store.delay()
    this.requireAdmin()
    return clone([...this.store.discounts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  async create(input: DiscountInput): Promise<DiscountCode> {
    await this.store.delay()
    this.requireAdmin()
    const code = normalizeCode(input.code)
    this.assertCodeAvailable(code)
    const discount: DiscountCode = {
      ...normalizeInput(input),
      code,
      id: this.store.nextId('disc'),
      usedCount: 0,
      createdAt: nowIso(),
    }
    this.store.discounts.unshift(discount)
    return clone(discount)
  }

  async update(id: string, input: DiscountInput): Promise<DiscountCode> {
    await this.store.delay()
    this.requireAdmin()
    const index = this.store.discounts.findIndex((d) => d.id === id)
    const existing = this.store.discounts[index]
    if (!existing) throw AppError.notFound('Discount code')
    const code = normalizeCode(input.code)
    this.assertCodeAvailable(code, id)
    const updated: DiscountCode = { ...existing, ...normalizeInput(input), code }
    this.store.discounts[index] = updated
    return clone(updated)
  }

  async remove(id: string): Promise<void> {
    await this.store.delay()
    this.requireAdmin()
    const index = this.store.discounts.findIndex((d) => d.id === id)
    if (index === -1) throw AppError.notFound('Discount code')
    this.store.discounts.splice(index, 1)
  }

  private requireAdmin() {
    if (this.store.currentSession?.user.role !== 'admin') throw AppError.forbidden()
  }

  private assertCodeAvailable(code: string, excludeId?: string) {
    const taken = this.store.discounts.some((d) => d.code === code && d.id !== excludeId)
    if (taken) throw new AppError('conflict', 'A discount with this code already exists.')
  }
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

function normalizeInput(input: DiscountInput): DiscountInput {
  return {
    code: normalizeCode(input.code),
    type: input.type,
    value: input.value,
    minSubtotal: input.minSubtotal,
    maxUses: input.maxUses,
    startsAt: input.startsAt || null,
    endsAt: input.endsAt || null,
    isActive: input.isActive,
  }
}
