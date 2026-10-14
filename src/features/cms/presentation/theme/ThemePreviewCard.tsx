import type { CSSProperties } from 'react'

import { BrandWordmark } from '@/components/layout/BrandMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

import type { ThemeContent } from '../../domain/theme'
import { seasonCssVariables, themeToCssVariables } from '../../domain/theme'

/**
 * Renders sample storefront elements with the draft tokens applied as CSS variables on a
 * wrapper. shadcn components read the same variables, so what you see is what publishes.
 * Only the draft is previewed here; the live site keeps the published theme.
 *
 * The season's full light palette goes on first — including the tokens the colour fields do not
 * expose, such as the accent pair — so the sample never inherits the published season. The
 * seven edited colours are layered over it.
 */
export function ThemePreviewCard({ theme }: { theme: ThemeContent }) {
  const style = {
    ...seasonCssVariables(theme.season, 'light'),
    ...themeToCssVariables(theme),
  } as CSSProperties

  return (
    <Card className="gap-3 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          data-testid="theme-preview"
          style={style}
          className="bg-background text-foreground border-border overflow-hidden rounded-lg border font-sans"
        >
          <div className="space-y-5 p-5">
            <BrandWordmark alt="" season={theme.season} />
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs tracking-widest uppercase">New season</p>
              <h3 className="text-2xl font-semibold tracking-tight">Built for Manila streets</h3>
              <p className="text-muted-foreground text-sm">
                Body text uses the foreground colour on the page background. Muted copy sits beside
                it for captions and helper text.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" className="rounded-[var(--button-radius)]">
                Shop the edit
              </Button>
              <Button type="button" variant="outline" className="rounded-[var(--button-radius)]">
                Learn more
              </Button>
            </div>
            <div className="bg-card text-card-foreground border-border rounded-[var(--radius)] border p-4">
              <div className="bg-muted mb-3 aspect-[4/3] w-full rounded-[calc(var(--radius)-2px)]" />
              <p className="text-sm font-medium">Lava Premium Clog</p>
              <p className="text-muted-foreground text-xs">₱2,490</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="theme-preview-email" className="text-xs font-medium">
                Email
              </label>
              <Input
                id="theme-preview-email"
                readOnly
                placeholder="you@example.com"
                className="rounded-[var(--radius)]"
              />
            </div>
          </div>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          Section spacing scales storefront padding by{' '}
          <span className="font-mono">{style['--section-scale' as keyof CSSProperties]}×</span>.
        </p>
      </CardContent>
    </Card>
  )
}
