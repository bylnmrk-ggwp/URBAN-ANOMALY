import { describe, expect, it } from 'vitest'

import { renderWithProviders, screen, within } from '@/tests/render'

import { createSection, type SectionOf } from '../../domain/sections'
import { HeroSection } from './HeroSection'

function hero(overrides: Partial<SectionOf<'hero'>> = {}): SectionOf<'hero'> {
  const section = createSection('hero')
  if (section.type !== 'hero') throw new Error('unreachable')
  return {
    ...section,
    title: 'Everyday pieces',
    subtitle: 'Cut for the heat.',
    image: { mediaId: null, url: 'https://images.test/hero-1.jpg', alt: 'Rack of clogs' },
    ...overrides,
  }
}

const extraSlide = {
  image: { mediaId: null, url: 'https://images.test/hero-2.jpg', alt: '' },
  eyebrow: 'Second',
  title: 'Slides season',
  subtitle: '',
  cta: { label: 'Shop slides', href: '/collections/slides' },
}

describe('HeroSection (single image)', () => {
  it('renders the headline as an h1 with its CTA and no slideshow controls', () => {
    renderWithProviders(<HeroSection section={hero()} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Everyday pieces' })).toHaveClass(
      'heading-display',
    )
    expect(screen.getByRole('link', { name: 'Shop Collection' })).toHaveAttribute('href', '/shop')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next slide' })).not.toBeInTheDocument()
  })
})

describe('HeroSection (slideshow)', () => {
  it('renders one dot per slide and marks the first as selected', () => {
    renderWithProviders(<HeroSection section={hero({ slides: [extraSlide] })} />)

    const tablist = screen.getByRole('tablist', { name: 'Slides' })
    const dots = within(tablist).getAllByRole('tab')
    expect(dots).toHaveLength(2)
    expect(dots[0]).toHaveAttribute('aria-selected', 'true')
    expect(dots[0]).toHaveAccessibleName('Slide 1')
    expect(dots[1]).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Everyday pieces')
  })

  it('switches the copy when a dot or the Next arrow is pressed', async () => {
    const { user } = renderWithProviders(
      <HeroSection section={hero({ slides: [extraSlide], autoplaySeconds: 0 })} />,
    )

    await user.click(screen.getByRole('tab', { name: 'Slide 2' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Slides season')
    expect(screen.getByRole('link', { name: 'Shop slides' })).toHaveAttribute(
      'href',
      '/collections/slides',
    )
    expect(screen.getByRole('tab', { name: 'Slide 2' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Everyday pieces')
  })

  it('announces itself as a carousel and stays quiet to screen readers while autoplaying', () => {
    const { container } = renderWithProviders(
      <HeroSection section={hero({ slides: [extraSlide], autoplaySeconds: 5 })} />,
    )
    const section = container.querySelector('section')
    expect(section).toHaveAttribute('aria-roledescription', 'carousel')
    expect(section).toHaveAttribute('aria-live', 'off')
  })
})
