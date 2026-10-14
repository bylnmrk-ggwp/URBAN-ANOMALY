import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm, type DefaultValues, type UseFormReturn } from 'react-hook-form'
import type { z } from 'zod'

import type { Section } from '../../../domain/sections'

const LIVE_SYNC_DELAY_MS = 150

/**
 * One react-hook-form instance per section, validated with its Zod schema. Every change is
 * pushed to the draft (debounced) so the preview follows the keyboard. The caller remounts
 * the form (via `key`) when a different section is selected or the draft is replaced.
 */
export function useSectionForm<S extends Section>(
  schema: z.ZodType<S, S>,
  section: S,
  onChange: (next: S) => void,
): UseFormReturn<S> {
  const form = useForm<S>({
    resolver: zodResolver(schema),
    defaultValues: section as DefaultValues<S>,
    mode: 'onChange',
  })
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    let timer: number | undefined
    let pending: S | null = null
    const flush = () => {
      window.clearTimeout(timer)
      timer = undefined
      if (pending !== null) {
        const next = pending
        pending = null
        onChangeRef.current(next)
      }
    }
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values }) => {
        pending = values as S
        window.clearTimeout(timer)
        timer = window.setTimeout(flush, LIVE_SYNC_DELAY_MS)
      },
    })
    // Unmounting (closing the mobile sheet, switching sections) must not drop the last keystrokes.
    return () => {
      unsubscribe()
      flush()
    }
  }, [form])

  return form
}
