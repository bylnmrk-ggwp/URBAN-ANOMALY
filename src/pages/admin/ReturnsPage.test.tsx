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

import ReturnsPage from './ReturnsPage'

describe('ReturnsPage', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('lists seeded requests, opens the details sheet and approves a request', async () => {
    const { user } = renderWithProviders(<ReturnsPage />, { initialEntries: ['/admin/returns'] })
    expect(await screen.findByRole('heading', { level: 1, name: 'Returns' })).toBeInTheDocument()

    const table = await screen.findByRole('table')
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(4))
    expect(
      within(screen.getByRole('tab', { name: /Requested/ })).getByText('1'),
    ).toBeInTheDocument()

    // The newest request (Maria's, status Requested) is first.
    const [, firstRow] = within(table).getAllByRole('row')
    if (!firstRow) throw new Error('row missing')
    expect(within(firstRow).getByText('Requested')).toBeInTheDocument()
    await user.click(within(firstRow).getByText('Maria Santos'))

    const sheet = await screen.findByRole('dialog', { name: /Return for ORD-/ })
    expect(within(sheet).getByText('Cloud Slide')).toBeInTheDocument()
    expect(within(sheet).getByRole('button', { name: 'Reject' })).toBeInTheDocument()
    await user.click(within(sheet).getByRole('button', { name: 'Approve' }))

    const confirm = await screen.findByRole('alertdialog', { name: 'Approve this return?' })
    await user.type(within(confirm).getByLabelText(/Note to customer/), 'Prepaid label sent.')
    await user.click(within(confirm).getByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(await within(sheet).findByRole('button', { name: 'Mark received' })).toBeInTheDocument()
    expect(within(sheet).getByText('Prepaid label sent.')).toBeInTheDocument()

    const updated = (await repositories.returns.listAdmin('approved')).find(
      (r) => r.id === 'ret-01',
    )
    expect(updated).toMatchObject({ status: 'approved', adminNote: 'Prepaid label sent.' })
  })

  it('filters by status tab and shows an empty state', async () => {
    const { user } = renderWithProviders(<ReturnsPage />, { initialEntries: ['/admin/returns'] })
    await screen.findByRole('table')
    await user.click(screen.getByRole('tab', { name: 'Item received' }))
    expect(await screen.findByText('Nothing in this status')).toBeInTheDocument()
  })
})
