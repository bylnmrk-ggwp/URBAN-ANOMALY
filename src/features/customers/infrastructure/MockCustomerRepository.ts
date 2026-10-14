import type { Order, ShippingAddress } from '@/features/orders/domain/entities'
import { slugify } from '@/lib/format'
import type { MockStore } from '@/mocks/MockStore'
import { byNewest, matchesSearch, toOrderSummary } from '@/mocks/helpers'

import type { Customer, CustomerDetail, CustomerRepository } from '../domain/entities'

interface CustomerBucket {
  customer: Customer
  orders: Order[]
}

const RECENT_ORDERS_LIMIT = 10

export class MockCustomerRepository implements CustomerRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
  }

  async list(search: string): Promise<Customer[]> {
    await this.store.delay()
    return this.aggregate()
      .map((bucket) => bucket.customer)
      .filter((c) => matchesSearch(search, c.fullName, c.email, c.phone))
      .sort(
        (a, b) =>
          (b.lastOrderAt ?? '').localeCompare(a.lastOrderAt ?? '') ||
          a.fullName.localeCompare(b.fullName),
      )
  }

  async getById(id: string): Promise<CustomerDetail | null> {
    await this.store.delay()
    const bucket = this.aggregate().find((b) => b.customer.id === id)
    if (!bucket) return null
    const sorted = [...bucket.orders].sort(byNewest)
    return {
      ...bucket.customer,
      addresses: uniqueAddresses(sorted.map((o) => o.shippingAddress)),
      recentOrders: sorted.slice(0, RECENT_ORDERS_LIMIT).map(toOrderSummary),
    }
  }

  /** Groups orders by customer email; registered buyers appear even with no orders. */
  private aggregate(): CustomerBucket[] {
    const buckets = new Map<string, CustomerBucket>()

    for (const account of this.store.users) {
      if (account.user.role !== 'buyer') continue
      const { user } = account
      buckets.set(user.email.toLowerCase(), {
        customer: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          totalOrders: 0,
          totalSpent: 0,
          lastOrderAt: null,
          createdAt: account.createdAt,
        },
        orders: [],
      })
    }

    const oldestFirst = [...this.store.orders].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    )
    for (const order of oldestFirst) {
      const key = order.customer.email.toLowerCase()
      let bucket = buckets.get(key)
      if (!bucket) {
        bucket = {
          customer: {
            id: order.customer.userId ?? `cust-${slugify(order.customer.email)}`,
            fullName: order.customer.fullName,
            email: order.customer.email,
            phone: order.customer.phone,
            totalOrders: 0,
            totalSpent: 0,
            lastOrderAt: null,
            createdAt: order.createdAt,
          },
          orders: [],
        }
        buckets.set(key, bucket)
      }
      bucket.orders.push(order)
      // Guest checkouts: keep the most recent contact details.
      if (!order.customer.userId) {
        bucket.customer.fullName = order.customer.fullName
        bucket.customer.phone = order.customer.phone
      }
      if (order.status !== 'cancelled') {
        bucket.customer.totalOrders += 1
        bucket.customer.totalSpent =
          Math.round((bucket.customer.totalSpent + order.total) * 100) / 100
      }
      if (!bucket.customer.lastOrderAt || order.createdAt > bucket.customer.lastOrderAt) {
        bucket.customer.lastOrderAt = order.createdAt
      }
    }

    return [...buckets.values()]
  }
}

function uniqueAddresses(addresses: ShippingAddress[]): ShippingAddress[] {
  const seen = new Set<string>()
  const result: ShippingAddress[] = []
  for (const address of addresses) {
    const key = [
      address.addressLine,
      address.barangay,
      address.city,
      address.province,
      address.postalCode,
    ]
      .join('|')
      .toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ ...address })
  }
  return result
}
