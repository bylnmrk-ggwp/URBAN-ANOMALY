import { ExternalLink, FileText, History, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelative } from '@/lib/format'

import { previewPathFor } from '../../application/previewBridge'
import { BUILT_IN_PAGE_SLUGS } from '../../domain/defaults'
import { parseDocumentKey, type DocumentSummary } from '../../domain/documents'
import { DocumentStatusBadge } from './DocumentStatusBadge'
import { documentStatus } from './documentStatus'
import { ScheduledBadge } from './ScheduledBadge'

interface PagesTableProps {
  pages: DocumentSummary[]
  isLoading: boolean
  onDelete: (slug: string) => void
  isDeleting: boolean
}

function slugOf(doc: DocumentSummary): string {
  return parseDocumentKey(doc.key)?.slug ?? ''
}

function isBuiltIn(doc: DocumentSummary): boolean {
  return (BUILT_IN_PAGE_SLUGS as readonly string[]).includes(slugOf(doc))
}

export function PagesTable({ pages, isLoading, onDelete, isDeleting }: PagesTableProps) {
  const [pendingDelete, setPendingDelete] = useState<DocumentSummary | null>(null)

  const actions = (doc: DocumentSummary) => (
    <div className="flex items-center justify-end gap-1">
      <Button asChild variant="outline" size="sm" className="h-9">
        <Link to={routes.admin.editor(doc.key)}>
          <Pencil aria-hidden="true" />
          Edit
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 md:size-9"
            aria-label={`More actions: ${doc.title}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem asChild>
            <a href={previewPathFor(doc.key)} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              View live
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={routes.admin.revisions(doc.key)}>
              <History aria-hidden="true" />
              History
            </Link>
          </DropdownMenuItem>
          {!isBuiltIn(doc) ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setPendingDelete(doc)}>
                <Trash2 aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  const columns: DataTableColumn<DocumentSummary>[] = [
    {
      key: 'title',
      header: 'Page',
      cell: (doc) => (
        <div className="min-w-0">
          <p className="font-medium">{doc.title}</p>
          <p className="text-muted-foreground font-mono text-xs">{previewPathFor(doc.key)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (doc) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <DocumentStatusBadge status={documentStatus(doc)} />
          <ScheduledBadge scheduledAt={doc.scheduledAt} />
        </div>
      ),
    },
    {
      key: 'versions',
      header: 'Draft / live',
      hideBelow: 'lg',
      cell: (doc) => (
        <span className="text-muted-foreground tabular-nums">
          v{doc.draftVersion} / {doc.publishedVersion > 0 ? `v${doc.publishedVersion}` : '—'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      hideBelow: 'md',
      cell: (doc) => <span className="text-muted-foreground">{formatRelative(doc.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      cell: actions,
    },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={pages}
        rowKey={(doc) => doc.key}
        isLoading={isLoading}
        caption="Pages"
        emptyState={
          <EmptyState
            icon={FileText}
            title="No pages yet"
            description="Create a page to get started."
          />
        }
        mobileCard={(doc) => (
          <div className="min-w-0 space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{doc.title}</p>
                <p className="text-muted-foreground font-mono text-xs break-all">
                  {previewPathFor(doc.key)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <DocumentStatusBadge status={documentStatus(doc)} />
                <ScheduledBadge scheduledAt={doc.scheduledAt} />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-muted-foreground text-xs">
                Updated {formatRelative(doc.updatedAt)}
              </span>
              {actions(doc)}
            </div>
          </div>
        )}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={`Delete “${pendingDelete?.title ?? ''}”?`}
        description="The page, its draft and its history are removed and the URL stops working. This cannot be undone."
        confirmLabel="Delete page"
        destructive
        isPending={isDeleting}
        onConfirm={() => {
          if (pendingDelete) onDelete(slugOf(pendingDelete))
          setPendingDelete(null)
        }}
      />
    </>
  )
}
