import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HOME_PAGE_DEFAULT } from '../../domain/defaults'
import { createSection, type PageContent } from '../../domain/sections'
import { sectionTitle } from './draftOps'
import { SectionList } from './SectionList'

function setup(content: PageContent = HOME_PAGE_DEFAULT) {
  const onChange = vi.fn<(next: PageContent) => void>()
  const onSelect = vi.fn<(id: string | null) => void>()
  const user = userEvent.setup({ delay: null })
  render(
    <SectionList content={content} selectedId={null} onSelect={onSelect} onChange={onChange} />,
  )
  return { onChange, onSelect, user }
}

const first = HOME_PAGE_DEFAULT.sections[0]
const second = HOME_PAGE_DEFAULT.sections[1]
if (!first || !second) throw new Error('fixture needs at least two sections')
const firstTitle = sectionTitle(first)
const secondTitle = sectionTitle(second)

describe('SectionList', () => {
  it('lists every section in order with its type label', () => {
    setup()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(HOME_PAGE_DEFAULT.sections.length)
    expect(items[0]).toHaveTextContent(firstTitle)
    expect(items[0]).toHaveTextContent('Hero')
  })

  it('moves a section down and up with the arrow buttons', async () => {
    const { onChange, user } = setup()

    await user.click(screen.getByRole('button', { name: `Move down: ${firstTitle}` }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const afterDown = onChange.mock.calls[0]?.[0]
    expect(afterDown?.sections.map((s) => s.id).slice(0, 2)).toEqual([second.id, first.id])

    await user.click(screen.getByRole('button', { name: `Move up: ${secondTitle}` }))
    const afterUp = onChange.mock.calls[1]?.[0]
    expect(afterUp?.sections.map((s) => s.id).slice(0, 2)).toEqual([second.id, first.id])

    // Boundaries are disabled rather than wrapping.
    expect(screen.getByRole('button', { name: `Move up: ${firstTitle}` })).toBeDisabled()
  })

  it('toggles visibility from the eye button', async () => {
    const { onChange, user } = setup()
    await user.click(screen.getByRole('button', { name: `Hide section: ${firstTitle}` }))
    const next = onChange.mock.calls[0]?.[0]
    expect(next?.sections[0]).toMatchObject({ id: first.id, visible: false })
    // Other sections untouched.
    expect(next?.sections[1]).toEqual(second)
  })

  it('deletes a section after confirmation', async () => {
    const { onChange, onSelect, user } = setup()
    await user.click(screen.getByRole('button', { name: `More actions: ${firstTitle}` }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Delete this section?')
    await user.click(screen.getByRole('button', { name: 'Delete section' }))

    const next = onChange.mock.calls[0]?.[0]
    expect(next?.sections).toHaveLength(HOME_PAGE_DEFAULT.sections.length - 1)
    expect(next?.sections.some((s) => s.id === first.id)).toBe(false)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('marks invalid sections and exposes a keyboard reorder handle', () => {
    render(
      <SectionList
        content={HOME_PAGE_DEFAULT}
        selectedId={null}
        onSelect={() => {}}
        onChange={() => {}}
        errors={{ [first.id]: ['title: Too long'] }}
      />,
    )
    expect(screen.getAllByRole('img', { name: 'Has errors' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Reorder' })).toHaveLength(
      HOME_PAGE_DEFAULT.sections.length,
    )
  })
})

describe('sectionTitle', () => {
  it('falls back to the type label for sections without a title', () => {
    const marquee = createSection('image_marquee')
    expect(sectionTitle(marquee)).toBe('Image marquee')
    render(
      <SectionList
        content={{ ...HOME_PAGE_DEFAULT, sections: [marquee] }}
        selectedId={null}
        onSelect={() => {}}
        onChange={() => {}}
      />,
    )
    expect(screen.getByRole('listitem')).toHaveTextContent('Image marquee')
  })
})
