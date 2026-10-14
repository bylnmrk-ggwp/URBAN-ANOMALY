import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { repositories } from '@/config/repositories'
import { getErrorMessage } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'

/** Admin list of every editable document with draft/published status. */
export function useCmsDocuments() {
  return useQuery({
    queryKey: queryKeys.cms.documents,
    queryFn: () => repositories.cms.listDocuments(),
  })
}

export function useCmsAudit(limit: number) {
  return useQuery({
    queryKey: [...queryKeys.cms.audit, limit] as const,
    queryFn: () => repositories.cms.listAudit(limit),
  })
}

function useInvalidateCms() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.cms.all })
}

export function useCreatePage() {
  const invalidate = useInvalidateCms()
  return useMutation({
    mutationFn: ({ slug, title }: { slug: string; title: string }) =>
      repositories.cms.createPage(slug, title),
    onSuccess: async (document) => {
      await invalidate()
      toast.success(`"${document.title}" created.`)
    },
  })
}

export function useDeletePage() {
  const invalidate = useInvalidateCms()
  return useMutation({
    mutationFn: (slug: string) => repositories.cms.deletePage(slug),
    onSuccess: async () => {
      await invalidate()
      toast.success('Page deleted.')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not delete the page.')),
  })
}
