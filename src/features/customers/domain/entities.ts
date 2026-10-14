import type { OrderSummary, ShippingAddress } from '@/features/orders/domain/entities'
import type { ISODateString } from '@/types/common'

export interface Customer {
  id: string
  fullName: string
  email: string
  phone: string
  totalOrders: number
  totalSpent: number
  lastOrderAt: ISODateString | null
  createdAt: ISODateString
}

export interface CustomerDetail extends Customer {
  addresses: ShippingAddress[]
  recentOrders: OrderSummary[]
}

export interface CustomerRepository {
  list(search: string): Promise<Customer[]>
  getById(id: string): Promise<CustomerDetail | null>
}
