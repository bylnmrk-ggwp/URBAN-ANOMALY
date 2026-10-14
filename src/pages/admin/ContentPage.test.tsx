import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import { pageKey } from '@/features/cms/domain/documents'
import {
  renderWithProviders,
  resetMockSession,
  screen,
  signInAs,
  waitFor,
  within,
} from '@/tests/render'

import ContentPage from './ContentPage'

describe('ContentPage (admin)', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('lists the seeded pages with their status and the global documents', async () => {
    renderWithProviders(<ContentPage />, { initialEntries: ['/admin/content'] })
    expect(await screen.findByRole('heading', { level: 1, name: 'Content' })).toBeInTheDocument()

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Home')).toBeInTheDocument()
    expect(within(table).getByText('About')).toBeInTheDocument()
    expect(within(table).getByText('/about')).toBeInTheDocument()
    expect(
      within(table).getAllByText(/Published|Draft changes|Never published/).length,
    ).toBeGreaterThan(0)

    const globals = screen.getByRole('list', { name: 'Global content' })
    expect(within(globals).getByRole('link', { name: /Navigation/ })).toHaveAttribute(
      'href',
      '/admin/navigation',
    )
    expect(within(globals).getByRole('link', { name: /Theme/ })).toBeInTheDocument()
    expect(within(globals).getByRole('link', { name: /Announcement bar/ })).toBeInTheDocument()
  })

  it('shows the scheduled badge for a page with a pending scheduled publish', async () => {
    const key = pageKey('about')
    const doc = await repositories.cms.getDocument('page', key)
    if (!doc) throw new Error('about page missing')
    await repositories.cms.saveDraft(
      'page',
      key,
      { ...doc.draft, title: 'About (scheduled)' },
      doc.draftVersion,
    )
    const at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    await repositories.cms.schedulePublish('page', key, at)
    try {
      renderWithProviders(<ContentPage />, { initialEntries: ['/admin/content'] })
      const table = await screen.findByRole('table')
      expect(await within(table).findByText(/^Scheduled · /)).toBeInTheDocument()
      expect(within(table).getAllByText(/^Scheduled · /)).toHaveLength(1)
    } finally {
      await repositories.cms.cancelSchedule('page', key)
    }
  })

  it('rejects a reserved slug when creating a page', async () => {
    const { user } = renderWithProviders(<ContentPage />, { initialEntries: ['/admin/content'] })
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'New page' }))
    const dialog = await screen.findByRole('dialog', { name: 'New page' })

    await user.type(within(dialog).getByLabelText('Title'), 'Shop')
    await waitFor(() => expect(within(dialog).getByLabelText('Slug')).toHaveValue('shop'))
    await user.click(within(dialog).getByRole('button', { name: 'Create page' }))

    expect(await within(dialog).findByText(/reserved/i)).toBeInTheDocument()
    // Dialog stays open; nothing was created.
    expect(screen.getByRole('dialog', { name: 'New page' })).toBeInTheDocument()
  })

  it('rejects a slug that already exists', async () => {
    const { user } = renderWithProviders(<ContentPage />, { initialEntries: ['/admin/content'] })
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: 'New page' }))
    const dialog = await screen.findByRole('dialog', { name: 'New page' })
    await user.type(within(dialog).getByLabelText('Title'), 'About')
    await waitFor(() => expect(within(dialog).getByLabelText('Slug')).toHaveValue('about'))
    await user.click(within(dialog).getByRole('button', { name: 'Create page' }))

    expect(await within(dialog).findByText(/already exists/i)).toBeInTheDocument()
  })
})
