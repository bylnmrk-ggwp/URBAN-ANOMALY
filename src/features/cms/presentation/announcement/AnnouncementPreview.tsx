import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { AnnouncementContent } from '../../domain/navigation'

/** Same classes as the storefront bar so the preview matches what publishes. */
export function AnnouncementPreview({ content }: { content: AnnouncementContent }) {
  const text = content.text.trim()
  return (
    <Card className="gap-3 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-sm">Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-md border" data-testid="announcement-preview">
          {content.visible && text ? (
            <p className="bg-foreground text-background px-4 py-2 text-center text-xs font-medium">
              {content.href ? (
                <span className="underline-offset-2 hover:underline">{text}</span>
              ) : (
                text
              )}
            </p>
          ) : (
            <p className="text-muted-foreground bg-muted/40 px-4 py-2 text-center text-xs">
              {content.visible ? 'Add text to show the bar.' : 'Hidden on the storefront.'}
            </p>
          )}
          <div className="bg-background flex items-center justify-between border-t px-4 py-2 text-xs">
            <span className="font-semibold tracking-wide uppercase">Atelier MNL</span>
            <span className="text-muted-foreground">Header</span>
          </div>
        </div>
        {content.href ? (
          <p className="text-muted-foreground truncate text-xs">
            Links to <span className="font-mono">{content.href}</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
