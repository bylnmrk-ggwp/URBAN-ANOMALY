import { Info } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ContentStatusCard } from '@/features/cms/presentation/editor/ContentStatusCard'
import { useDashboardSummary } from '@/features/dashboard/application/hooks'
import { ActivityFeed } from '@/features/dashboard/presentation/ActivityFeed'
import { BestSellersList } from '@/features/dashboard/presentation/BestSellersList'
import { KpiCards } from '@/features/dashboard/presentation/KpiCards'
import { LowStockList } from '@/features/dashboard/presentation/LowStockList'
import { RecentOrdersTable } from '@/features/dashboard/presentation/RecentOrdersTable'
import { SalesChart } from '@/features/dashboard/presentation/SalesChart'

const RANGES = [7, 30, 90] as const
type Range = (typeof RANGES)[number]

function parseRange(value: string): Range | undefined {
  return RANGES.find((r) => String(r) === value)
}

export default function DashboardPage() {
  const [days, setDays] = useState<Range>(30)
  const summary = useDashboardSummary(days)
  const isLoading = summary.isPending
  const data = summary.data

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Sales, orders and stock at a glance."
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="dashboard-range" className="text-muted-foreground text-xs">
              Range
            </Label>
            <Select
              value={String(days)}
              onValueChange={(value) => {
                const next = parseRange(value)
                if (next) setDays(next)
              }}
            >
              <SelectTrigger id="dashboard-range" size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    Last {r} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {data?.isDemoData ? (
        <div
          role="note"
          className="bg-muted text-muted-foreground flex items-start gap-2 rounded-lg border px-4 py-3 text-sm"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            <span className="text-foreground font-medium">Demo data</span> — figures come from
            in-memory mock repositories, not Supabase.
          </p>
        </div>
      ) : null}

      {summary.isError ? (
        <ErrorState
          title="Could not load the dashboard"
          error={summary.error}
          onRetry={() => void summary.refetch()}
          isRetrying={summary.isRefetching}
        />
      ) : (
        <>
          <KpiCards kpis={data?.kpis} isLoading={isLoading} />
          <ContentStatusCard />
          <SalesChart series={data?.salesSeries} isLoading={isLoading} days={days} />
          <div className="grid min-w-0 gap-6 lg:grid-cols-3">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <RecentOrdersTable orders={data?.recentOrders} isLoading={isLoading} />
              <BestSellersList items={data?.bestSellers} isLoading={isLoading} />
            </div>
            <div className="min-w-0 space-y-6">
              <LowStockList rows={data?.lowStock} isLoading={isLoading} />
              <ActivityFeed events={data?.recentActivity} isLoading={isLoading} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
