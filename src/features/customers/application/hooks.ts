import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

export function useCustomers(search: string) {
  return useQuery({
    queryKey: queryKeys.customers.list(search),
    queryFn: () => repositories.customers.list(search),
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id: string | null) {
  return useQuery({
    queryKey: queryKeys.customers.byId(id ?? ''),
    queryFn: () => repositories.customers.getById(id ?? ''),
    enabled: Boolean(id),
  })
}
