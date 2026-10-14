import { describe, expect, it, vi } from 'vitest'

import { fireEvent, renderWithProviders, screen, waitFor } from '@/tests/render'

import { HOME_PAGE_DEFAULT } from '../../domain/defaults'
import { createSection, type Section } from '../../domain/sections'
import { SectionForm } from './SectionForm'

const hero = HOME_PAGE_DEFAULT.sections.find((s) => s.type === 'hero')
if (!hero || hero.type !== 'hero') throw new Error('fixture needs a hero section')

describe('SectionForm', () => {
  it('pushes edits into the draft as you type, keeping the rest of the section intact', async () => {
    const onChange = vi.fn<(next: Section) => void>()
    const { user } = renderWithProviders(<SectionForm section={hero} onChange={onChange} />)

    const headline = screen.getAllByLabelText('Headline')[0] as HTMLElement
    expect(headline).toHaveValue(hero.title)
    await user.clear(headline)
    await user.type(headline, 'Fresh headline')

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last).toMatchObject({ id: hero.id, type: 'hero', title: 'Fresh headline' })
    expect(last && last.type === 'hero' ? last.primaryCta : null).toEqual(hero.primaryCta)
  })

  it('shows an inline error for an unsafe link without blocking other edits', async () => {
    const onChange = vi.fn<(next: Section) => void>()
    const { user } = renderWithProviders(<SectionForm section={hero} onChange={onChange} />)

    const linkInputs = screen.getAllByLabelText('Link')
    const primaryLink = linkInputs[0]
    if (!primaryLink) throw new Error('primary CTA link input missing')
    await user.clear(primaryLink)
    await user.type(primaryLink, 'javascript:alert(1)')

    await waitFor(() => expect(primaryLink).toHaveAttribute('aria-invalid', 'true'))
    // FormMessage is wired to the input through aria-describedby.
    expect(primaryLink).toHaveAccessibleDescription(/.+/)
    // Invalid values still flow to the draft (debounced) so the list can flag the section.
    await waitFor(() => expect(onChange).toHaveBeenCalled())
  })
})

describe('useSectionForm flush on unmount', () => {
  it('pushes the last keystrokes when the form unmounts before the debounce fires', async () => {
    const onChange = vi.fn()
    const section = createSection('hero')
    const view = renderWithProviders(<SectionForm section={section} onChange={onChange} />)
    const headline = await view.findByLabelText('Headline')
    fireEvent.change(headline, { target: { value: 'Flushed on close' } })
    view.unmount()
    expect(onChange).toHaveBeenCalled()
    const last = onChange.mock.calls.at(-1)?.[0] as { title?: string } | undefined
    expect(last?.title).toBe('Flushed on close')
  })
})

describe('HeroForm slideshow', () => {
  it('adds a slide and propagates its headline into the draft', async () => {
    const onChange = vi.fn<(next: Section) => void>()
    const section = createSection('hero')
    const { user } = renderWithProviders(<SectionForm section={section} onChange={onChange} />)

    expect(
      screen.getByText('The main image above is always slide 1.', { exact: false }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Add slide' }))
    // Displayed as "Slide 2" via CSS capitalize; the main image is slide 1.
    expect(screen.getByText(/^slide 2$/i)).toBeInTheDocument()

    const headlines = screen.getAllByLabelText('Headline')
    const slideHeadline = headlines[1]
    if (!slideHeadline) throw new Error('slide headline input missing')
    await user.type(slideHeadline, 'Second look')

    await waitFor(() => {
      const last = onChange.mock.calls.at(-1)?.[0]
      expect(last && last.type === 'hero' ? last.slides[0]?.title : null).toBe('Second look')
    })
    const last = onChange.mock.calls.at(-1)?.[0]
    expect(last && last.type === 'hero' ? last.autoplaySeconds : null).toBe(6)
  })

  it('disables the add button at five slides', async () => {
    const section = createSection('hero')
    const { user } = renderWithProviders(<SectionForm section={section} onChange={() => {}} />)
    const add = screen.getByRole('button', { name: 'Add slide' })
    for (let i = 0; i < 5; i += 1) await user.click(add)
    expect(add).toBeDisabled()
    expect(screen.getByText('Maximum of 5 extra slides.')).toBeInTheDocument()
  })
})

describe('ImageMarqueeForm', () => {
  it('renders two image rows by default and adds a third', async () => {
    const onChange = vi.fn<(next: Section) => void>()
    const section = createSection('image_marquee')
    const { user } = renderWithProviders(<SectionForm section={section} onChange={onChange} />)

    expect(screen.getAllByLabelText('Alt text')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Add image' }))
    expect(screen.getAllByLabelText('Alt text')).toHaveLength(3)
    expect(screen.getByLabelText('Speed')).toHaveValue(40)
    expect(screen.getByText('Seconds per loop; lower is faster.')).toBeInTheDocument()

    await waitFor(() => {
      const last = onChange.mock.calls.at(-1)?.[0]
      expect(last && last.type === 'image_marquee' ? last.images.length : null).toBe(3)
    })
  })

  it('shows a validation message when fewer than two images remain', async () => {
    const section = createSection('image_marquee')
    const { user } = renderWithProviders(<SectionForm section={section} onChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: 'Remove image 2' }))
    expect(screen.getAllByLabelText('Alt text')).toHaveLength(1)
    expect(await screen.findByRole('alert')).toHaveTextContent(/at least 2/i)
    // The last image cannot be removed; the rule is explained instead.
    expect(screen.getByRole('button', { name: 'Remove image 1' })).toBeDisabled()
  })
})
