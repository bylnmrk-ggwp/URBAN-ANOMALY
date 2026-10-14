import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { repositories } from '@/config/repositories'
import { DEFAULT_MEDIA } from '@/features/cms/domain/defaults'
import {
  renderWithProviders,
  resetMockSession,
  screen,
  signInAs,
  waitFor,
  within,
} from '@/tests/render'

import MediaPage from './MediaPage'

function renderPage() {
  return renderWithProviders(<MediaPage />, {
    route: '/admin/media',
    initialEntries: ['/admin/media'],
  })
}

describe('MediaPage (admin)', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
    vi.restoreAllMocks()
  })

  it('lists the seeded media assets', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Media' })).toBeInTheDocument()

    const grid = await screen.findByRole('list', { name: 'Media library' })
    expect(within(grid).getAllByRole('listitem')).toHaveLength(DEFAULT_MEDIA.length)
    for (const asset of DEFAULT_MEDIA) {
      expect(within(grid).getByRole('button', { name: `Open ${asset.alt}` })).toBeInTheDocument()
    }
  })

  it('disables delete and lists usages for an asset referenced by a document', async () => {
    const { user } = renderPage()
    const hero = DEFAULT_MEDIA[0]
    if (!hero) throw new Error('seed media missing')

    await user.click(await screen.findByRole('button', { name: `Open ${hero.alt}` }))
    const sheet = await screen.findByRole('dialog')
    expect(await within(sheet).findByRole('link', { name: 'Page: home' })).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Delete image' })).toBeDisabled()
    expect(within(sheet).getByText(/Remove this image from the documents above/)).toBeVisible()
  })

  it('shows the conflict error when the repository refuses to delete a used asset', async () => {
    // Usages arrive empty (e.g. a stale read) so the button is enabled; the repository still
    // refuses because the home page references the asset.
    vi.spyOn(repositories.media, 'usages').mockResolvedValue([])
    const { user } = renderPage()
    const hero = DEFAULT_MEDIA[0]
    if (!hero) throw new Error('seed media missing')

    await user.click(await screen.findByRole('button', { name: `Open ${hero.alt}` }))
    const sheet = await screen.findByRole('dialog')
    const del = within(sheet).getByRole('button', { name: 'Delete image' })
    await waitFor(() => expect(del).toBeEnabled())
    await user.click(del)

    const confirm = await screen.findByRole('alertdialog')
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(await within(sheet).findByRole('alert')).toHaveTextContent(
      /used by one or more documents/i,
    )
    // Nothing was removed.
    expect(await repositories.media.list({})).toHaveLength(DEFAULT_MEDIA.length)
  })

  it('filters the grid by search', async () => {
    const { user } = renderPage()
    await screen.findByRole('list', { name: 'Media library' })

    await user.type(screen.getByLabelText('Search images'), 'workshop')
    // Debounced search swaps the grid for a skeleton while the new query loads.
    await waitFor(
      () =>
        expect(
          within(screen.getByRole('list', { name: 'Media library' })).getAllByRole('listitem'),
        ).toHaveLength(1),
      { timeout: 4000 },
    )

    await user.clear(screen.getByLabelText('Search images'))
    await user.type(screen.getByLabelText('Search images'), 'zzz-no-match')
    expect(await screen.findByText('No matching images')).toBeInTheDocument()
  })
})
