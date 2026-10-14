import { beforeEach, describe, expect, it } from 'vitest'

import { isAppError } from '@/lib/errors'
import { createMockRepositoriesForTest } from '@/mocks/createMockRepositories'

import { ANNOUNCEMENT_DEFAULT } from '../domain/defaults'
import { GLOBAL_KEYS, pageKey } from '../domain/documents'

const ADMIN = { email: 'admin@demo.local', password: 'password' }
const BUYER = { email: 'buyer@demo.local', password: 'password' }

async function expectAppError(promise: Promise<unknown>, code: string, message?: RegExp) {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).not.toBeNull()
  expect(isAppError(error) && error.code).toBe(code)
  if (message) expect(isAppError(error) && error.message).toMatch(message)
}

describe('MockCmsRepository', () => {
  let ctx: ReturnType<typeof createMockRepositoriesForTest>

  beforeEach(() => {
    window.sessionStorage.clear()
    ctx = createMockRepositoriesForTest()
  })

  it('serves published defaults to anonymous visitors', async () => {
    const doc = await ctx.repositories.cms.getPublished('announcement', GLOBAL_KEYS.announcement)
    expect(doc?.content).toEqual(ANNOUNCEMENT_DEFAULT)
    expect(doc?.publishedVersion).toBe(1)
    expect(await ctx.repositories.cms.listPublishedPageSlugs()).toEqual(['home', 'about'])
  })

  it('rejects admin methods for anonymous and buyer sessions', async () => {
    const { cms, auth } = ctx.repositories
    await expectAppError(cms.listDocuments(), 'unauthorized')
    await auth.signIn(BUYER)
    await expectAppError(cms.listDocuments(), 'forbidden')
    await expectAppError(
      cms.saveDraft('announcement', GLOBAL_KEYS.announcement, ANNOUNCEMENT_DEFAULT, 1),
      'forbidden',
    )
  })

  it('saves a draft without touching the published copy, then publishes with a revision', async () => {
    const { cms, auth } = ctx.repositories
    await auth.signIn(ADMIN)
    const key = GLOBAL_KEYS.announcement

    const saved = await cms.saveDraft(
      'announcement',
      key,
      { ...ANNOUNCEMENT_DEFAULT, text: 'Sale on' },
      1,
    )
    expect(saved.draftVersion).toBe(2)
    expect(saved.publishedVersion).toBe(1)
    expect(saved.hasUnpublishedChanges).toBe(true)
    expect(saved.updatedBy).toBe('Store Admin')
    expect((await cms.getPublished('announcement', key))?.content.text).toBe(
      ANNOUNCEMENT_DEFAULT.text,
    )

    const published = await cms.publish('announcement', key, 'Weekend sale')
    expect(published.publishedVersion).toBe(2)
    expect(published.hasUnpublishedChanges).toBe(false)
    expect(published.published?.text).toBe('Sale on')
    expect((await cms.getPublished('announcement', key))?.content.text).toBe('Sale on')

    const revisions = await cms.listRevisions(key)
    expect(revisions.map((r) => r.version)).toEqual([2, 1])
    expect(revisions[0]).toMatchObject({ note: 'Weekend sale', createdBy: 'Store Admin' })

    const audit = await cms.listAudit(10)
    expect(audit.map((a) => a.action)).toEqual(['publish', 'save_draft'])
  })

  it('restores a revision into the draft and bumps the draft version', async () => {
    const { cms, auth } = ctx.repositories
    await auth.signIn(ADMIN)
    const key = GLOBAL_KEYS.announcement
    await cms.saveDraft('announcement', key, { ...ANNOUNCEMENT_DEFAULT, text: 'Changed' }, 1)
    await cms.publish('announcement', key, '')

    const restored = await cms.restoreRevision('announcement', key, 1)
    expect(restored.draft.text).toBe(ANNOUNCEMENT_DEFAULT.text)
    expect(restored.draftVersion).toBe(3)
    expect(restored.publishedVersion).toBe(2)
    expect(restored.hasUnpublishedChanges).toBe(true)
    expect(await cms.getRevisionContent('announcement', key, 2)).toMatchObject({ text: 'Changed' })
  })

  it('rejects a save with a stale version', async () => {
    const { cms, auth } = ctx.repositories
    await auth.signIn(ADMIN)
    const key = GLOBAL_KEYS.announcement
    await cms.saveDraft('announcement', key, { ...ANNOUNCEMENT_DEFAULT, text: 'A' }, 1)
    await expectAppError(
      cms.saveDraft('announcement', key, { ...ANNOUNCEMENT_DEFAULT, text: 'B' }, 1),
      'conflict',
      /Reload/,
    )
    const doc = await cms.getDocument('announcement', key)
    expect(doc?.draft.text).toBe('A')
  })

  it('validates content against the document schema on save', async () => {
    const { cms, auth } = ctx.repositories
    await auth.signIn(ADMIN)
    const bad = { ...ANNOUNCEMENT_DEFAULT, href: 'javascript:alert(1)' }
    await expectAppError(
      cms.saveDraft('announcement', GLOBAL_KEYS.announcement, bad, 1),
      'validation',
    )
  })

  it('schedules a publish only for dirty drafts and future times, and cancels it', async () => {
    const { cms, auth } = ctx.repositories
    await auth.signIn(ADMIN)
    const key = GLOBAL_KEYS.announcement
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()

    await expectAppError(
      cms.schedulePublish('announcement', key, future),
      'validation',
      /unpublished/,
    )

    await cms.saveDraft('announcement', key, { ...ANNOUNCEMENT_DEFAULT, text: 'Soon' }, 1)
    await expectAppError(
      cms.schedulePublish('announcement', key, new Date(Date.now() - 1000).toISOString()),
      'validation',
      /future/,
    )
    await expectAppError(cms.schedulePublish('announcement', key, 'not-a-date'), 'validation')

    const scheduled = await cms.schedulePublish('announcement', key, future)
    expect(scheduled.scheduledAt).toBe(future)
    expect(scheduled.publishedVersion).toBe(1)
    const summary = (await cms.listDocuments()).find((d) => d.key === key)
    expect(summary?.scheduledAt).toBe(future)

    const cancelled = await cms.cancelSchedule('announcement', key)
    expect(cancelled.scheduledAt).toBeNull()
    expect((await cms.getDocument('announcement', key))?.scheduledAt).toBeNull()
  })

  it('publishes a due schedule lazily on the next read, as the system actor', async () => {
    const { cms, auth } = ctx.repositories
    await auth.signIn(ADMIN)
    const key = GLOBAL_KEYS.announcement
    await cms.saveDraft('announcement', key, { ...ANNOUNCEMENT_DEFAULT, text: 'Timed' }, 1)
    await cms.schedulePublish('announcement', key, new Date(Date.now() + 5 * 60_000).toISOString())

    // Simulate the clock passing the scheduled time, then let an anonymous read trigger it.
    const row = ctx.store.cmsDocuments.get(key)
    if (!row) throw new Error('row missing')
    row.scheduledAt = new Date(Date.now() - 1000).toISOString()
    await auth.signOut()

    const published = await cms.getPublished('announcement', key)
    expect(published?.content.text).toBe('Timed')
    expect(published?.publishedVersion).toBe(2)

    await auth.signIn(ADMIN)
    const doc = await cms.getDocument('announcement', key)
    expect(doc?.scheduledAt).toBeNull()
    expect(doc?.hasUnpublishedChanges).toBe(false)
    const revisions = await cms.listRevisions(key)
    expect(revisions[0]).toMatchObject({
      version: 2,
      note: 'Scheduled publish',
      createdBy: 'system',
    })
    const audit = await cms.listAudit(5)
    expect(audit[0]).toMatchObject({ action: 'publish', actor: 'system' })
  })

  it('creates custom pages and refuses reserved, built-in and duplicate slugs', async () => {
    const { cms, auth } = ctx.repositories
    await auth.signIn(ADMIN)

    await expectAppError(cms.createPage('shop', 'Shop'), 'conflict')
    await expectAppError(cms.createPage('about', 'About'), 'conflict')
    await expectAppError(cms.createPage('Bad Slug', 'x'), 'validation')

    const created = await cms.createPage('lookbook', 'Lookbook')
    expect(created.key).toBe(pageKey('lookbook'))
    expect(created.published).toBeNull()
    expect(created.draft.sections).toHaveLength(1)
    expect(created.draft.sections[0]?.type).toBe('rich_text')
    expect(await cms.getPublished('page', pageKey('lookbook'))).toBeNull()

    await expectAppError(cms.createPage('lookbook', 'Again'), 'conflict')

    await cms.publish('page', pageKey('lookbook'), '')
    expect(await cms.listPublishedPageSlugs()).toContain('lookbook')

    await expectAppError(cms.deletePage('home'), 'forbidden')
    await cms.deletePage('lookbook')
    expect(await cms.getPublished('page', pageKey('lookbook'))).toBeNull()
  })
})
