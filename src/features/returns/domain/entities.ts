import { z } from 'zod'

import type { ISODateString } from '@/types/common'

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'received' | 'refunded'
export type ReturnResolution = 'refund' | 'exchange'
export type ReturnReason = 'wrong_size' | 'damaged' | 'not_as_described' | 'changed_mind' | 'other'

export interface ReturnItem {
  orderItemId: string
  productName: string
  size: string
  colorName: string
  quantity: number
  unitPrice: number
}

export interface ReturnRequest {
  id: string
  orderId: string
  orderNumber: string
  customerName: string
  customerEmail: string
  items: ReturnItem[]
  reason: ReturnReason
  resolution: ReturnResolution
  note: string
  status: ReturnStatus
  adminNote: string
  refundAmount: number
  createdAt: ISODateString
  updatedAt: ISODateString
}

export interface ReturnRequestInput {
  orderId: string
  items: { orderItemId: string; quantity: number }[]
  reason: ReturnReason
  resolution: ReturnResolution
  note: string
}

export interface ReturnRepository {
  // Buyer
  request(input: ReturnRequestInput): Promise<ReturnRequest>
  getForOrder(orderId: string): Promise<ReturnRequest | null>
  // Admin
  listAdmin(status?: ReturnStatus | 'all'): Promise<ReturnRequest[]>
  updateStatus(id: string, status: ReturnStatus, adminNote: string): Promise<ReturnRequest>
}

export const RETURN_WINDOW_DAYS = 14

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  received: 'Item received',
  refunded: 'Refunded',
}

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  wrong_size: 'Wrong size or fit',
  damaged: 'Arrived damaged',
  not_as_described: 'Not as described',
  changed_mind: 'Changed my mind',
  other: 'Other',
}

export const RETURN_STATUS_TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ['approved', 'rejected'],
  approved: ['received', 'rejected'],
  received: ['refunded'],
  rejected: [],
  refunded: [],
}

export const returnRequestSchema = z.object({
  items: z
    .array(z.object({ orderItemId: z.string(), quantity: z.number().int().min(1) }))
    .min(1, 'Select at least one item.'),
  reason: z.enum(['wrong_size', 'damaged', 'not_as_described', 'changed_mind', 'other']),
  resolution: z.enum(['refund', 'exchange']),
  note: z.string().trim().max(500),
})
export type ReturnRequestFormValues = z.infer<typeof returnRequestSchema>

/** Buyers may request a return within the window after delivery. */
export function isWithinReturnWindow(deliveredAt: string, now: Date = new Date()): boolean {
  const ms = now.getTime() - new Date(deliveredAt).getTime()
  return ms <= RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000
}
