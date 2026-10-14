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

import DiscountsPage from './DiscountsPage'

function renderPage() {
  return renderWithProviders(<DiscountsPage />, {
    route: '/admin/discounts',
    initialEntries: ['/admin/discounts'],
  })
}

describe('DiscountsPage', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('lists the seeded codes and creates a new one through the dialog', async () => {
    const { user } = renderPage()
    expect((await screen.findAllByText('WELCOME10')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('LAUNCH20').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Expired').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'New discount' }))
    const dialog = await screen.findByRole('dialog', { name: 'New discount' })
    await user.type(within(dialog).getByLabelText('Code'), 'test15')
    await user.type(within(dialog).getByLabelText('Percent (%)'), '15')
    await user.click(within(dialog).getByRole('button', { name: 'Create discount' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
      timeout: 5000,
    })
    expect((await screen.findAllByText('TEST15', {}, { timeout: 5000 })).length).toBeGreaterThan(0)
    const codes = await repositories.discounts.list()
    expect(codes.find((c) => c.code === 'TEST15')).toMatchObject({ type: 'percent', value: 15 })
  })

  it('deletes a code after confirmation', async () => {
    const { user } = renderPage()
    await screen.findAllByText('FREESHIP')
    await user.click(screen.getAllByRole('button', { name: 'Delete FREESHIP' })[0] as HTMLElement)
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete FREESHIP?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByText('FREESHIP')).not.toBeInTheDocument(), {
      timeout: 5000,
    })
  })

  it('shows a 403 to staff', async () => {
    await resetMockSession()
    await repositories.auth.signIn({ email: 'staff@demo.local', password: 'password' })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/403/)
    expect(screen.queryByText('WELCOME10')).not.toBeInTheDocument()
  })
})
