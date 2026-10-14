import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { repositories } from '@/config/repositories'
import { queryKeys } from '@/lib/queryKeys'

import type { AdminRole } from '../domain/entities'

export function useTeam() {
  return useQuery({
    queryKey: queryKeys.team.all,
    queryFn: () => repositories.team.list(),
  })
}

export function useTeamMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.team.all })

  const invite = useMutation({
    mutationFn: (input: { email: string; fullName: string; role: AdminRole }) =>
      repositories.team.invite(input),
    onSuccess: invalidate,
  })
  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRole }) =>
      repositories.team.updateRole(id, role),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => repositories.team.remove(id),
    onSuccess: invalidate,
  })

  return { invite, updateRole, remove }
}
