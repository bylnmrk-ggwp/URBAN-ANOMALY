import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

import type { CategoryInput } from '../domain/entities'

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: () => repositories.categories.list(),
    staleTime: 5 * 60_000,
  })
}

export function useCategoryMutations() {
  const queryClient = useQueryClient()

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
    ])
  }

  const create = useMutation({
    mutationFn: (input: CategoryInput) => repositories.categories.create(input),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryInput }) =>
      repositories.categories.update(id, input),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: string) => repositories.categories.remove(id),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
