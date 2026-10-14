import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import { renderWithProviders, resetMockSession, screen, signInAs } from '@/tests/render'

import { AdminSidebar } from './AdminSidebar'

describe('AdminSidebar permissions', () => {
  beforeEach(async () => {
    await resetMockSession()
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('shows owner-only items to the owner', async () => {
    await signInAs('admin')
    renderWithProviders(<AdminSidebar collapsed={false} />)
    expect(await screen.findByRole('link', { name: 'Settings' })).toBeInTheDocument()
    for (const label of ['Theme', 'Discounts', 'Team', 'Orders', 'Products']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('hides Settings, Theme, Discounts and Team from staff', async () => {
    await repositories.auth.signIn({ email: 'staff@demo.local', password: 'password' })
    renderWithProviders(<AdminSidebar collapsed={false} />)
    expect(await screen.findByRole('link', { name: 'Orders' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Products' })).toBeInTheDocument()
    for (const label of ['Settings', 'Theme', 'Discounts', 'Team']) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
    }
  })
})
