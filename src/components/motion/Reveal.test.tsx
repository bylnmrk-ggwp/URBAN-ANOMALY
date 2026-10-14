import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Reveal } from './Reveal'

describe('Reveal', () => {
  it('renders its children and is visible immediately without IntersectionObserver', () => {
    // jsdom has no IntersectionObserver, so the hook falls back to "already visible".
    expect('IntersectionObserver' in window).toBe(false)
    render(
      <Reveal className="band" data-testid="band">
        <p>Band copy</p>
      </Reveal>,
    )

    const band = screen.getByTestId('band')
    expect(screen.getByText('Band copy')).toBeVisible()
    expect(band).toHaveClass('reveal-visible', 'band')
    expect(band).not.toHaveClass('reveal')
  })

  it('supports the fade effect, a custom tag and a stagger delay', () => {
    render(
      <Reveal as="section" effect="fade" delay={120} aria-label="Fade band">
        <p>Faded</p>
      </Reveal>,
    )
    const band = screen.getByRole('region', { name: 'Fade band' })
    expect(band.tagName).toBe('SECTION')
    expect(band).toHaveClass('reveal-fade-visible')
    expect(band).toHaveStyle({ animationDelay: '120ms' })
  })
})
