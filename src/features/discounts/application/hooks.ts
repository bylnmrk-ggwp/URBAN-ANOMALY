import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

import type { DiscountInput } from '../domain/entities'

/** Storefront: checks a code against the current subtotal. Errors carry the reason message. */
export function useValidateDiscount() {
  return useMutation({
    mutationFn: ({ code, subtotal }: { code: string; subtotal: number }) =>
      repositories.discounts.validate(code, subtotal),
  })
}

export function useDiscounts() {
  return useQuery({
    queryKey: queryKeys.discounts.all,
    queryFn: () => repositories.discounts.list(),
  })
}

export function useDiscountMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all })

  const create = useMutation({
    mutationFn: (input: DiscountInput) => repositories.discounts.create(input),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: DiscountInput }) =>
      repositories.discounts.update(id, input),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => repositories.discounts.remove(id),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
