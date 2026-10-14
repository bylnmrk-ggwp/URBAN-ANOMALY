import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

export function useDashboardSummary(days: number) {
  return useQuery({
    // Prefixed by the shared summary key so mutations invalidating it cover every range.
    queryKey: [...queryKeys.dashboard.summary, days] as const,
    queryFn: () => repositories.dashboard.getSummary({ days }),
    placeholderData: keepPreviousData,
  })
}
