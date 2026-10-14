import { ChevronRight, Megaphone, Menu, Palette, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { Skeleton } from '@/components/ui/skeleton'

import { GLOBAL_KEYS, type DocumentSummary } from '../../domain/documents'
import { DocumentStatusBadge } from './DocumentStatusBadge'
import { documentStatus } from './documentStatus'
import { ScheduledBadge } from './ScheduledBadge'

interface GlobalRow {
  key: string
  label: string
  description: string
  icon: LucideIcon
  to: string
}

const GLOBAL_ROWS: GlobalRow[] = [
  {
    key: GLOBAL_KEYS.navigation,
    label: 'Navigation',
    description: 'Header links and footer columns.',
    icon: Menu,
    to: routes.admin.navigation,
  },
  {
    key: GLOBAL_KEYS.announcement,
    label: 'Announcement bar',
    description: 'The strip above the header.',
    icon: Megaphone,
    to: routes.admin.announcement,
  },
  {
    key: GLOBAL_KEYS.theme,
    label: 'Theme',
    description: 'Colours, radius and typography.',
    icon: Palette,
    to: routes.admin.theme,
  },
]

interface GlobalContentListProps {
  documents: DocumentSummary[]
  isLoading: boolean
}

/** Links to the dedicated editors for site-wide documents, with their publish status. */
export function GlobalContentList({ documents, isLoading }: GlobalContentListProps) {
  const byKey = new Map(documents.map((d) => [d.key, d]))
  return (
    <ul className="divide-y rounded-lg border" aria-label="Global content">
      {GLOBAL_ROWS.map(({ key, label, description, icon: Icon, to }) => {
        const doc = byKey.get(key as DocumentSummary['key'])
        return (
          <li key={key}>
            <Link
              to={to}
              className="hover:bg-muted/60 flex min-h-14 items-center gap-3 px-4 py-3 transition-colors"
            >
              <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-muted-foreground block text-xs">{description}</span>
              </span>
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : doc ? (
                <span className="flex flex-col items-end gap-1">
                  <DocumentStatusBadge status={documentStatus(doc)} />
                  <ScheduledBadge scheduledAt={doc.scheduledAt} />
                </span>
              ) : null}
              <ChevronRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
