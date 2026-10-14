import { describe, expect, it } from 'vitest'

import { isAppError } from '@/lib/errors'

import {
  appliedDiscountJsonSchema,
  discountCodeJsonSchema,
  parseRpcJson,
  returnRequestListJsonSchema,
  reviewJsonSchema,
  reviewSummaryJsonSchema,
  stockAlertJsonSchema,
  teamMemberListJsonSchema,
  toAppliedDiscount,
  toDiscountCode,
  toReturnRequest,
  toReview,
  toReviewSummary,
  toStockAlert,
  toTeamMember,
} from './mappers'

const DISCOUNT_JSON = {
  id: 'd1',
  code: 'WELCOME10',
  type: 'percent',
  value: 10,
  min_subtotal: 1000,
  max_uses: null,
  used_count: 42,
  starts_at: null,
  ends_at: '2026-12-31T00:00:00+00:00',
  is_active: true,
  created_at: '2026-01-01T00:00:00+00:00',
  updated_at: '2026-01-02T00:00:00+00:00',
}

const REVIEW_JSON = {
  id: 'r1',
  product_id: 'p1',
  product_name: 'Cloud Clog',
  product_slug: 'cloud-clog',
  user_id: 'u1',
  author_name: 'Maria S.',
  rating: 5,
  title: 'So comfy',
  body: 'Wore them all day without a single complaint.',
  photo_urls: ['https://x/a.jpg'],
  is_verified_purchase: true,
  status: 'approved',
  created_at: '2026-03-01T00:00:00+00:00',
  updated_at: '2026-03-01T00:00:00+00:00',
}

const STOCK_ALERT_JSON = {
  id: 'a1',
  product_id: 'p1',
  product_name: 'Cloud Clog',
  product_slug: 'cloud-clog',
  variant_id: 'v1',
  sku: 'CC-BLK-9',
  size: '9',
  color_name: 'Black',
  email: 'ana@example.com',
  status: 'waiting',
  created_at: '2026-03-01T00:00:00+00:00',
  notified_at: null,
}

const RETURN_JSON = {
  id: 'ret1',
  order_id: 'o1',
  order_number: 'ORD-2610-00001',
  customer_name: 'Ana Cruz',
  customer_email: 'ana@example.com',
  user_id: 'u1',
  items: [
    {
      order_item_id: 'oi1',
      product_name: 'Cloud Clog',
      size: '9',
      color_name: 'Black',
      quantity: 1,
      unit_price: 1299,
    },
  ],
  reason: 'wrong_size',
  resolution: 'exchange',
  note: 'Too roomy.',
  status: 'requested',
  admin_note: '',
  refund_amount: 1299,
  created_at: '2026-03-02T00:00:00+00:00',
  updated_at: '2026-03-02T00:00:00+00:00',
}

const TEAM_JSON = {
  id: 'u2',
  email: 'jamie@example.com',
  full_name: 'Jamie Reyes',
  role: 'staff',
  status: 'active',
  last_active_at: '2026-03-02T00:00:00+00:00',
  created_at: '2025-11-01T00:00:00+00:00',
}

describe('round 2 RPC schemas and mappers', () => {
  it('maps discount codes and applied discounts', () => {
    const row = parseRpcJson(discountCodeJsonSchema, DISCOUNT_JSON, 'save_discount_code')
    expect(toDiscountCode(row)).toEqual({
      id: 'd1',
      code: 'WELCOME10',
      type: 'percent',
      value: 10,
      minSubtotal: 1000,
      maxUses: null,
      usedCount: 42,
      startsAt: null,
      endsAt: '2026-12-31T00:00:00+00:00',
      isActive: true,
      createdAt: '2026-01-01T00:00:00+00:00',
    })
    const applied = parseRpcJson(
      appliedDiscountJsonSchema,
      { code: 'FREESHIP', type: 'fixed', value: 150, amount: 100 },
      'validate_discount_code',
    )
    expect(toAppliedDiscount(applied)).toEqual({
      code: 'FREESHIP',
      type: 'fixed',
      value: 150,
      amount: 100,
    })
  })

  it('rejects malformed RPC payloads with an AppError', () => {
    expect(() =>
      parseRpcJson(
        discountCodeJsonSchema,
        { ...DISCOUNT_JSON, type: 'bogo' },
        'save_discount_code',
      ),
    ).toThrow(/Unexpected response from save_discount_code/)
    try {
      parseRpcJson(reviewSummaryJsonSchema, { product_id: 'p1' }, 'review_summary')
    } catch (error) {
      expect(isAppError(error) && error.code === 'unknown').toBe(true)
    }
  })

  it('maps reviews and guards the rating union', () => {
    const row = parseRpcJson(reviewJsonSchema, REVIEW_JSON, 'submit_review')
    const review = toReview(row)
    expect(review).toMatchObject({
      id: 'r1',
      productId: 'p1',
      productName: 'Cloud Clog',
      productSlug: 'cloud-clog',
      userId: 'u1',
      authorName: 'Maria S.',
      rating: 5,
      photoUrls: ['https://x/a.jpg'],
      isVerifiedPurchase: true,
      status: 'approved',
      createdAt: '2026-03-01T00:00:00+00:00',
    })
    expect(review).not.toHaveProperty('updatedAt')
    expect(() => toReview({ ...row, rating: 6 })).toThrow(/Unexpected review rating/)
  })

  it('maps review summaries including the five-bucket distribution', () => {
    const json = parseRpcJson(
      reviewSummaryJsonSchema,
      { product_id: 'p1', average: 4.3, count: 3, distribution: [0, 0, 1, 0, 2] },
      'review_summary',
    )
    expect(toReviewSummary(json)).toEqual({
      productId: 'p1',
      average: 4.3,
      count: 3,
      distribution: [0, 0, 1, 0, 2],
    })
  })

  it('maps stock alerts and validates the size union', () => {
    const row = parseRpcJson(stockAlertJsonSchema, STOCK_ALERT_JSON, 'subscribe_stock_alert')
    expect(toStockAlert(row)).toEqual({
      id: 'a1',
      productId: 'p1',
      productName: 'Cloud Clog',
      productSlug: 'cloud-clog',
      variantId: 'v1',
      sku: 'CC-BLK-9',
      size: '9',
      colorName: 'Black',
      email: 'ana@example.com',
      status: 'waiting',
      createdAt: '2026-03-01T00:00:00+00:00',
      notifiedAt: null,
    })
    expect(() => toStockAlert({ ...row, size: '13' })).toThrow(/Unexpected product size/)
  })

  it('maps return requests with their items', () => {
    const [json] = parseRpcJson(returnRequestListJsonSchema, [RETURN_JSON], 'list_return_requests')
    expect(json).toBeDefined()
    if (!json) return
    expect(toReturnRequest(json)).toEqual({
      id: 'ret1',
      orderId: 'o1',
      orderNumber: 'ORD-2610-00001',
      customerName: 'Ana Cruz',
      customerEmail: 'ana@example.com',
      items: [
        {
          orderItemId: 'oi1',
          productName: 'Cloud Clog',
          size: '9',
          colorName: 'Black',
          quantity: 1,
          unitPrice: 1299,
        },
      ],
      reason: 'wrong_size',
      resolution: 'exchange',
      note: 'Too roomy.',
      status: 'requested',
      adminNote: '',
      refundAmount: 1299,
      createdAt: '2026-03-02T00:00:00+00:00',
      updatedAt: '2026-03-02T00:00:00+00:00',
    })
  })

  it('maps team members for both active profiles and pending invites', () => {
    const members = parseRpcJson(
      teamMemberListJsonSchema,
      [TEAM_JSON, { ...TEAM_JSON, id: 'inv1', status: 'invited', last_active_at: null }],
      'team_members',
    ).map(toTeamMember)
    expect(members[0]).toEqual({
      id: 'u2',
      email: 'jamie@example.com',
      fullName: 'Jamie Reyes',
      role: 'staff',
      status: 'active',
      lastActiveAt: '2026-03-02T00:00:00+00:00',
      createdAt: '2025-11-01T00:00:00+00:00',
    })
    expect(members[1]).toMatchObject({ id: 'inv1', status: 'invited', lastActiveAt: null })
  })
})
