import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { repositories } from '@/config/repositories'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'

import type { StoreSettingsInput } from '../domain/entities'

export function useStoreSettings() {
  return useQuery({
    queryKey: queryKeys.settings.store,
    queryFn: () => repositories.settings.get(),
  })
}

export function useUpdateStoreSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: StoreSettingsInput) => repositories.settings.update(input),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings.store, settings)
      toast.success('Settings saved.')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save settings.')),
  })
}
