import { describe, expect, it } from 'vitest'

import { renderWithProviders, screen } from '@/tests/render'

import { ABOUT_PAGE_DEFAULT } from '../domain/defaults'
import type { PageContent, Section } from '../domain/sections'
import { createSection } from '../domain/sections'
import { PageRenderer } from './PageRenderer'

function page(sections: Section[], overrides: Partial<PageContent> = {}): PageContent {
  return {
    title: 'Test',
    seoTitle: 'Test title',
    seoDescription: 'Test description',
    sections,
    ...overrides,
  }
}

describe('PageRenderer', () => {
  it('skips sections marked hidden', () => {
    const visible = { ...createSection('newsletter'), title: 'Visible band' }
    const hidden = { ...createSection('newsletter'), title: 'Hidden band', visible: false }
    renderWithProviders(<PageRenderer content={page([visible, hidden])} editable={false} />)

    expect(screen.getByRole('heading', { name: 'Visible band' })).toBeInTheDocument()
    expect(screen.queryByText('Hidden band')).not.toBeInTheDocument()
  })

  it('renders the About anchors so existing #links keep working', () => {
    const { container } = renderWithProviders(
      <PageRenderer content={ABOUT_PAGE_DEFAULT} editable={false} />,
    )
    for (const id of ['shipping', 'returns', 'size-guide', 'contact']) {
      const el = container.querySelector(`#${id}`)
      expect(el, id).not.toBeNull()
      expect(el).toHaveClass('scroll-mt-24')
    }
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Clogs moulded in Marikina, worn all over Manila.',
    )
  })

  it('renders external CTAs as new-tab anchors and internal ones as router links', () => {
    const hero = createSection('hero')
    if (hero.type !== 'hero') throw new Error('unreachable')
    const content = page([
      {
        ...hero,
        primaryCta: { label: 'Visit partner', href: 'https://example.com/partner' },
        secondaryCta: { label: 'Browse shop', href: '/shop?sort=newest' },
      },
    ])
    renderWithProviders(<PageRenderer content={content} editable={false} />)

    const external = screen.getByRole('link', { name: 'Visit partner' })
    expect(external).toHaveAttribute('href', 'https://example.com/partner')
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noopener noreferrer')

    const internal = screen.getByRole('link', { name: 'Browse shop' })
    expect(internal).toHaveAttribute('href', '/shop?sort=newest')
    expect(internal).not.toHaveAttribute('target')
  })

  it('omits CTAs that have no label or href', () => {
    const hero = createSection('hero')
    renderWithProviders(<PageRenderer content={page([hero])} editable={false} />)
    expect(screen.getByRole('link', { name: 'Shop Collection' })).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('sets the document title and meta description', () => {
    renderWithProviders(<PageRenderer content={page([])} editable={false} />)
    expect(document.title).toBe('Test title')
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Test description',
    )
  })

  it('wraps sections with selection handles in editable mode', () => {
    const band = createSection('newsletter')
    const { container } = renderWithProviders(<PageRenderer content={page([band])} editable />)
    expect(container.querySelector(`[data-cms-section="${band.id}"]`)).not.toBeNull()
    expect(screen.getByText('Newsletter')).toBeInTheDocument()
  })
})
