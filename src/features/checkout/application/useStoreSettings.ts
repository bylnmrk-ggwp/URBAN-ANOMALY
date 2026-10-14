import { useQuery } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

export function useStoreSettings() {
  return useQuery({
    queryKey: queryKeys.settings.store,
    queryFn: () => repositories.settings.get(),
    staleTime: 5 * 60_000,
  })
}
