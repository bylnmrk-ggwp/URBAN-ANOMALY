import { ChevronDown } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { NavigationContent } from '../../domain/navigation'

/** Schematic header + footer so link order and copy can be checked without leaving the editor. */
export function NavigationPreview({ content }: { content: NavigationContent }) {
  const year = new Date().getFullYear()
  return (
    <Card className="gap-3 rounded-lg shadow-none" data-testid="navigation-preview">
      <CardHeader>
        <CardTitle className="text-sm">Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-background overflow-hidden rounded-md border text-xs">
          <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
            <span className="font-semibold tracking-wide uppercase">Atelier MNL</span>
            <nav aria-label="Header preview" className="flex flex-wrap items-center gap-3">
              {content.primaryLinks.map((link) => (
                <span key={link.id}>{link.label || '…'}</span>
              ))}
              {content.showCollectionsMenu ? (
                <span className="inline-flex items-center gap-0.5">
                  Collections <ChevronDown className="size-3" aria-hidden="true" />
                </span>
              ) : null}
              {content.secondaryLinks.map((link) => (
                <span key={link.id}>{link.label || '…'}</span>
              ))}
            </nav>
          </div>
          <div className="bg-muted/40 grid gap-4 px-3 py-3 sm:grid-cols-3">
            {content.showCategoryColumn ? (
              <div>
                <p className="mb-1 font-medium">Shop</p>
                <p className="text-muted-foreground">Categories from catalog</p>
              </div>
            ) : null}
            {content.footerColumns.map((column) => (
              <div key={column.id} className="min-w-0">
                <p className="mb-1 truncate font-medium">{column.title || '…'}</p>
                <ul className="text-muted-foreground space-y-0.5">
                  {column.links.map((link) => (
                    <li key={link.id} className="truncate">
                      {link.label || '…'}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="min-w-0 sm:col-span-3">
              <p className="mb-1 font-medium">{content.newsletterTitle || '…'}</p>
              <p className="text-muted-foreground">{content.newsletterBody}</p>
            </div>
          </div>
          <div className="text-muted-foreground flex flex-wrap justify-between gap-2 border-t px-3 py-2 text-[11px]">
            <span>{content.paymentLine}</span>
            <span>
              © {year} Atelier MNL. {content.legalLine}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
