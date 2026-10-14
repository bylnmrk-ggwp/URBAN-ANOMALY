import { isAuthError, PostgrestError } from '@supabase/supabase-js'
import { z } from 'zod'

import type { AuthUser, SavedAddress } from '@/features/auth/domain/entities'
import type { Category } from '@/features/categories/domain/entities'
import type {
  AuditEntry,
  CmsDocument,
  DocumentKey,
  DocumentKind,
  DocumentSummary,
  Revision,
} from '@/features/cms/domain/documents'
import { parseContent, parseDocumentKey } from '@/features/cms/domain/documents'
import type { MediaAsset } from '@/features/cms/domain/media'
import type { Customer } from '@/features/customers/domain/entities'
import type {
  ActivityEvent,
  BestSeller,
  DashboardSummary,
  SalesPoint,
} from '@/features/dashboard/domain/entities'
import type { AppliedDiscount, DiscountCode } from '@/features/discounts/domain/entities'
import type { InventoryMovement, InventoryRow } from '@/features/inventory/domain/entities'
import { deriveStockStatus } from '@/features/inventory/domain/entities'
import type { AppNotification } from '@/features/notifications/domain/entities'
import type {
  Order,
  OrderItem,
  OrderStatusEvent,
  OrderSummary,
} from '@/features/orders/domain/entities'
import type {
  Product,
  ProductImage,
  ProductSize,
  ProductVariant,
} from '@/features/products/domain/entities'
import { PRODUCT_SIZES } from '@/features/products/domain/entities'
import type { ReturnRequest } from '@/features/returns/domain/entities'
import type { Review, ReviewSummary } from '@/features/reviews/domain/entities'
import type { StoreSettings } from '@/features/settings/domain/entities'
import type { StockAlert } from '@/features/stock-alerts/domain/entities'
import type { TeamMember } from '@/features/team/domain/entities'
import { AppError } from '@/lib/errors'
import type { AppErrorCode } from '@/lib/errors'

import type { Enums, Json, Tables, Views } from './database.types'

// ---------------------------------------------------------------------------
// Row aliases
// ---------------------------------------------------------------------------

export type ProfileRow = Tables<'profiles'>
export type AddressRow = Tables<'addresses'>
export type CategoryRow = Tables<'categories'>
export type ProductRow = Tables<'products'>
export type ProductImageRow = Tables<'product_images'>
export type ProductVariantRow = Tables<'product_variants'>
export type OrderRow = Tables<'orders'>
export type OrderItemRow = Tables<'order_items'>
export type OrderStatusEventRow = Tables<'order_status_events'>
export type NotificationRow = Tables<'notifications'>
export type StoreSettingsRow = Tables<'store_settings'>
export type OrderSummaryRow = Views<'order_summaries'>
export type InventoryViewRow = Views<'inventory_rows'>
export type InventoryMovementViewRow = Views<'inventory_movement_rows'>

/** Shape returned by `select('*, product_images(*), product_variants(*), categories(*)')`. */
export interface ProductJoinRow extends ProductRow {
  product_images: ProductImageRow[]
  product_variants: ProductVariantRow[]
  categories: CategoryRow | null
}

/** Shape returned by `select('*, order_items(*), order_status_events(*)')`. */
export interface OrderJoinRow extends OrderRow {
  order_items: OrderItemRow[]
  order_status_events: OrderStatusEventRow[]
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const SIZE_SET: ReadonlySet<string> = new Set(PRODUCT_SIZES)

function toProductSize(value: string): ProductSize {
  if (SIZE_SET.has(value)) return value as ProductSize
  throw new AppError('unknown', `Unexpected product size "${value}" received from the database.`)
}

function toActor(value: string): OrderStatusEvent['actor'] {
  return value === 'customer' || value === 'admin' ? value : 'system'
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export function toCategory(row: CategoryRow, productCount = 0): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    sortOrder: row.sort_order,
    productCount,
    introTitle: row.intro_title ?? '',
    introBody: row.intro_body ?? '',
  }
}

export function toProductImage(row: ProductImageRow): ProductImage {
  return {
    id: row.id,
    url: row.url,
    alt: row.alt,
    isPrimary: row.is_primary,
    sortOrder: row.sort_order,
  }
}

export function toProductVariant(row: ProductVariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    size: toProductSize(row.size),
    color: { name: row.color_name, hex: row.color_hex },
    stock: row.stock,
    reservedStock: row.reserved_stock,
    lowStockThreshold: row.low_stock_threshold,
  }
}

export function toProduct(
  row: ProductRow,
  images: ProductImageRow[],
  variants: ProductVariantRow[],
  category: CategoryRow | null,
): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    details: row.details,
    categoryId: row.category_id,
    categoryName: category?.name ?? '',
    categorySlug: category?.slug ?? '',
    basePrice: toNumber(row.base_price),
    salePrice: row.sale_price === null ? null : toNumber(row.sale_price),
    images: [...images].sort((a, b) => a.sort_order - b.sort_order).map(toProductImage),
    variants: [...variants].sort((a, b) => a.sku.localeCompare(b.sku)).map(toProductVariant),
    status: row.status,
    isFeatured: row.is_featured,
    salesCount: row.sales_count,
    seoTitle: row.seo_title ?? '',
    seoDescription: row.seo_description ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toProductFromJoin(row: ProductJoinRow): Product {
  return toProduct(row, row.product_images, row.product_variants, row.categories)
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    imageUrl: row.image_url,
    sku: row.sku,
    size: toProductSize(row.size),
    colorName: row.color_name,
    unitPrice: toNumber(row.unit_price),
    quantity: row.quantity,
    lineTotal: toNumber(row.line_total),
  }
}

export function toOrderStatusEvent(row: OrderStatusEventRow): OrderStatusEvent {
  return {
    id: row.id,
    status: row.status,
    note: row.note,
    actor: toActor(row.actor),
    createdAt: row.created_at,
  }
}

export function toOrder(
  row: OrderRow,
  items: OrderItemRow[],
  events: OrderStatusEventRow[],
): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customer: {
      userId: row.user_id,
      fullName: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    shippingAddress: {
      addressLine: row.address_line,
      barangay: row.barangay,
      city: row.city,
      province: row.province,
      postalCode: row.postal_code,
      deliveryInstructions: row.delivery_instructions,
    },
    items: items.map(toOrderItem),
    subtotal: toNumber(row.subtotal),
    shippingFee: toNumber(row.shipping_fee),
    discount: toNumber(row.discount),
    total: toNumber(row.total),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    statusHistory: [...events]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toOrderStatusEvent),
    tracking:
      row.courier && row.tracking_number
        ? { courier: row.courier, trackingNumber: row.tracking_number }
        : null,
    customerNote: row.customer_note,
    adminNotes: row.admin_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function toOrderFromJoin(row: OrderJoinRow): Order {
  return toOrder(row, row.order_items, row.order_status_events)
}

export function toOrderSummary(row: OrderSummaryRow): OrderSummary {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    itemCount: row.item_count,
    total: toNumber(row.total),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    createdAt: row.created_at,
  }
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export function toInventoryRow(row: InventoryViewRow): InventoryRow {
  const available = Math.max(0, row.available_stock)
  return {
    variantId: row.variant_id,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    imageUrl: row.image_url,
    sku: row.sku,
    size: toProductSize(row.size),
    colorName: row.color_name,
    physicalStock: row.stock,
    reservedStock: row.reserved_stock,
    availableStock: available,
    lowStockThreshold: row.low_stock_threshold,
    status: deriveStockStatus(available, row.low_stock_threshold),
  }
}

export function toInventoryMovement(row: InventoryMovementViewRow): InventoryMovement {
  return {
    id: row.id,
    variantId: row.variant_id,
    sku: row.sku,
    productName: row.product_name,
    delta: row.delta,
    stockAfter: row.stock_after,
    reason: row.reason,
    note: row.note,
    actor: row.actor,
    referenceOrderNumber: row.reference_order_number,
    createdAt: row.created_at,
  }
}

// ---------------------------------------------------------------------------
// Notifications / settings / auth
// ---------------------------------------------------------------------------

export function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    href: row.href,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

export function toSettings(row: StoreSettingsRow): StoreSettings {
  return {
    storeName: row.store_name,
    logoUrl: row.logo_url,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    address: row.address,
    flatShippingFee: toNumber(row.flat_shipping_fee),
    freeShippingThreshold: toNumber(row.free_shipping_threshold),
    codEnabled: row.cod_enabled,
    onlinePaymentEnabled: row.online_payment_enabled,
    onlinePaymentConfigured: row.online_payment_configured,
    emailNotificationsConfigured: row.email_notifications_configured,
    defaultLowStockThreshold: row.default_low_stock_threshold,
    notifyNewOrders: row.notify_new_orders,
    notifyLowStock: row.notify_low_stock,
    notifyPaymentEvents: row.notify_payment_events,
  }
}

export function toSavedAddress(row: AddressRow): SavedAddress {
  return {
    id: row.id,
    label: row.label,
    addressLine: row.address_line,
    barangay: row.barangay,
    city: row.city,
    province: row.province,
    postalCode: row.postal_code,
    deliveryInstructions: row.delivery_instructions,
    isDefault: row.is_default,
  }
}

/** Admins without an explicit `admin_role` (pre-0003 rows) are treated as owners. */
function toAdminRole(profile: ProfileRow): AuthUser['adminRole'] {
  if (profile.role !== 'admin') return null
  return profile.admin_role ?? 'owner'
}

export function toAuthUser(profile: ProfileRow, addresses: AddressRow[]): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    phone: profile.phone,
    role: profile.role,
    adminRole: toAdminRole(profile),
    addresses: [...addresses]
      .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.label.localeCompare(b.label))
      .map(toSavedAddress),
  }
}

// ---------------------------------------------------------------------------
// RPC JSON payloads (validated at runtime because `jsonb` is untyped)
// ---------------------------------------------------------------------------

const orderStatusSchema = z.enum([
  'pending_payment',
  'pending_confirmation',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
])
const paymentStatusSchema = z.enum([
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refund_pending',
  'refunded',
  'partially_refunded',
])
const paymentMethodSchema = z.enum(['cod', 'online'])
const productStatusSchema = z.enum(['draft', 'published', 'archived'])

const orderItemJsonSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  product_id: z.string(),
  variant_id: z.string(),
  product_name: z.string(),
  product_slug: z.string(),
  image_url: z.string().nullable(),
  sku: z.string(),
  size: z.string(),
  color_name: z.string(),
  unit_price: z.number(),
  quantity: z.number(),
  line_total: z.number(),
})

const orderEventJsonSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  status: orderStatusSchema,
  note: z.string().nullable(),
  actor: z.string(),
  created_at: z.string(),
})

/** Mirrors `OrderJoinRow`; produced by the SQL helper `order_json(uuid)`. */
export const orderJsonSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  user_id: z.string().nullable(),
  customer_name: z.string(),
  customer_email: z.string(),
  customer_phone: z.string(),
  address_line: z.string(),
  barangay: z.string(),
  city: z.string(),
  province: z.string(),
  postal_code: z.string(),
  delivery_instructions: z.string(),
  subtotal: z.number(),
  shipping_fee: z.number(),
  discount: z.number(),
  total: z.number(),
  payment_method: paymentMethodSchema,
  payment_status: paymentStatusSchema,
  status: orderStatusSchema,
  courier: z.string().nullable(),
  tracking_number: z.string().nullable(),
  customer_note: z.string(),
  admin_notes: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  order_items: z.array(orderItemJsonSchema),
  order_status_events: z.array(orderEventJsonSchema),
})

export const placeOrderResultSchema = z.object({
  order_id: z.string(),
  order_number: z.string(),
  payment_redirect_url: z.string().nullable(),
  order: orderJsonSchema,
})

const orderSummaryJsonSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  user_id: z.string().nullable(),
  customer_name: z.string(),
  customer_email: z.string(),
  item_count: z.number(),
  total: z.number(),
  payment_method: paymentMethodSchema,
  payment_status: paymentStatusSchema,
  status: orderStatusSchema,
  created_at: z.string(),
})

const inventoryRowJsonSchema = z.object({
  variant_id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  product_slug: z.string(),
  product_status: productStatusSchema,
  image_url: z.string().nullable(),
  sku: z.string(),
  size: z.string(),
  color_name: z.string(),
  stock: z.number(),
  reserved_stock: z.number(),
  available_stock: z.number(),
  low_stock_threshold: z.number(),
  stock_status: z.string(),
})

export const dashboardSummaryJsonSchema = z.object({
  kpis: z.object({
    total_sales: z.number(),
    total_orders: z.number(),
    pending_orders: z.number(),
    processing_orders: z.number(),
    delivered_orders: z.number(),
    total_products: z.number(),
    low_stock_products: z.number(),
  }),
  sales_series: z.array(z.object({ date: z.string(), sales: z.number(), orders: z.number() })),
  recent_orders: z.array(orderSummaryJsonSchema),
  best_sellers: z.array(
    z.object({
      product_id: z.string(),
      product_name: z.string(),
      product_slug: z.string(),
      image_url: z.string().nullable(),
      units_sold: z.number(),
      revenue: z.number(),
    }),
  ),
  low_stock: z.array(inventoryRowJsonSchema),
  recent_activity: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['order', 'inventory', 'product', 'payment']),
      message: z.string(),
      href: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
})

export const customerSummariesJsonSchema = z.array(
  z.object({
    id: z.string(),
    full_name: z.string(),
    email: z.string(),
    phone: z.string(),
    total_orders: z.number(),
    total_spent: z.number(),
    last_order_at: z.string().nullable(),
    created_at: z.string(),
  }),
)

export function parseRpcJson<T>(schema: z.ZodType<T>, data: Json | null, what: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new AppError('unknown', `Unexpected response from ${what}.`, { cause: result.error })
  }
  return result.data
}

export function toCustomer(json: z.infer<typeof customerSummariesJsonSchema>[number]): Customer {
  return {
    id: json.id,
    fullName: json.full_name,
    email: json.email,
    phone: json.phone,
    totalOrders: json.total_orders,
    totalSpent: json.total_spent,
    lastOrderAt: json.last_order_at,
    createdAt: json.created_at,
  }
}

export function toDashboardSummary(
  json: z.infer<typeof dashboardSummaryJsonSchema>,
): DashboardSummary {
  const salesSeries: SalesPoint[] = json.sales_series.map((p) => ({
    date: p.date,
    sales: p.sales,
    orders: p.orders,
  }))
  const bestSellers: BestSeller[] = json.best_sellers.map((b) => ({
    productId: b.product_id,
    productName: b.product_name,
    productSlug: b.product_slug,
    imageUrl: b.image_url,
    unitsSold: b.units_sold,
    revenue: b.revenue,
  }))
  const recentActivity: ActivityEvent[] = json.recent_activity.map((a) => ({
    id: a.id,
    type: a.type,
    message: a.message,
    href: a.href,
    createdAt: a.created_at,
  }))
  return {
    kpis: {
      totalSales: json.kpis.total_sales,
      totalOrders: json.kpis.total_orders,
      pendingOrders: json.kpis.pending_orders,
      processingOrders: json.kpis.processing_orders,
      deliveredOrders: json.kpis.delivered_orders,
      totalProducts: json.kpis.total_products,
      lowStockProducts: json.kpis.low_stock_products,
    },
    salesSeries,
    recentOrders: json.recent_orders.map(toOrderSummary),
    bestSellers,
    lowStock: json.low_stock.map(toInventoryRow),
    recentActivity,
    isDemoData: false,
  }
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

/**
 * Custom SQLSTATE codes raised by our PL/pgSQL functions so the client can map them to
 * precise `AppError` codes. Keep in sync with `supabase/migrations/0001_schema.sql`.
 */
const SQLSTATE_TO_APP_CODE: Record<string, AppErrorCode> = {
  OS001: 'out_of_stock',
  VA001: 'validation',
  NF001: 'not_found',
  CF001: 'conflict',
  FB001: 'forbidden',
  PGRST116: 'not_found',
  PGRST301: 'forbidden',
  '42501': 'forbidden',
  '23505': 'conflict',
  '23503': 'validation',
  '23514': 'validation',
  '22P02': 'validation',
  P0001: 'validation',
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('load failed') ||
      msg.includes('fetch failed')
    )
  }
  return false
}

function isPostgrestLike(error: unknown): error is PostgrestError {
  if (error instanceof PostgrestError) return true
  if (typeof error !== 'object' || error === null) return false
  const e = error as Record<string, unknown>
  return (
    typeof e['code'] === 'string' &&
    typeof e['message'] === 'string' &&
    'details' in e &&
    'hint' in e
  )
}

/** `StorageError` / `StorageApiError` from storage-js (duck-typed to avoid a direct dependency). */
interface StorageErrorLike extends Error {
  status?: number
  statusCode?: string
}

function isStorageErrorLike(error: unknown): error is StorageErrorLike {
  if (!(error instanceof Error) || isPostgrestLike(error)) return false
  return error.name.startsWith('Storage') || 'statusCode' in error
}

function uniqueViolationMessage(error: PostgrestError): string {
  const text = `${error.message} ${error.details}`.toLowerCase()
  if (text.includes('slug')) return 'That slug is already in use.'
  if (text.includes('sku')) return 'One of the SKUs is already in use.'
  if (text.includes('email')) return 'That email address is already in use.'
  return 'A record with the same value already exists.'
}

export function mapSupabaseError(error: unknown): AppError {
  if (error instanceof AppError) return error

  if (isAuthError(error)) {
    const code = error.code ?? ''
    const status = error.status ?? 0
    if (code === 'invalid_credentials' || (status === 400 && code === '')) {
      return new AppError('unauthorized', 'Incorrect email or password.', { cause: error })
    }
    if (code === 'email_not_confirmed') {
      return new AppError('unauthorized', 'Confirm your email address before signing in.', {
        cause: error,
      })
    }
    if (code === 'user_already_exists' || code === 'email_exists' || status === 422) {
      return new AppError('conflict', 'An account with this email already exists.', {
        cause: error,
      })
    }
    if (code === 'weak_password' || code === 'validation_failed') {
      return new AppError('validation', error.message, { cause: error })
    }
    if (
      code === 'over_request_rate_limit' ||
      code === 'over_email_send_rate_limit' ||
      status === 429
    ) {
      return new AppError('unknown', 'Too many attempts. Please wait a moment and try again.', {
        cause: error,
      })
    }
    if (status === 401 || code === 'session_not_found' || code === 'refresh_token_not_found') {
      return AppError.unauthorized()
    }
    if (status === 403) return AppError.forbidden()
    if (isNetworkError(error.cause)) {
      return new AppError('network', 'Unable to reach the server. Check your connection.', {
        cause: error,
      })
    }
    return new AppError('unknown', error.message || 'Authentication failed.', { cause: error })
  }

  if (isStorageErrorLike(error)) {
    const status = error.status ?? Number(error.statusCode ?? 0)
    if (status === 401) return AppError.unauthorized()
    if (status === 403) return AppError.forbidden()
    if (status === 404) {
      return new AppError('not_found', 'The file was not found.', { cause: error })
    }
    if (status === 409) {
      return new AppError('conflict', 'A file with that name already exists.', { cause: error })
    }
    if (status === 413) {
      return new AppError('validation', 'Images must be 5 MB or smaller.', { cause: error })
    }
    if (status === 400 || status === 415 || status === 422) {
      return new AppError('validation', error.message, { cause: error })
    }
    if (isNetworkError(error) || isNetworkError(error.cause)) {
      return new AppError('network', 'Unable to reach the server. Check your connection.', {
        cause: error,
      })
    }
    return new AppError('unknown', error.message || 'Upload failed.', { cause: error })
  }

  if (isPostgrestLike(error)) {
    const appCode = SQLSTATE_TO_APP_CODE[error.code]
    if (appCode === 'conflict' && error.code === '23505') {
      return new AppError('conflict', uniqueViolationMessage(error), { cause: error })
    }
    if (appCode === 'not_found') {
      return new AppError('not_found', 'The requested record was not found.', { cause: error })
    }
    if (appCode === 'forbidden') {
      return new AppError(
        'forbidden',
        error.code === '42501' || error.code === 'PGRST301'
          ? 'You do not have permission to do that.'
          : error.message,
        { cause: error },
      )
    }
    if (appCode) return new AppError(appCode, error.message, { cause: error })
    if (error.code === '' || error.code === 'FetchError' || isNetworkError(error)) {
      return new AppError('network', 'Unable to reach the server. Check your connection.', {
        cause: error,
      })
    }
    return new AppError('unknown', error.message || 'Something went wrong.', { cause: error })
  }

  if (isNetworkError(error)) {
    return new AppError('network', 'Unable to reach the server. Check your connection.', {
      cause: error,
    })
  }

  if (error instanceof Error) {
    return new AppError('unknown', error.message || 'Something went wrong.', { cause: error })
  }
  return new AppError('unknown', 'Something went wrong.', { cause: error })
}

/** `data` of the success branch of a PostgREST response union (discriminated on `error`). */
type SuccessData<R> = R extends { error: null; data: infer D } ? D : never

/**
 * Throws a mapped `AppError` when a Supabase response carries an error, otherwise returns the
 * success-branch `data` (so `.single()` yields `Row`, `.maybeSingle()` yields `Row | null`).
 */
export function unwrap<R extends { data: unknown; error: unknown }>(result: R): SuccessData<R> {
  if (result.error) throw mapSupabaseError(result.error)
  return result.data as SuccessData<R>
}

// ---------------------------------------------------------------------------
// CMS (0002_cms.sql)
// ---------------------------------------------------------------------------

export type CmsDocumentRow = Tables<'cms_documents'>
export type CmsRevisionRow = Tables<'cms_revisions'>
export type CmsMediaRow = Tables<'cms_media'>
export type CmsAuditRow = Tables<'cms_audit_log'>
export type CmsPublishedRow = Views<'cms_published_documents'>

const documentKindSchema = z.enum(['page', 'navigation', 'theme', 'announcement'])

/** Produced by the SQL helper `cms_document_json(uuid)`; returned by every document RPC. */
export const cmsDocumentJsonSchema = z.object({
  key: z.string(),
  kind: documentKindSchema,
  title: z.string(),
  draft: z.unknown(),
  published: z.unknown(),
  draft_version: z.number().int(),
  published_version: z.number().int(),
  updated_by_name: z.string(),
  updated_at: z.string(),
  published_at: z.string().nullable(),
  /** Added in 0003_cms_schedule.sql; optional so a database still on 0002 keeps working. */
  scheduled_at: z.string().nullable().optional(),
})
export type CmsDocumentJson = z.infer<typeof cmsDocumentJsonSchema>

/** `to_jsonb(cms_media)` as returned by the media RPCs; identical to the table row. */
export const cmsMediaJsonSchema = z.object({
  id: z.string(),
  bucket: z.string(),
  path: z.string(),
  url: z.string(),
  alt: z.string(),
  mime: z.string(),
  size_bytes: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  uploaded_by: z.string().nullable(),
  uploaded_by_name: z.string(),
  created_at: z.string(),
})

function toDocumentKey(key: string): DocumentKey {
  if (parseDocumentKey(key) === null) {
    throw new AppError('unknown', `Unexpected document key "${key}" received from the database.`)
  }
  return key as DocumentKey
}

/** Lets table reads share `toCmsDocument` with the RPC results. */
export function cmsDocumentRowToJson(row: CmsDocumentRow): CmsDocumentJson {
  return {
    key: row.key,
    kind: row.kind,
    title: row.title,
    draft: row.draft,
    published: row.published,
    draft_version: row.draft_version,
    published_version: row.published_version,
    updated_by_name: row.updated_by_name,
    updated_at: row.updated_at,
    published_at: row.published_at,
    scheduled_at: row.scheduled_at ?? null,
  }
}

/**
 * The draft must validate (the editor cannot work on it otherwise). An invalid published copy
 * is reported as `null` so the admin UI shows "not published" instead of crashing; the
 * storefront independently falls back to defaults for the same row.
 */
export function toCmsDocument<K extends DocumentKind>(
  kind: K,
  json: CmsDocumentJson,
): CmsDocument<K> {
  if (json.kind !== kind) {
    throw new AppError('unknown', `Expected ${json.key} to be a ${kind} document.`)
  }
  const draft = parseContent(kind, json.draft)
  if (!draft) {
    throw new AppError('unknown', `The stored draft of ${json.key} does not match its schema.`)
  }
  const published =
    json.published === null || json.published === undefined
      ? null
      : parseContent(kind, json.published)
  return {
    key: toDocumentKey(json.key),
    kind,
    title: json.title,
    draft,
    published,
    draftVersion: json.draft_version,
    publishedVersion: json.published_version,
    hasUnpublishedChanges: json.draft_version > json.published_version,
    updatedBy: json.updated_by_name || null,
    updatedAt: json.updated_at,
    publishedAt: json.published_at,
    scheduledAt: json.scheduled_at ?? null,
  }
}

export function toDocumentSummary(row: CmsDocumentRow): DocumentSummary {
  return {
    key: toDocumentKey(row.key),
    kind: row.kind,
    title: row.title,
    draftVersion: row.draft_version,
    publishedVersion: row.published_version,
    hasUnpublishedChanges: row.draft_version > row.published_version,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    scheduledAt: row.scheduled_at ?? null,
  }
}

export function toRevision(row: CmsRevisionRow, key: DocumentKey): Revision {
  return {
    id: row.id,
    key,
    version: row.version,
    note: row.note,
    createdBy: row.created_by_name || 'system',
    createdAt: row.created_at,
  }
}

export function toMediaAsset(row: CmsMediaRow): MediaAsset {
  return {
    id: row.id,
    bucket: row.bucket,
    path: row.path,
    url: row.url,
    alt: row.alt,
    mime: row.mime,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    uploadedBy: row.uploaded_by_name || 'system',
    createdAt: row.created_at,
  }
}

export function toAuditEntry(row: CmsAuditRow): AuditEntry {
  const documentKey =
    row.document_key !== null && parseDocumentKey(row.document_key) !== null
      ? (row.document_key as DocumentKey)
      : null
  return {
    id: row.id,
    actor: row.actor_name || 'system',
    action: row.action,
    documentKey,
    details: row.details,
    createdAt: row.created_at,
  }
}

// ---------------------------------------------------------------------------
// Round 2 (0006_features_round2.sql): discounts, reviews, stock alerts, returns, team
// ---------------------------------------------------------------------------

export type DiscountCodeRow = Tables<'discount_codes'>
export type ReviewRow = Views<'review_rows'>
export type StockAlertRow = Views<'stock_alert_rows'>

const discountTypeSchema = z.enum(['percent', 'fixed'])
const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected'])
const stockAlertStatusSchema = z.enum(['waiting', 'notified'])
const returnStatusSchema = z.enum(['requested', 'approved', 'rejected', 'received', 'refunded'])
const returnResolutionSchema = z.enum(['refund', 'exchange'])
const returnReasonSchema = z.enum([
  'wrong_size',
  'damaged',
  'not_as_described',
  'changed_mind',
  'other',
])
const adminRoleSchema = z.enum(['owner', 'staff'])

/** `to_jsonb(discount_codes)` as returned by `save_discount_code`; identical to the table row. */
export const discountCodeJsonSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: discountTypeSchema,
  value: z.number(),
  min_subtotal: z.number(),
  max_uses: z.number().nullable(),
  used_count: z.number(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

/** Result of `validate_discount_code` / shape of `AppliedDiscount`. */
export const appliedDiscountJsonSchema = z.object({
  code: z.string(),
  type: discountTypeSchema,
  value: z.number(),
  amount: z.number(),
})

export function toDiscountCode(row: DiscountCodeRow): DiscountCode {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: toNumber(row.value),
    minSubtotal: toNumber(row.min_subtotal),
    maxUses: row.max_uses,
    usedCount: row.used_count,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

export function toAppliedDiscount(
  json: z.infer<typeof appliedDiscountJsonSchema>,
): AppliedDiscount {
  return { code: json.code, type: json.type, value: json.value, amount: json.amount }
}

/** `to_jsonb(review_rows)` produced by `review_json(uuid)`; identical to the view row. */
export const reviewJsonSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  product_slug: z.string(),
  user_id: z.string().nullable(),
  author_name: z.string(),
  rating: z.number(),
  title: z.string(),
  body: z.string(),
  photo_urls: z.array(z.string()),
  is_verified_purchase: z.boolean(),
  status: reviewStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
})

function toReviewRating(value: number): Review['rating'] {
  if (Number.isInteger(value) && value >= 1 && value <= 5) return value as Review['rating']
  throw new AppError('unknown', `Unexpected review rating "${value}" received from the database.`)
}

export function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    userId: row.user_id,
    authorName: row.author_name,
    rating: toReviewRating(row.rating),
    title: row.title,
    body: row.body,
    photoUrls: [...row.photo_urls],
    isVerifiedPurchase: row.is_verified_purchase,
    status: row.status,
    createdAt: row.created_at,
  }
}

/** Produced by `review_summary(uuid)`. */
export const reviewSummaryJsonSchema = z.object({
  product_id: z.string(),
  average: z.number(),
  count: z.number(),
  distribution: z.tuple([z.number(), z.number(), z.number(), z.number(), z.number()]),
})

export function toReviewSummary(json: z.infer<typeof reviewSummaryJsonSchema>): ReviewSummary {
  return {
    productId: json.product_id,
    average: json.average,
    count: json.count,
    distribution: [...json.distribution],
  }
}

/** `to_jsonb(stock_alert_rows)` produced by `stock_alert_json(uuid)`; identical to the view row. */
export const stockAlertJsonSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  product_slug: z.string(),
  variant_id: z.string(),
  sku: z.string(),
  size: z.string(),
  color_name: z.string(),
  email: z.string(),
  status: stockAlertStatusSchema,
  created_at: z.string(),
  notified_at: z.string().nullable(),
})

export function toStockAlert(row: StockAlertRow): StockAlert {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    productSlug: row.product_slug,
    variantId: row.variant_id,
    sku: row.sku,
    size: toProductSize(row.size),
    colorName: row.color_name,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    notifiedAt: row.notified_at,
  }
}

/** Produced by `return_request_json(uuid)`; returned by every returns RPC. */
export const returnRequestJsonSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  order_number: z.string(),
  customer_name: z.string(),
  customer_email: z.string(),
  user_id: z.string().nullable(),
  items: z.array(
    z.object({
      order_item_id: z.string(),
      product_name: z.string(),
      size: z.string(),
      color_name: z.string(),
      quantity: z.number(),
      unit_price: z.number(),
    }),
  ),
  reason: returnReasonSchema,
  resolution: returnResolutionSchema,
  note: z.string(),
  status: returnStatusSchema,
  admin_note: z.string(),
  refund_amount: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
})
export const returnRequestListJsonSchema = z.array(returnRequestJsonSchema)

export function toReturnRequest(json: z.infer<typeof returnRequestJsonSchema>): ReturnRequest {
  return {
    id: json.id,
    orderId: json.order_id,
    orderNumber: json.order_number,
    customerName: json.customer_name,
    customerEmail: json.customer_email,
    items: json.items.map((item) => ({
      orderItemId: item.order_item_id,
      productName: item.product_name,
      size: item.size,
      colorName: item.color_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
    reason: json.reason,
    resolution: json.resolution,
    note: json.note,
    status: json.status,
    adminNote: json.admin_note,
    refundAmount: json.refund_amount,
    createdAt: json.created_at,
    updatedAt: json.updated_at,
  }
}

/** Produced by `team_member_json(uuid)`: an admin profile or a pending invite. */
export const teamMemberJsonSchema = z.object({
  id: z.string(),
  email: z.string(),
  full_name: z.string(),
  role: adminRoleSchema,
  status: z.enum(['active', 'invited']),
  last_active_at: z.string().nullable(),
  created_at: z.string(),
})
export const teamMemberListJsonSchema = z.array(teamMemberJsonSchema)

export function toTeamMember(json: z.infer<typeof teamMemberJsonSchema>): TeamMember {
  return {
    id: json.id,
    email: json.email,
    fullName: json.full_name,
    role: json.role,
    status: json.status,
    lastActiveAt: json.last_active_at,
    createdAt: json.created_at,
  }
}

export type { Enums }
