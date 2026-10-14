import { describe, expect, it } from 'vitest'

import { renderWithProviders, screen, within } from '@/tests/render'

import { createSection, type SectionOf } from '../../domain/sections'
import { SectionRenderer } from '../SectionRenderer'

function faq(): SectionOf<'faq'> {
  const section = createSection('faq')
  if (section.type !== 'faq') throw new Error('unreachable')
  return {
    ...section,
    title: 'Help centre',
    anchor: 'faq',
    items: [
      { id: 'a', question: 'Do you ship to Cebu?', answer: 'Yes, in **3-5 days**.' },
      { id: 'b', question: 'Can I return sale items?', answer: 'Within 14 days.' },
    ],
  }
}

function gallery(count: number, layout: 'grid' | 'columns' = 'grid'): SectionOf<'gallery'> {
  const section = createSection('gallery')
  if (section.type !== 'gallery') throw new Error('unreachable')
  return {
    ...section,
    title: 'Lookbook',
    layout,
    images: Array.from({ length: count }, (_, i) => ({
      mediaId: null,
      url: `https://images.test/look-${i + 1}.jpg`,
      alt: `Look ${i + 1}`,
      caption: `Caption ${i + 1}`,
    })),
  }
}

describe('FaqSection', () => {
  it('renders every question as an accordion trigger and reveals the Markdown answer', async () => {
    const section = faq()
    const { user, container } = renderWithProviders(<SectionRenderer section={section} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Help centre' })).toBeInTheDocument()
    expect(container.querySelector('#faq')).toHaveClass('scroll-mt-24')
    const triggers = screen.getAllByRole('button')
    expect(triggers.map((t) => t.textContent)).toEqual([
      'Do you ship to Cebu?',
      'Can I return sale items?',
    ])
    expect(screen.queryByText('3-5 days')).not.toBeInTheDocument()

    await user.click(triggers[0] as HTMLElement)
    expect(await screen.findByText('3-5 days')).toBeInTheDocument()
    expect(screen.getByText('3-5 days').tagName).toBe('STRONG')
  })
})

describe('GallerySection', () => {
  it('renders one lazy image per entry with captions and opens the lightbox on click', async () => {
    const section = gallery(5)
    const { user } = renderWithProviders(<SectionRenderer section={section} />)

    const tiles = screen.getAllByRole('button', { name: /^Open Caption/ })
    expect(tiles).toHaveLength(5)
    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(5)
    for (const img of images) expect(img).toHaveAttribute('loading', 'lazy')
    expect(screen.getByText('Caption 3')).toBeInTheDocument()

    await user.click(tiles[2] as HTMLElement)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('img', { name: 'Look 3' })).toHaveAttribute(
      'src',
      'https://images.test/look-3.jpg',
    )
    expect(within(dialog).getByText('Image 3 of 5')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Next image' }))
    expect(within(dialog).getByText('Image 4 of 5')).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(within(dialog).getByText('Image 2 of 5')).toBeInTheDocument()
  })

  it('hides captions when disabled and uses the columns layout', () => {
    const section = { ...gallery(3, 'columns'), showCaptions: false }
    const { container } = renderWithProviders(<SectionRenderer section={section} />)
    expect(screen.queryByText('Caption 1')).not.toBeInTheDocument()
    expect(container.querySelector('.columns-2')).not.toBeNull()
    expect(screen.getAllByRole('img')).toHaveLength(3)
  })
})
