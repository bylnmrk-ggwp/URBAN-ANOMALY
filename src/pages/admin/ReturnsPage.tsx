import { Undo2 } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminReturns } from '@/features/returns/application/hooks'
import type { ReturnStatus } from '@/features/returns/domain/entities'
import { RETURN_STATUS_LABELS } from '@/features/returns/domain/entities'
import { ReturnDetailsSheet } from '@/features/returns/presentation/admin/ReturnDetailsSheet'
import { ReturnsTable } from '@/features/returns/presentation/admin/ReturnsTable'
import { pluralize } from '@/lib/format'

type Tab = ReturnStatus | 'all'

const TABS: Tab[] = ['all', 'requested', 'approved', 'received', 'refunded', 'rejected']

function isTab(value: string): value is Tab {
  return (TABS as string[]).includes(value)
}

export default function ReturnsPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const returns = useAdminReturns(tab)
  const requested = useAdminReturns('requested')
  const requestedCount = requested.data?.length ?? 0
  const selected = returns.data?.find((r) => r.id === selectedId) ?? null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns"
        description={
          returns.data
            ? `${pluralize(returns.data.length, 'return request')}${tab === 'all' ? ' in total' : ` ${RETURN_STATUS_LABELS[tab].toLowerCase()}`}.`
            : 'Review, approve and refund customer returns.'
        }
      />

      <Tabs value={tab} onValueChange={(v) => isTab(v) && setTab(v)}>
        <div className="overflow-x-auto pb-1">
          <TabsList variant="line" aria-label="Filter returns by status">
            {TABS.map((value) => (
              <TabsTrigger key={value} value={value} className="px-3">
                {value === 'all' ? 'All' : RETURN_STATUS_LABELS[value]}
                {value === 'requested' && requestedCount > 0 ? (
                  <span
                    className="bg-info/15 text-info rounded-full px-1.5 text-xs font-semibold tabular-nums"
                    aria-label={`${requestedCount} awaiting review`}
                  >
                    {requestedCount}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {returns.isError ? (
        <ErrorState
          title="Could not load returns"
          error={returns.error}
          onRetry={() => void returns.refetch()}
          isRetrying={returns.isRefetching}
        />
      ) : (
        <ReturnsTable
          requests={returns.data ?? []}
          isLoading={returns.isPending}
          onSelect={(r) => setSelectedId(r.id)}
          emptyState={
            <EmptyState
              icon={Undo2}
              title={tab === 'all' ? 'No return requests yet' : 'Nothing in this status'}
              description="Customers can request a return from a delivered order within the return window."
            />
          }
        />
      )}

      <ReturnDetailsSheet
        request={selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </div>
  )
}
