import { Activity } from 'lucide-react'

import { EmptyState } from '@/components/common/EmptyState'
import { Skeleton } from '@/components/ui/skeleton'
import { formatRelative } from '@/lib/format'

import { useCmsAudit } from '../../application/useCmsDocuments'
import type { AuditEntry } from '../../domain/documents'

const ACTION_LABEL: Record<AuditEntry['action'], string> = {
  save_draft: 'saved a draft',
  publish: 'published',
  restore: 'restored a version',
  media_upload: 'uploaded media',
  media_delete: 'deleted media',
  create_page: 'created a page',
  delete_page: 'deleted a page',
}

export function RecentActivity({ limit = 10 }: { limit?: number }) {
  const audit = useCmsAudit(limit)

  if (audit.isPending) {
    return (
      <ul className="space-y-2" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <Skeleton className="h-10 w-full" />
          </li>
        ))}
      </ul>
    )
  }
  if (audit.isError) {
    return <p className="text-muted-foreground text-sm">Activity is unavailable right now.</p>
  }
  if (!audit.data || audit.data.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Saves, publishes and media changes show up here."
        className="py-8"
      />
    )
  }

  return (
    <ol className="divide-y rounded-lg border text-sm" aria-label="Recent content activity">
      {audit.data.map((entry) => (
        <li key={entry.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-2.5">
          <span>
            <span className="font-medium">{entry.actor}</span> {ACTION_LABEL[entry.action]}
            {entry.details ? (
              <span className="text-muted-foreground"> · {entry.details}</span>
            ) : null}
          </span>
          <time className="text-muted-foreground ml-auto text-xs" dateTime={entry.createdAt}>
            {formatRelative(entry.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  )
}
