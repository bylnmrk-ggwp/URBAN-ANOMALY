import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, type DefaultValues, type UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'

import type { DraftDocumentState } from '../../application/useDraftDocument'
import type { ContentFor, DocumentKind } from '../../domain/documents'

export type GlobalKind = Exclude<DocumentKind, 'page'>

const SYNC_DELAY_MS = 200

type PushResult = 'pushed' | 'unchanged' | 'invalid'

export interface GlobalDraftForm<K extends GlobalKind> {
  form: UseFormReturn<ContentFor<K>>
  /** True when the form or the document holds changes that are not saved. */
  isDirty: boolean
  /** Validates, pushes the form to the draft and saves. Resolves false when invalid. */
  saveDraft: () => Promise<boolean>
  /** Validates, pushes the form to the draft and publishes. Resolves false when invalid. */
  publishDraft: (note?: string) => Promise<boolean>
  /** Drops local edits (form and hook) back to the last loaded draft. */
  discardChanges: () => void
}

/**
 * Binds a react-hook-form instance to a `useDraftDocument` handle: the form is reset from
 * the server draft whenever the hook holds no local edits (load, save, publish, reload,
 * discard, restore), and valid form values are pushed back to `setDraft` on change with a
 * short debounce so live previews and the dirty state stay in step.
 */
export function useGlobalDraftForm<K extends GlobalKind>(
  doc: DraftDocumentState<K>,
  schema: z.ZodType<ContentFor<K>, ContentFor<K>>,
  initial: ContentFor<K>,
): GlobalDraftForm<K> {
  const form = useForm<ContentFor<K>>({
    resolver: zodResolver(schema),
    defaultValues: initial as DefaultValues<ContentFor<K>>,
    mode: 'onBlur',
  })
  const { draft, isDirty: docDirty, setDraft, save, publish, discard } = doc
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [syncPending, setSyncPending] = useState(false)
  /**
   * Serialised snapshot of the last values pushed to (or reset from) the draft. Pushing an
   * identical object again would give the hook a new reference and re-dirty a just-saved
   * document, so unchanged values are never pushed.
   */
  const lastPushed = useRef<string | null>(null)

  // Server draft is the source of truth whenever the hook has no local edits.
  useEffect(() => {
    if (!draft || docDirty) return
    lastPushed.current = JSON.stringify(draft)
    form.reset(draft)
  }, [draft, docDirty, form])

  /**
   * `useDraftDocument`'s mutations read the draft from their render closure, so a mutation
   * must not start until React has committed a pushed draft. Resolvers queued here are run
   * from a deps-less effect, i.e. after every effect of the next commit (TanStack's
   * `setOptions` included) has flushed.
   */
  const commitWaiters = useRef<Array<() => void>>([])
  useEffect(() => {
    const waiters = commitWaiters.current
    commitWaiters.current = []
    waiters.forEach((resolve) => resolve())
  })
  const afterNextCommit = () =>
    new Promise<void>((resolve) => {
      commitWaiters.current.push(resolve)
    })

  const pushNow = useCallback((): PushResult => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setSyncPending(false)
    const values = form.getValues()
    const snapshot = JSON.stringify(values)
    if (snapshot === lastPushed.current) return 'unchanged'
    const parsed = schema.safeParse(values)
    if (!parsed.success) return 'invalid'
    lastPushed.current = snapshot
    const next = parsed.data
    setDraft(() => next)
    return 'pushed'
  }, [form, schema, setDraft])

  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true, isDirty: true },
      callback: ({ isDirty, values }) => {
        if (!isDirty || JSON.stringify(values) === lastPushed.current) return
        setSyncPending(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => void pushNow(), SYNC_DELAY_MS)
      },
    })
    return () => {
      unsubscribe()
      if (timer.current) clearTimeout(timer.current)
    }
  }, [form, pushNow])

  const prepare = useCallback(async () => {
    const valid = await form.trigger()
    if (!valid) return false
    if (pushNow() === 'pushed') await afterNextCommit()
    return true
  }, [form, pushNow])

  const saveDraft = useCallback(async () => {
    if (!(await prepare())) return false
    await save.mutateAsync().catch(() => undefined)
    return true
  }, [prepare, save])

  const publishDraft = useCallback(
    async (note?: string) => {
      if (!(await prepare())) return false
      await publish.mutateAsync(note).catch(() => undefined)
      return true
    },
    [prepare, publish],
  )

  const discardChanges = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setSyncPending(false)
    discard()
    if (draft) {
      lastPushed.current = JSON.stringify(draft)
      form.reset(draft)
    }
  }, [discard, draft, form])

  return {
    form,
    isDirty: docDirty || form.formState.isDirty || syncPending,
    saveDraft,
    publishDraft,
    discardChanges,
  }
}
