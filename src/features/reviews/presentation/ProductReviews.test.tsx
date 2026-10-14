import { beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import { makeProduct } from '@/tests/fixtures'
import {
  renderWithProviders,
  resetMockSession,
  screen,
  signInAs,
  waitFor,
  within,
} from '@/tests/render'

import { ProductReviews } from './ProductReviews'

describe('ProductReviews', () => {
  beforeEach(async () => {
    await resetMockSession()
  })

  it('shows the summary, approved reviews and a login link when signed out', async () => {
    renderWithProviders(<ProductReviews product={makeProduct()} />, {
      initialEntries: ['/products/lava-premium-clog'],
    })
    expect(await screen.findByRole('heading', { level: 2, name: 'Reviews' })).toBeInTheDocument()
    expect(
      await screen.findByText('Finally a clog that survives the rainy season'),
    ).toBeInTheDocument()
    expect(screen.getByText('Based on 3 reviews')).toBeInTheDocument()
    expect(screen.getByText('Verified purchase')).toBeInTheDocument()
    // Pending/rejected reviews from other products never leak in.
    expect(screen.queryByText('Nice but pills a little')).not.toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'Sign in to write a review' })
    expect(link).toHaveAttribute('href', '/login')
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument()
  })

  it('shows the empty state for a product without reviews', async () => {
    renderWithProviders(<ProductReviews product={makeProduct({}, 'prod-16')} />)
    expect(await screen.findByText('No reviews yet. Be the first.')).toBeInTheDocument()
  })

  it('lets a signed-in buyer submit a review that lands in the pending queue', async () => {
    await signInAs('buyer')
    const product = makeProduct({}, 'prod-02')
    const { user } = renderWithProviders(<ProductReviews product={product} />)

    await user.click(await screen.findByRole('button', { name: 'Write a review' }))
    const dialog = await screen.findByRole('dialog', { name: 'Write a review' })

    // Validation first: nothing filled in.
    await user.click(within(dialog).getByRole('button', { name: 'Submit review' }))
    expect(await within(dialog).findByText('Choose a star rating.')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('radio', { name: '4 stars' }))
    await user.type(within(dialog).getByLabelText('Title'), 'Nice weight for the price')
    await user.type(
      within(dialog).getByLabelText('Review'),
      'Softer than I expected and the stone colour goes with everything.',
    )
    await user.click(within(dialog).getByRole('button', { name: 'Submit review' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const pending = await repositories.reviews.listAdmin({
      status: 'pending',
      search: 'Nice weight',
    })
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({
      productId: 'prod-02',
      rating: 4,
      userId: 'user-buyer-1',
      isVerifiedPurchase: false,
      status: 'pending',
    })
    // Not approved yet, so the storefront list is unchanged.
    expect(screen.queryByText('Nice weight for the price')).not.toBeInTheDocument()
  })
})
