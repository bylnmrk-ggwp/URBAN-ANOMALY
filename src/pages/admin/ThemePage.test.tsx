import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { repositories } from '@/config/repositories'
import { THEME_DEFAULT } from '@/features/cms/domain/defaults'
import { GLOBAL_KEYS } from '@/features/cms/domain/documents'
import { renderWithProviders, resetMockSession, screen, signInAs, waitFor } from '@/tests/render'

import ThemePage from './ThemePage'

function renderPage() {
  return renderWithProviders(<ThemePage />, {
    route: '/admin/theme',
    initialEntries: ['/admin/theme'],
  })
}

describe('ThemePage (admin)', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
    vi.restoreAllMocks()
  })

  it('loads the draft theme into the form and preview', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Theme' })).toBeInTheDocument()

    const preview = await screen.findByTestId('theme-preview')
    expect(preview.style.getPropertyValue('--primary')).toBe(THEME_DEFAULT.colors.primary)
    expect(preview.style.getPropertyValue('--radius')).toBe('0.375rem')
    expect(screen.getByLabelText('Primary')).toHaveValue(THEME_DEFAULT.colors.primary)
  })

  it('changing the primary colour updates the preview CSS variable', async () => {
    const { user } = renderPage()
    const preview = await screen.findByTestId('theme-preview')

    const primary = screen.getByLabelText('Primary')
    await user.clear(primary)
    await user.type(primary, '#ff0000')

    await waitFor(() => expect(preview.style.getPropertyValue('--primary')).toBe('#ff0000'))
    expect(preview.style.getPropertyValue('--ring')).toBe('#ff0000')
    expect(screen.getAllByText('Unsaved changes').length).toBeGreaterThan(0)
  })

  it('saves the draft to the repository', async () => {
    const { user } = renderPage()
    await screen.findByTestId('theme-preview')

    const primary = screen.getByLabelText('Primary')
    await user.clear(primary)
    await user.type(primary, '#00aa00')

    const [save] = await screen.findAllByRole('button', { name: 'Save draft' })
    await waitFor(() => expect(save).toBeEnabled())
    await user.click(save as HTMLElement)

    await waitFor(async () => {
      const doc = await repositories.cms.getDocument('theme', GLOBAL_KEYS.theme)
      expect(doc?.draft.colors.primary).toBe('#00aa00')
    })
    await waitFor(() => expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument())
  })

  it('rejects an invalid hex value and keeps the save button disabled', async () => {
    const { user } = renderPage()
    await screen.findByTestId('theme-preview')

    const primary = screen.getByLabelText('Primary')
    await user.clear(primary)
    await user.type(primary, '#ggg')
    await user.tab()

    expect(await screen.findByText('Use a 6-digit hex colour like #111111.')).toBeInTheDocument()
  })
})
