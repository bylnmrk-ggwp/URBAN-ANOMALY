import {
  BellRing,
  Boxes,
  FileText,
  Images,
  LayoutDashboard,
  Menu,
  Package,
  Palette,
  Receipt,
  Settings,
  Star,
  Tags,
  TicketPercent,
  Undo2,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { routes } from '@/app/router/routes'
import type { Permission } from '@/features/team/domain/entities'

export interface AdminNavItem {
  label: string
  to: string
  icon: LucideIcon
  /** When set, the item is hidden from admin sub-roles that lack the permission. */
  permission?: Permission
}

export const adminNavItems: AdminNavItem[] = [
  { label: 'Dashboard', to: routes.admin.dashboard, icon: LayoutDashboard },
  { label: 'Content', to: routes.admin.content, icon: FileText },
  { label: 'Media', to: routes.admin.media, icon: Images },
  { label: 'Navigation', to: routes.admin.navigation, icon: Menu },
  { label: 'Theme', to: routes.admin.theme, icon: Palette, permission: 'theme.edit' },
  { label: 'Products', to: routes.admin.products, icon: Package },
  { label: 'Categories', to: routes.admin.categories, icon: Tags },
  { label: 'Inventory', to: routes.admin.inventory, icon: Boxes },
  // Agent A: storefront commerce
  { label: 'Stock alerts', to: routes.admin.stockAlerts, icon: BellRing },
  { label: 'Orders', to: routes.admin.orders, icon: Receipt },
  // Agent B: reviews + returns
  { label: 'Returns', to: routes.admin.returns, icon: Undo2 },
  // Agent C: admin ops
  {
    label: 'Discounts',
    to: routes.admin.discounts,
    icon: TicketPercent,
    permission: 'discounts.manage',
  },
  { label: 'Customers', to: routes.admin.customers, icon: Users },
  // Agent B: reviews + returns
  { label: 'Reviews', to: routes.admin.reviews, icon: Star },
  // Agent C: admin ops
  { label: 'Team', to: routes.admin.team, icon: UserCog, permission: 'team.manage' },
  { label: 'Settings', to: routes.admin.settings, icon: Settings, permission: 'settings.edit' },
]

/** Human labels for admin path segments; anything unmapped is an id and reads "Details". */
export const adminSegmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  inventory: 'Inventory',
  orders: 'Orders',
  customers: 'Customers',
  settings: 'Settings',
  media: 'Media',
  navigation: 'Navigation',
  theme: 'Theme',
  announcement: 'Announcement bar',
  content: 'Content',
  editor: 'Editor',
  revisions: 'History',
  new: 'New',
  edit: 'Edit',
  // Agent A: storefront commerce
  'stock-alerts': 'Stock alerts',
  // Agent B: reviews + returns
  reviews: 'Reviews',
  returns: 'Returns',
  // Agent C: admin ops
  discounts: 'Discounts',
  team: 'Team',
  'packing-slip': 'Packing slip',
}
