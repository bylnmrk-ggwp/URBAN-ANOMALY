import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithProviders, resetMockSession, screen, signInAs } from '@/tests/render'

import { AppRouter } from './index'

const LAZY_TIMEOUT = { timeout: 10_000 }

describe('AdminRoute', () => {
  beforeEach(async () => {
    window.scrollTo = vi.fn()
    await resetMockSession()
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('shows a 403 message to a signed-in buyer', async () => {
    await signInAs('buyer')
    renderWithProviders(<AppRouter />, { initialEntries: ['/admin/dashboard'] })

    const alert = await screen.findByRole('alert', {}, LAZY_TIMEOUT)
    expect(alert).toHaveTextContent("403 – You don't have access to the admin area")
    expect(alert).toHaveTextContent('This section is reserved for store staff.')
    expect(screen.getByRole('link', { name: 'Back to store' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('button', { name: 'Open admin menu' })).not.toBeInTheDocument()
  })

  it('redirects an unauthenticated visitor to the login page', async () => {
    renderWithProviders(<AppRouter />, { initialEntries: ['/admin/dashboard'] })

    expect(
      await screen.findByRole('heading', { name: 'Welcome back' }, LAZY_TIMEOUT),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.queryByText(/403/)).not.toBeInTheDocument()
  })

  it('renders the admin shell for an admin', async () => {
    await signInAs('admin')
    renderWithProviders(<AppRouter />, { initialEntries: ['/admin/dashboard'] })

    expect(
      await screen.findByRole('button', { name: 'Open admin menu' }, LAZY_TIMEOUT),
    ).toBeInTheDocument()
    expect(screen.queryByText(/403/)).not.toBeInTheDocument()
  })
})
