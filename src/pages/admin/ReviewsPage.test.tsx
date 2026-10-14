import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import {
  renderWithProviders,
  resetMockSession,
  screen,
  signInAs,
  waitFor,
  within,
} from '@/tests/render'

import ReviewsPage from './ReviewsPage'

describe('ReviewsPage', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('approves a pending review and moves it to the Approved tab', async () => {
    const { user } = renderWithProviders(<ReviewsPage />, { initialEntries: ['/admin/reviews'] })
    expect(await screen.findByRole('heading', { level: 1, name: 'Reviews' })).toBeInTheDocument()

    const pendingTab = screen.getByRole('tab', { name: /Pending/ })
    expect(await within(pendingTab).findByText('3')).toBeInTheDocument()
    await user.click(pendingTab)

    const table = await screen.findByRole('table')
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(4))
    const row = within(table)
      .getAllByRole('row')
      .find((r) => within(r).queryByText('Nice but marks easily'))
    if (!row) throw new Error('pending review row not found')
    await user.click(within(row).getByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(3))
    expect(within(pendingTab).getByText('2')).toBeInTheDocument()
    expect(within(table).queryByText('Nice but marks easily')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Approved' }))
    expect(
      await within(screen.getByRole('table')).findByText('Nice but marks easily'),
    ).toBeInTheDocument()
    const review = (await repositories.reviews.listAdmin({ status: 'approved' })).find(
      (r) => r.id === 'rev-07',
    )
    expect(review?.status).toBe('approved')
  })

  it('deletes a review after confirmation', async () => {
    const { user } = renderWithProviders(<ReviewsPage />, { initialEntries: ['/admin/reviews'] })
    await user.click(await screen.findByRole('tab', { name: 'Rejected' }))
    const table = await screen.findByRole('table')
    await waitFor(() => expect(within(table).getByText('Terrible')).toBeInTheDocument())

    await user.click(within(table).getByRole('button', { name: 'Delete review "Terrible"' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete this review?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete review' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(await screen.findByText('No reviews here')).toBeInTheDocument()
    expect(
      (await repositories.reviews.listAdmin({ status: 'all' })).some((r) => r.id === 'rev-09'),
    ).toBe(false)
  })
})
