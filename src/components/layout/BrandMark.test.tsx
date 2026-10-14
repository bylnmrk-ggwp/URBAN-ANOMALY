import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import { THEME_DEFAULT } from '@/features/cms/domain/defaults'
import { GLOBAL_KEYS } from '@/features/cms/domain/documents'
import { seasonColors } from '@/features/cms/domain/theme'
import { renderWithProviders, resetMockSession, screen, signInAs, waitFor } from '@/tests/render'

import { BrandMark, BrandWordmark } from './BrandMark'
import { SEASON_ARTWORK } from './brandArtwork'

/** Publishing is admin-only; the storefront then reads the published copy. */
async function publishSeason(season: 'camo' | 'christmas') {
  await signInAs('admin')
  const doc = await repositories.cms.getDocument('theme', GLOBAL_KEYS.theme)
  await repositories.cms.saveDraft(
    'theme',
    GLOBAL_KEYS.theme,
    { ...THEME_DEFAULT, season, colors: seasonColors(season) },
    doc?.draftVersion ?? 1,
  )
  await repositories.cms.publish('theme', GLOBAL_KEYS.theme, `${season} test`)
}

describe('BrandMark artwork', () => {
  beforeEach(async () => {
    await resetMockSession()
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('renders the default season artwork before the theme loads', () => {
    renderWithProviders(<BrandWordmark alt="URBAN ANOMALY" />)
    expect(screen.getByAltText('URBAN ANOMALY')).toHaveAttribute(
      'src',
      SEASON_ARTWORK.default.wordmark.src,
    )
  })

  it('follows the published season', async () => {
    await publishSeason('christmas')
    renderWithProviders(<BrandWordmark alt="URBAN ANOMALY" />)
    // The default artwork renders synchronously, then the published season swaps it in.
    await waitFor(() =>
      expect(screen.getByAltText('URBAN ANOMALY')).toHaveAttribute(
        'src',
        SEASON_ARTWORK.christmas.wordmark.src,
      ),
    )
    const img = screen.getByAltText('URBAN ANOMALY')
    // Seasonal artwork is already bright; only the olive ink needs lifting on dark surfaces.
    expect(img.className).not.toContain('brightness')
  })

  it('takes a season prop so the admin can preview one unpublished', () => {
    renderWithProviders(<BrandWordmark alt="URBAN ANOMALY" season="camo" />)
    expect(screen.getByAltText('URBAN ANOMALY')).toHaveAttribute(
      'src',
      SEASON_ARTWORK.camo.wordmark.src,
    )
  })

  it('sizes the compact slot and the mark from the season table', () => {
    const { unmount } = renderWithProviders(
      <BrandWordmark alt="URBAN ANOMALY" season="camo" compact />,
    )
    expect(screen.getByAltText('URBAN ANOMALY').className).toContain(
      SEASON_ARTWORK.camo.wordmarkCompactClass,
    )
    unmount()

    renderWithProviders(<BrandMark season="camo" />)
    const mark = document.querySelector(`img[src="${SEASON_ARTWORK.camo.mark.src}"]`)
    expect(mark).not.toBeNull()
    expect(mark?.getAttribute('aria-hidden')).toBe('true')
    expect(mark?.className).toContain(SEASON_ARTWORK.camo.markClass)
  })
})
