import type {
  Customer,
  CustomerDetail,
  CustomerRepository,
} from '@/features/customers/domain/entities'
import type { ShippingAddress } from '@/features/orders/domain/entities'
import { getSupabaseClient } from '@/lib/supabase/client'
import {
  customerSummariesJsonSchema,
  parseRpcJson,
  toCustomer,
  toOrderSummary,
  unwrap,
} from '@/lib/supabase/mappers'
import type { AddressRow } from '@/lib/supabase/mappers'

const RECENT_ORDERS_LIMIT = 10

function toShippingAddress(row: AddressRow): ShippingAddress {
  return {
    addressLine: row.address_line,
    barangay: row.barangay,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    deliveryInstructions: row.delivery_instructions,
  }
}

/**
 * Customers are registered buyers (rows in `profiles`). Guest checkouts appear in orders but
 * not here; aggregates come from the admin-only `customer_summaries` RPC.
 */
export class SupabaseCustomerRepository implements CustomerRepository {
  private get db() {
    return getSupabaseClient()
  }

  async list(search: string): Promise<Customer[]> {
    const data = unwrap(await this.db.rpc('customer_summaries', { p_search: search.trim() }))
    return parseRpcJson(customerSummariesJsonSchema, data, 'customer_summaries').map(toCustomer)
  }

  async getById(id: string): Promise<CustomerDetail | null> {
    const profile = unwrap(await this.db.from('profiles').select('*').eq('id', id).maybeSingle())
    if (!profile) return null

    const [addresses, orders] = await Promise.all([
      this.db
        .from('addresses')
        .select('*')
        .eq('user_id', id)
        .order('is_default', { ascending: false }),
      this.db
        .from('order_summaries')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false }),
    ])
    const addressRows = unwrap(addresses)
    const orderRows = unwrap(orders)
    const countable = orderRows.filter((o) => o.status !== 'cancelled')

    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phone: profile.phone,
      totalOrders: countable.length,
      totalSpent: countable.reduce((sum, o) => sum + Number(o.total), 0),
      lastOrderAt: orderRows[0]?.created_at ?? null,
      createdAt: profile.created_at,
      addresses: addressRows.map(toShippingAddress),
      recentOrders: orderRows.slice(0, RECENT_ORDERS_LIMIT).map(toOrderSummary),
    }
  }
}
