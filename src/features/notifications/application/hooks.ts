import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { toast } from 'sonner'

import { repositories } from '@/config/repositories'
import type { AppNotification } from '@/features/notifications/domain/entities'
import { queryKeys } from '@/lib/queryKeys'

const key = queryKeys.notifications.all

export function useNotifications() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: key,
    queryFn: () => repositories.notifications.list(),
  })

  useEffect(() => {
    return repositories.notifications.subscribe((incoming) => {
      queryClient.setQueryData<AppNotification[]>(key, (current = []) => [
        incoming,
        ...current.filter((n) => n.id !== incoming.id),
      ])
      toast.info(incoming.title, { description: incoming.message })
    })
  }, [queryClient])

  const patchCache = useCallback(
    (update: (n: AppNotification) => AppNotification) => {
      queryClient.setQueryData<AppNotification[]>(key, (current = []) => current.map(update))
    },
    [queryClient],
  )

  const markReadMutation = useMutation({
    mutationFn: (id: string) => repositories.notifications.markRead(id),
    onMutate: (id) => patchCache((n) => (n.id === id ? { ...n, isRead: true } : n)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => repositories.notifications.markAllRead(),
    onMutate: () => patchCache((n) => ({ ...n, isRead: true })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const notifications = query.data ?? []
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return {
    notifications,
    unreadCount,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
    isMarkingAllRead: markAllReadMutation.isPending,
    isLoading: query.isPending,
    error: query.error,
  }
}
