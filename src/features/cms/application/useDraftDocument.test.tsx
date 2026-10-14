import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { repositories } from '@/config/repositories'
import { pageKey } from '@/features/cms/domain/documents'
import { createTestQueryClient } from '@/tests/render'

import { useDraftDocument } from './useDraftDocument'

// Fresh in-memory store for this spec file so version numbers are predictable.
vi.mock('@/config/repositories', async () => {
  const { createMockRepositoriesForTest } = await import('@/mocks/createMockRepositories')
  return { repositories: createMockRepositoriesForTest().repositories }
})

const KEY = pageKey('about')

function renderDraft() {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useDraftDocument('page', KEY), { wrapper })
}

describe('useDraftDocument', () => {
  beforeEach(async () => {
    await repositories.auth.signIn({ email: 'admin@demo.local', password: 'password' })
  })

  it('tracks dirty state and saves against the loaded draft version', async () => {
    const { result } = renderDraft()
    await waitFor(() => expect(result.current.document).not.toBeNull())

    const loadedVersion = result.current.document?.draftVersion ?? 0
    expect(result.current.isDirty).toBe(false)
    expect(result.current.draft).toEqual(result.current.document?.draft)

    act(() => {
      result.current.setDraft((current) => ({ ...current, title: 'About us (edited)' }))
    })
    expect(result.current.isDirty).toBe(true)
    expect(result.current.draft?.title).toBe('About us (edited)')
    // The loaded document itself is untouched until save.
    expect(result.current.document?.draft.title).not.toBe('About us (edited)')

    await act(async () => {
      await result.current.save.mutateAsync()
    })

    await waitFor(() => expect(result.current.isDirty).toBe(false))
    expect(result.current.document?.draftVersion).toBe(loadedVersion + 1)
    expect(result.current.document?.draft.title).toBe('About us (edited)')
    expect(result.current.draft?.title).toBe('About us (edited)')
    expect(result.current.conflict).toBe(false)

    const stored = await repositories.cms.getDocument('page', KEY)
    expect(stored?.draft.title).toBe('About us (edited)')
  })

  it('flags a conflict when the server draft moved on, keeps local edits, and reload recovers', async () => {
    const { result } = renderDraft()
    await waitFor(() => expect(result.current.document).not.toBeNull())
    const loaded = result.current.document
    if (!loaded) throw new Error('document not loaded')

    act(() => {
      result.current.setDraft((current) => ({ ...current, title: 'Mine' }))
    })

    // Someone else saves first, bumping the draft version.
    await repositories.cms.saveDraft(
      'page',
      KEY,
      { ...loaded.draft, title: 'Theirs' },
      loaded.draftVersion,
    )

    await act(async () => {
      await expect(result.current.save.mutateAsync()).rejects.toMatchObject({ code: 'conflict' })
    })

    await waitFor(() => expect(result.current.conflict).toBe(true))
    expect(result.current.isDirty).toBe(true)
    expect(result.current.draft?.title).toBe('Mine')

    await act(async () => {
      await result.current.reload()
    })

    await waitFor(() => expect(result.current.conflict).toBe(false))
    expect(result.current.isDirty).toBe(false)
    expect(result.current.draft?.title).toBe('Theirs')
    expect(result.current.document?.draftVersion).toBe(loaded.draftVersion + 1)
  })

  it('discard drops local edits without a request', async () => {
    const { result } = renderDraft()
    await waitFor(() => expect(result.current.document).not.toBeNull())
    const serverTitle = result.current.document?.draft.title

    act(() => {
      result.current.setDraft((current) => ({ ...current, title: 'Scratch' }))
    })
    expect(result.current.isDirty).toBe(true)

    act(() => {
      result.current.discard()
    })
    expect(result.current.isDirty).toBe(false)
    expect(result.current.draft?.title).toBe(serverTitle)
  })
})
