import { describe, expect, it } from 'vitest'

import { Marquee } from '@/components/motion/Marquee'
import { render, renderWithProviders, screen } from '@/tests/render'

import { createSection, type SectionOf } from '../../domain/sections'
import { SectionRenderer } from '../SectionRenderer'

function marquee(count: number): SectionOf<'image_marquee'> {
  const section = createSection('image_marquee')
  if (section.type !== 'image_marquee') throw new Error('unreachable')
  return {
    ...section,
    anchor: 'strip',
    speed: 25,
    pauseOnHover: false,
    images: Array.from({ length: count }, (_, i) => ({
      mediaId: null,
      url: `https://images.test/strip-${i + 1}.jpg`,
      alt: i === 0 ? 'First look' : '',
    })),
  }
}

describe('Marquee', () => {
  it('duplicates its children once and hides the copy from assistive technology', () => {
    const { container } = render(
      <Marquee durationSeconds={12} ariaLabel="Looks">
        <span>a</span>
        <span>b</span>
      </Marquee>,
    )
    expect(screen.getByRole('region', { name: 'Looks' })).toBeInTheDocument()
    expect(screen.getAllByText('a')).toHaveLength(2)
    const copies = container.querySelectorAll('.marquee-track > div')
    expect(copies).toHaveLength(2)
    expect(copies[0]).not.toHaveAttribute('aria-hidden')
    expect(copies[1]).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('.marquee-track')).toHaveStyle({ '--marquee-duration': '12s' })
  })
})

describe('ImageMarqueeSection', () => {
  it('renders every image twice (second copy aria-hidden) with the configured speed', () => {
    const section = marquee(4)
    const { container } = renderWithProviders(<SectionRenderer section={section} />)

    expect(container.querySelectorAll('img')).toHaveLength(8)
    const hiddenCopy = container.querySelector('.marquee-track > [aria-hidden="true"]')
    expect(hiddenCopy?.querySelectorAll('img')).toHaveLength(4)
    // Alt text survives on both copies; only the first is exposed to assistive technology.
    expect(screen.getAllByAltText('First look')).toHaveLength(2)
    expect(hiddenCopy?.querySelector('img[alt="First look"]')).not.toBeNull()
    expect(container.querySelector('.marquee-track')).toHaveStyle({ '--marquee-duration': '25s' })
    expect(container.querySelector('.marquee-paused')).not.toBeNull()
    expect(container.querySelector('#strip')).toHaveClass('scroll-mt-24')
  })
})
