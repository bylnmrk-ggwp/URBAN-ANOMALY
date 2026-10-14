import type { DiscountCode } from '@/features/discounts/domain/entities'
import type { ReturnRequest } from '@/features/returns/domain/entities'
import type { Review } from '@/features/reviews/domain/entities'
import type { StockAlert } from '@/features/stock-alerts/domain/entities'
import type { TeamMember } from '@/features/team/domain/entities'
import type { AuthSession } from '@/features/auth/domain/entities'
import type { Category } from '@/features/categories/domain/entities'
import { DEFAULT_DOCUMENTS, DEFAULT_MEDIA } from '@/features/cms/domain/defaults'
import type {
  AuditEntry,
  DocumentKey,
  DocumentKind,
  Revision,
} from '@/features/cms/domain/documents'
import type { MediaAsset } from '@/features/cms/domain/media'
import type { InventoryMovement } from '@/features/inventory/domain/entities'
import type { AppNotification } from '@/features/notifications/domain/entities'
import type { Order } from '@/features/orders/domain/entities'
import type { Product } from '@/features/products/domain/entities'
import type { StoreSettings } from '@/features/settings/domain/entities'

import { SEED_CATEGORIES } from './data/categories'
import { SEED_MOVEMENTS } from './data/movements'
import { SEED_NOTIFICATIONS } from './data/notifications'
import { SEED_ORDERS, SEED_ORDER_SEQUENCE_START } from './data/orders'
import { SEED_PRODUCTS } from './data/products'
import { SEED_SETTINGS } from './data/settings'
import type { MockUserAccount } from './data/users'
import { SEED_USERS } from './data/users'
import { clone, nowIso } from './helpers'

type NotificationListener = (notification: AppNotification) => void

/** Storage shape of one CMS document; `hasUnpublishedChanges` is derived from the versions. */
export interface MockCmsRow {
  key: DocumentKey
  kind: DocumentKind
  title: string
  draft: unknown
  published: unknown | null
  draftVersion: number
  publishedVersion: number
  updatedBy: string | null
  updatedAt: string
  publishedAt: string | null
  /** Pending scheduled publish; published lazily by MockCmsRepository when due. */
  scheduledAt: string | null
}

const CMS_SEED_AT = '2026-09-01T08:00:00.000Z'

const MIN_LATENCY_MS = 150
const MAX_LATENCY_MS = 400

/**
 * Single in-memory source of truth shared by every mock repository, so an
 * order placed at checkout shows up in the admin pages without a reload.
 */
export class MockStore {
  products: Product[]
  categories: Category[]
  orders: Order[]
  users: MockUserAccount[]
  notifications: AppNotification[]
  settings: StoreSettings
  movements: InventoryMovement[]
  cmsDocuments: Map<DocumentKey, MockCmsRow>
  cmsRevisions: Revision[]
  /** Revision id -> content snapshot. */
  cmsRevisionContent: Map<string, unknown>
  cmsMedia: MediaAsset[]
  cmsAudit: AuditEntry[]
  discounts: DiscountCode[] = []
  reviews: Review[] = []
  stockAlerts: StockAlert[] = []
  returns: ReturnRequest[] = []
  team: TeamMember[] = []

  /** Set by MockAuthRepository; read by repositories that scope data to the signed-in user. */
  currentSession: AuthSession | null = null

  private orderSequence: number
  private idCounter = 0
  private readonly notificationListeners = new Set<NotificationListener>()

  constructor() {
    this.products = clone(SEED_PRODUCTS)
    this.categories = clone(SEED_CATEGORIES)
    this.orders = clone(SEED_ORDERS)
    this.users = clone(SEED_USERS)
    this.notifications = clone(SEED_NOTIFICATIONS)
    this.settings = clone(SEED_SETTINGS)
    this.movements = clone(SEED_MOVEMENTS)
    this.cmsDocuments = new Map()
    this.cmsRevisions = []
    this.cmsRevisionContent = new Map()
    for (const doc of DEFAULT_DOCUMENTS) {
      this.cmsDocuments.set(doc.key, {
        key: doc.key,
        kind: doc.kind,
        title: doc.title,
        draft: clone(doc.content),
        published: clone(doc.content),
        draftVersion: 1,
        publishedVersion: 1,
        updatedBy: 'Store Admin',
        updatedAt: CMS_SEED_AT,
        publishedAt: CMS_SEED_AT,
        scheduledAt: null,
      })
      const revisionId = `rev-${doc.key}-1`
      this.cmsRevisions.push({
        id: revisionId,
        key: doc.key,
        version: 1,
        note: 'Initial content',
        createdBy: 'Store Admin',
        createdAt: CMS_SEED_AT,
      })
      this.cmsRevisionContent.set(revisionId, clone(doc.content))
    }
    this.cmsMedia = clone(DEFAULT_MEDIA)
    this.cmsAudit = []
    this.orderSequence = SEED_ORDER_SEQUENCE_START + SEED_ORDERS.length
  }

  /** Simulates network latency. Instant under Vitest so tests stay fast. */
  delay(ms?: number): Promise<void> {
    if (import.meta.env.MODE === 'test') return Promise.resolve()
    const wait = ms ?? MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS)
    return new Promise((resolve) => setTimeout(resolve, wait))
  }

  nextId(prefix = 'id'): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}-${crypto.randomUUID()}`
    }
    this.idCounter += 1
    return `${prefix}-${Date.now().toString(36)}-${this.idCounter}`
  }

  nextOrderSequence(): number {
    this.orderSequence += 1
    return this.orderSequence
  }

  onNotification(listener: NotificationListener): () => void {
    this.notificationListeners.add(listener)
    return () => {
      this.notificationListeners.delete(listener)
    }
  }

  /** Stores a new unread notification and fans it out to subscribers. */
  pushNotification(input: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>): AppNotification {
    const notification: AppNotification = {
      ...input,
      id: this.nextId('ntf'),
      isRead: false,
      createdAt: nowIso(),
    }
    this.notifications.unshift(notification)
    for (const listener of this.notificationListeners) listener(notification)
    return notification
  }

  findProduct(id: string): Product | undefined {
    return this.products.find((p) => p.id === id)
  }

  findOrder(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id)
  }

  findVariant(variantId: string) {
    for (const product of this.products) {
      const variant = product.variants.find((v) => v.id === variantId)
      if (variant) return { product, variant }
    }
    return null
  }
}
