import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'

import { repositories } from '@/config/repositories'
import { getErrorMessage, isAppError } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'

import type {
  CmsDocument,
  ContentFor,
  DocumentKey,
  DocumentKind,
  Revision,
} from '../domain/documents'

interface LocalDraft<K extends DocumentKind> {
  key: DocumentKey
  /** `draftVersion` the edits were based on; sent to the repository for optimistic locking. */
  baseVersion: number
  content: ContentFor<K>
}

interface MutationContext<K extends DocumentKind> {
  /** The local content that was sent, so edits typed mid-flight are not lost. */
  sent: ContentFor<K> | null
}

export interface DraftDocumentState<K extends DocumentKind> {
  document: CmsDocument<K> | null
  isLoading: boolean
  error: unknown
  /** What the editor shows: local edits when present, otherwise the loaded draft. */
  draft: ContentFor<K> | null
  setDraft: (updater: (current: ContentFor<K>) => ContentFor<K>) => void
  isDirty: boolean
  save: UseMutationResult<CmsDocument<K>, Error, void, MutationContext<K>>
  /** Saves first when dirty, then publishes with an optional note. */
  publish: UseMutationResult<CmsDocument<K>, Error, string | undefined, MutationContext<K>>
  restore: UseMutationResult<CmsDocument<K>, Error, number>
  /** Saves first when dirty, then schedules the draft to publish at the given ISO time. */
  schedule: UseMutationResult<CmsDocument<K>, Error, string, MutationContext<K>>
  cancelSchedule: UseMutationResult<CmsDocument<K>, Error, void>
  revisions: UseQueryResult<Revision[]>
  /** True after a save was rejected because someone else saved first. */
  conflict: boolean
  /** Refetches the document, drops local edits and clears the conflict. */
  reload: () => Promise<void>
  /** Drops local edits without touching the server. */
  discard: () => void
}

/**
 * Editor read/write for one document. Local edits live in component state, keyed on the
 * draft version they were based on; the loaded document is the source of truth whenever
 * there are no local edits, so a refetch (or another editor's save) shows up immediately.
 */
export function useDraftDocument<K extends DocumentKind>(
  kind: K,
  key: DocumentKey,
): DraftDocumentState<K> {
  const queryClient = useQueryClient()
  const [local, setLocal] = useState<LocalDraft<K> | null>(null)
  const [conflict, setConflict] = useState(false)

  const query = useQuery({
    queryKey: queryKeys.cms.document(key),
    queryFn: () => repositories.cms.getDocument(kind, key),
  })
  const document = query.data ?? null

  const revisions = useQuery({
    queryKey: queryKeys.cms.revisions(key),
    queryFn: () => repositories.cms.listRevisions(key),
  })

  // Edits made for another key (the component was reused) are ignored, never shown.
  const edits = local && local.key === key ? local : null
  const draft = edits?.content ?? document?.draft ?? null
  const isDirty = edits !== null

  const setDraft = useCallback(
    (updater: (current: ContentFor<K>) => ContentFor<K>) => {
      const loaded = queryClient.getQueryData<CmsDocument<K> | null>(queryKeys.cms.document(key))
      if (!loaded) return
      setLocal((prev) => {
        const current = prev && prev.key === key ? prev : null
        return {
          key,
          baseVersion: current?.baseVersion ?? loaded.draftVersion,
          content: updater(current?.content ?? loaded.draft),
        }
      })
    },
    [key, queryClient],
  )

  const applySaved = useCallback(
    (saved: CmsDocument<K>, sent: ContentFor<K> | null) => {
      queryClient.setQueryData(queryKeys.cms.document(key), saved)
      setConflict(false)
      setLocal((prev) => {
        if (!prev || prev.key !== key) return prev
        // Keep edits typed while the request was in flight, re-based on the new version.
        if (sent !== null && prev.content !== sent) {
          return { ...prev, baseVersion: saved.draftVersion }
        }
        return null
      })
    },
    [key, queryClient],
  )

  const handleError = useCallback((error: unknown, fallback: string) => {
    if (isAppError(error) && error.code === 'conflict') {
      setConflict(true)
      return
    }
    toast.error(getErrorMessage(error, fallback))
  }, [])

  const save = useMutation<CmsDocument<K>, Error, void, MutationContext<K>>({
    onMutate: () => ({ sent: edits?.content ?? null }),
    mutationFn: async () => {
      if (!edits) throw new Error('Nothing to save.')
      return repositories.cms.saveDraft(kind, key, edits.content, edits.baseVersion)
    },
    onSuccess: async (saved, _vars, context) => {
      applySaved(saved, context.sent)
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.documents })
      toast.success('Draft saved.')
    },
    onError: (error) => handleError(error, 'Could not save the draft.'),
  })

  const publish = useMutation<CmsDocument<K>, Error, string | undefined, MutationContext<K>>({
    onMutate: () => ({ sent: edits?.content ?? null }),
    mutationFn: async (note) => {
      if (edits) {
        await repositories.cms.saveDraft(kind, key, edits.content, edits.baseVersion)
      }
      return repositories.cms.publish(kind, key, note ?? '')
    },
    onSuccess: async (published, _vars, context) => {
      applySaved(published, context.sent)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cms.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cms.published(key) }),
      ])
      toast.success('Published.')
    },
    onError: (error) => handleError(error, 'Could not publish.'),
  })

  const restore = useMutation<CmsDocument<K>, Error, number>({
    mutationFn: (version) => repositories.cms.restoreRevision(kind, key, version),
    onSuccess: async (restored, version) => {
      queryClient.setQueryData(queryKeys.cms.document(key), restored)
      setLocal(null)
      setConflict(false)
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.all })
      toast.success(`Version ${version} restored to draft.`)
    },
    onError: (error) => handleError(error, 'Could not restore this version.'),
  })

  const schedule = useMutation<CmsDocument<K>, Error, string, MutationContext<K>>({
    onMutate: () => ({ sent: edits?.content ?? null }),
    mutationFn: async (at) => {
      if (edits) {
        await repositories.cms.saveDraft(kind, key, edits.content, edits.baseVersion)
      }
      return repositories.cms.schedulePublish(kind, key, at)
    },
    onSuccess: async (scheduled, _vars, context) => {
      applySaved(scheduled, context.sent)
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.all })
      toast.success('Publish scheduled.')
    },
    onError: (error) => handleError(error, 'Could not schedule the publish.'),
  })

  const cancelSchedule = useMutation<CmsDocument<K>, Error, void>({
    mutationFn: () => repositories.cms.cancelSchedule(kind, key),
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.cms.document(key), updated)
      await queryClient.invalidateQueries({ queryKey: queryKeys.cms.all })
      toast.success('Schedule cancelled.')
    },
    onError: (error) => handleError(error, 'Could not cancel the schedule.'),
  })

  const reload = useCallback(async () => {
    await query.refetch()
    setLocal(null)
    setConflict(false)
  }, [query])

  const discard = useCallback(() => {
    setLocal(null)
    setConflict(false)
  }, [])

  return {
    document,
    isLoading: query.isPending,
    error: query.error,
    draft,
    setDraft,
    isDirty,
    save,
    publish,
    restore,
    schedule,
    cancelSchedule,
    revisions,
    conflict,
    reload,
    discard,
  }
}
