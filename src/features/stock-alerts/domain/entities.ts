import { z } from 'zod'

import type { ProductSize } from '@/features/products/domain/entities'
import type { ISODateString } from '@/types/common'

export type StockAlertStatus = 'waiting' | 'notified'

export interface StockAlert {
  id: string
  productId: string
  productName: string
  productSlug: string
  variantId: string
  sku: string
  size: ProductSize
  colorName: string
  email: string
  status: StockAlertStatus
  createdAt: ISODateString
  notifiedAt: ISODateString | null
}

export interface StockAlertRepository {
  /** Storefront. A duplicate (variant + email) resolves to the existing alert. */
  subscribe(input: { variantId: string; email: string }): Promise<StockAlert>
  // Admin
  list(): Promise<StockAlert[]>
  /** Marks waiting alerts for a variant as notified; email delivery is a backend concern. */
  markNotified(variantId: string): Promise<number>
}

export const stockAlertSchema = z.object({
  email: z.email('Enter a valid email address.'),
})
export type StockAlertFormValues = z.infer<typeof stockAlertSchema>
