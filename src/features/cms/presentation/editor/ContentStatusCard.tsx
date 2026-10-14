import { ArrowRight, FileText } from 'lucide-react'
import { Link } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

import { useCmsDocuments } from '../../application/useCmsDocuments'

/** Dashboard card: how many documents have changes that visitors cannot see yet. */
export function ContentStatusCard() {
  const documents = useCmsDocuments()
  const pending = (documents.data ?? []).filter((d) => d.hasUnpublishedChanges)

  return (
    <Card className="gap-0 rounded-lg py-4 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between px-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FileText className="text-muted-foreground size-4" aria-hidden="true" />
          Content
        </CardTitle>
        <Button asChild variant="ghost" size="sm" className="-mr-2">
          <Link to={routes.admin.content}>
            Manage
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-4">
        {documents.isPending ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : documents.isError ? (
          <p className="text-muted-foreground text-sm">Content status is unavailable.</p>
        ) : pending.length === 0 ? (
          <p className="text-muted-foreground text-sm">Everything is published.</p>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-2xl font-semibold tabular-nums">
              {pending.length}
              <span className="text-muted-foreground ml-2 text-sm font-normal">
                {pending.length === 1 ? 'document with' : 'documents with'} unpublished changes
              </span>
            </p>
            <ul className="text-muted-foreground flex flex-wrap gap-x-3 text-sm">
              {pending.slice(0, 3).map((doc) => (
                <li key={doc.key}>
                  <Link
                    to={routes.admin.editor(doc.key)}
                    className="hover:text-foreground underline-offset-4 hover:underline"
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
              {pending.length > 3 ? <li>+{pending.length - 3} more</li> : null}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
