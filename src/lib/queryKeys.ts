export const queryKeys = {
  products: {
    all: ['products'] as const,
    published: (filters: unknown) => ['products', 'published', filters] as const,
    bySlug: (slug: string) => ['products', 'slug', slug] as const,
    byId: (id: string) => ['products', 'id', id] as const,
    featured: ['products', 'featured'] as const,
    related: (productId: string) => ['products', 'related', productId] as const,
    admin: (filters: unknown) => ['products', 'admin', filters] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    list: (filters: unknown) => ['inventory', 'list', filters] as const,
    movements: (variantId: string) => ['inventory', 'movements', variantId] as const,
  },
  orders: {
    all: ['orders'] as const,
    mine: ['orders', 'mine'] as const,
    byId: (id: string) => ['orders', 'id', id] as const,
    byNumber: (orderNumber: string) => ['orders', 'number', orderNumber] as const,
    admin: (filters: unknown) => ['orders', 'admin', filters] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (search: string) => ['customers', 'list', search] as const,
    byId: (id: string) => ['customers', 'id', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
  },
  settings: {
    store: ['settings', 'store'] as const,
  },
  auth: {
    session: ['auth', 'session'] as const,
  },
  cms: {
    all: ['cms'] as const,
    published: (key: string) => ['cms', 'published', key] as const,
    publishedPages: ['cms', 'published', 'pages'] as const,
    documents: ['cms', 'documents'] as const,
    document: (key: string) => ['cms', 'document', key] as const,
    revisions: (key: string) => ['cms', 'revisions', key] as const,
    audit: ['cms', 'audit'] as const,
  },
  media: {
    all: ['media'] as const,
    list: (search: string) => ['media', 'list', search] as const,
    usages: (id: string) => ['media', 'usages', id] as const,
  },
  discounts: {
    all: ['discounts'] as const,
    validate: (code: string, subtotal: number) =>
      ['discounts', 'validate', code, subtotal] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    product: (productId: string) => ['reviews', 'product', productId] as const,
    summary: (productId: string) => ['reviews', 'summary', productId] as const,
    admin: (filters: unknown) => ['reviews', 'admin', filters] as const,
  },
  stockAlerts: {
    all: ['stockAlerts'] as const,
  },
  returns: {
    all: ['returns'] as const,
    forOrder: (orderId: string) => ['returns', 'order', orderId] as const,
    admin: (status: string) => ['returns', 'admin', status] as const,
  },
  team: {
    all: ['team'] as const,
  },
  cart: {
    validation: (items: unknown) => ['cart', 'validation', items] as const,
  },
}
