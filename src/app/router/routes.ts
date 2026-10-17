/** Route path constants and builders. Keep free of business logic. */
export const routes = {
  home: '/',
  shop: '/shop',
  collection: (slug: string) => `/collections/${slug}`,
  product: (slug: string) => `/products/${slug}`,
  cart: '/cart',
  checkout: '/checkout',
  orderConfirmation: (orderNumber: string) => `/orders/confirmation/${orderNumber}`,
  about: '/about',
  login: '/login',
  register: '/register',
  /** Code entry after sign-up; reached with the address in router state. */
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  account: '/account',
  myOrders: '/account/orders',
  orderDetails: (id: string) => `/account/orders/${id}`,
  /** Admin-created CMS pages. */
  page: (slug: string) => `/pages/${slug}`,
  // Agent A: storefront commerce
  wishlist: '/wishlist',
  accountWishlist: '/account/wishlist',
  track: '/track',
  admin: {
    dashboard: '/admin/dashboard',
    products: '/admin/products',
    productNew: '/admin/products/new',
    productEdit: (id: string) => `/admin/products/${id}/edit`,
    categories: '/admin/categories',
    inventory: '/admin/inventory',
    orders: '/admin/orders',
    orderDetails: (id: string) => `/admin/orders/${id}`,
    customers: '/admin/customers',
    settings: '/admin/settings',
    media: '/admin/media',
    navigation: '/admin/navigation',
    theme: '/admin/theme',
    announcement: '/admin/announcement',
    content: '/admin/content',
    editor: (key: string) => `/admin/editor?doc=${encodeURIComponent(key)}`,
    revisions: (key: string) => `/admin/content/revisions?doc=${encodeURIComponent(key)}`,
    // Agent A: storefront commerce
    stockAlerts: '/admin/stock-alerts',
    // Agent C: admin ops
    discounts: '/admin/discounts',
    team: '/admin/team',
    packingSlip: (id: string) => `/admin/orders/${id}/packing-slip`,
    // Agent B: reviews + returns
    reviews: '/admin/reviews',
    returns: '/admin/returns',
  },
} as const
