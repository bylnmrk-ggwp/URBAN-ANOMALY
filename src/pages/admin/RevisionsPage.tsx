import { FileX2 } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useDraftDocument } from '@/features/cms/application/useDraftDocument'
import {
  parseDocumentKey,
  type DocumentKey,
  type DocumentKind,
} from '@/features/cms/domain/documents'
import { DocumentStatusBadge } from '@/features/cms/presentation/editor/DocumentStatusBadge'
import { documentStatus } from '@/features/cms/presentation/editor/documentStatus'
import { RevisionsList } from '@/features/cms/presentation/editor/RevisionsList'

export default function RevisionsPage() {
  const [params] = useSearchParams()
  const raw = params.get('doc') ?? ''
  const parsed = parseDocumentKey(raw)

  if (!parsed) {
    return (
      <EmptyState
        icon={FileX2}
        title="No document selected"
        description="Open History from the Content list to see a document's versions."
        action={
          <Button asChild>
            <Link to={routes.admin.content}>Go to Content</Link>
          </Button>
        }
      />
    )
  }

  return <RevisionsView key={raw} kind={parsed.kind} docKey={raw as DocumentKey} />
}

function RevisionsView({ kind, docKey }: { kind: DocumentKind; docKey: DocumentKey }) {
  const navigate = useNavigate()
  const state = useDraftDocument(kind, docKey)
  const { document, revisions, restore } = state
  const editorPath = kind === 'page' ? routes.admin.editor(docKey) : null

  if (state.error) {
    return (
      <ErrorState
        title="Could not load this document"
        error={state.error}
        onRetry={() => void state.reload()}
      />
    )
  }

  return (
    <div className="space-y-6">
      {state.isLoading || !document ? (
        <Skeleton className="h-10 w-64" />
      ) : (
        <PageHeader
          title={`${document.title} history`}
          description="Every publish creates a version. Restoring copies a version into the draft; it does not publish."
          actions={
            <div className="flex items-center gap-3">
              <DocumentStatusBadge status={documentStatus(document)} />
              {editorPath ? (
                <Button asChild variant="outline">
                  <Link to={editorPath}>Open editor</Link>
                </Button>
              ) : null}
            </div>
          }
        />
      )}

      <RevisionsList
        revisions={revisions.data}
        isLoading={revisions.isPending || state.isLoading}
        error={revisions.error}
        onRetry={() => void revisions.refetch()}
        publishedVersion={document?.publishedVersion ?? 0}
        onRestore={(version) => restore.mutate(version)}
        isRestoring={restore.isPending}
        onPreview={
          editorPath
            ? (version) =>
                restore.mutate(version, {
                  onSuccess: () => void navigate(editorPath),
                })
            : undefined
        }
      />
    </div>
  )
}
