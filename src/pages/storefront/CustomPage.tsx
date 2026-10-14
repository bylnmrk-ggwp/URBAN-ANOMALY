import { FileQuestion } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isPreviewMode, usePreviewOverride } from '@/features/cms/application/previewBridge'
import { usePublishedPage } from '@/features/cms/application/usePublishedDocument'
import { pageKey } from '@/features/cms/domain/documents'
import { PageRenderer } from '@/features/cms/presentation/PageRenderer'

function PageSkeleton() {
  return (
    <section className="container-x py-16 lg:py-24" aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-10 w-2/3 max-w-xl" />
      <div className="mt-8 max-w-2xl space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </section>
  )
}

function PageNotFound() {
  return (
    <section className="container-x py-16 lg:py-24">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="This page is not published or never existed. Try the shop instead."
        action={
          <Button asChild>
            <Link to={routes.home}>Back to home</Link>
          </Button>
        }
      />
    </section>
  )
}

/** `/pages/:slug` — admin-created pages. Only published documents resolve. */
export default function CustomPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  // Inside the editor a pushed draft wins, so unpublished pages still preview.
  const override = usePreviewOverride('page', pageKey(slug))
  const page = usePublishedPage(slug)

  if (override) return <PageRenderer content={override} />
  if (page.isPending) return <PageSkeleton />
  if (page.isError) {
    return (
      <section className="container-x py-16 lg:py-24">
        <ErrorState error={page.error} onRetry={() => void page.refetch()} />
      </section>
    )
  }
  // Preview of a never-published page: keep the skeleton until the editor pushes its draft.
  if (!page.data) return isPreviewMode() ? <PageSkeleton /> : <PageNotFound />
  return <PageRenderer content={page.data.content} />
}
