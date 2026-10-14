import {
  Banknote,
  Clock,
  type LucideIcon,
  PackageCheck,
  PackageOpen,
  ShoppingCart,
  Tag,
  TriangleAlert,
} from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatPrice } from '@/lib/format'

import type { DashboardKpis } from '../domain/entities'

interface KpiDefinition {
  key: keyof DashboardKpis
  label: string
  icon: LucideIcon
  format: (value: number) => string
}

const integer = (value: number) => value.toLocaleString('en-PH')

const KPI_DEFINITIONS: KpiDefinition[] = [
  { key: 'totalSales', label: 'Total Sales', icon: Banknote, format: formatPrice },
  { key: 'totalOrders', label: 'Total Orders', icon: ShoppingCart, format: integer },
  { key: 'pendingOrders', label: 'Pending Orders', icon: Clock, format: integer },
  { key: 'processingOrders', label: 'Processing Orders', icon: PackageOpen, format: integer },
  { key: 'deliveredOrders', label: 'Delivered Orders', icon: PackageCheck, format: integer },
  { key: 'totalProducts', label: 'Total Products', icon: Tag, format: integer },
  { key: 'lowStockProducts', label: 'Low Stock Products', icon: TriangleAlert, format: integer },
]

interface KpiCardsProps {
  kpis: DashboardKpis | undefined
  isLoading: boolean
}

export function KpiCards({ kpis, isLoading }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={isLoading}>
      {KPI_DEFINITIONS.map(({ key, label, icon: Icon, format }) => {
        const value = kpis?.[key]
        const warn = key === 'lowStockProducts' && value !== undefined && value > 0
        return (
          <Card key={key} className="gap-0 rounded-lg py-4 shadow-none">
            <CardContent className="px-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {label}
                </p>
                <Icon
                  className={`size-4 shrink-0 ${warn ? 'text-warning' : 'text-muted-foreground'}`}
                  aria-hidden="true"
                />
              </div>
              {isLoading || value === undefined ? (
                <Skeleton className="mt-3 h-7 w-24" />
              ) : (
                <p
                  className={`mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl ${warn ? 'text-warning' : ''}`}
                >
                  {format(value)}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
