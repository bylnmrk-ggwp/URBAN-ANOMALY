import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import { renderWithProviders, resetMockSession, signInAs, waitFor } from '@/tests/render'

import { THEME_DEFAULT } from '../domain/defaults'
import { GLOBAL_KEYS } from '../domain/documents'
import {
  seasonColors,
  seasonCssVariables,
  THEME_CSS_KEYS,
  type ThemeContent,
} from '../domain/theme'
import { ThemeApplier } from './ThemeApplier'

async function publish(content: ThemeContent) {
  await signInAs('admin')
  const doc = await repositories.cms.getDocument('theme', GLOBAL_KEYS.theme)
  await repositories.cms.saveDraft('theme', GLOBAL_KEYS.theme, content, doc?.draftVersion ?? 1)
  await repositories.cms.publish('theme', GLOBAL_KEYS.theme, 'test')
}

function seasonStyle(): HTMLStyleElement | null {
  return document.querySelector('style#cms-season-palette')
}

describe('ThemeApplier', () => {
  beforeEach(async () => {
    await resetMockSession()
  })
  afterEach(async () => {
    await resetMockSession()
    document.documentElement.removeAttribute('style')
  })

  it('writes nothing for the shipped default theme', async () => {
    const { unmount } = renderWithProviders(<ThemeApplier />)
    await waitFor(() => expect(seasonStyle()).toBeNull())
    for (const key of THEME_CSS_KEYS) {
      expect(document.documentElement.style.getPropertyValue(key)).toBe('')
    }
    unmount()
  })

  it('applies a season as a stylesheet with both modes, not as inline styles', async () => {
    await publish({ ...THEME_DEFAULT, season: 'camo', colors: seasonColors('camo') })
    renderWithProviders(<ThemeApplier />)

    await waitFor(() => expect(seasonStyle()).not.toBeNull())
    const css = seasonStyle()?.textContent ?? ''
    expect(css).toContain(`--primary: ${seasonCssVariables('camo', 'light')['--primary']};`)
    expect(css.slice(css.indexOf('.dark {'))).toContain(
      `--primary: ${seasonCssVariables('camo', 'dark')['--primary']};`,
    )
    // Inline styles on <html> would beat the `.dark` rule, so an untouched season writes none.
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('')
  })

  it('still writes a hand-edited colour inline, and only that one', async () => {
    await publish({
      ...THEME_DEFAULT,
      season: 'christmas',
      colors: { ...seasonColors('christmas'), primary: '#112233' },
    })
    renderWithProviders(<ThemeApplier />)

    await waitFor(() =>
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#112233'),
    )
    expect(document.documentElement.style.getPropertyValue('--ring')).toBe('#112233')
    expect(document.documentElement.style.getPropertyValue('--background')).toBe('')
  })
})
