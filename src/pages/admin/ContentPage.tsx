import { Plus } from 'lucide-react'
import { useState } from 'react'

import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useCmsDocuments, useDeletePage } from '@/features/cms/application/useCmsDocuments'
import { parseDocumentKey } from '@/features/cms/domain/documents'
import { GlobalContentList } from '@/features/cms/presentation/editor/GlobalContentList'
import { NewPageDialog } from '@/features/cms/presentation/editor/NewPageDialog'
import { PagesTable } from '@/features/cms/presentation/editor/PagesTable'
import { RecentActivity } from '@/features/cms/presentation/editor/RecentActivity'

export default function ContentPage() {
  const [newPageOpen, setNewPageOpen] = useState(false)
  const documents = useCmsDocuments()
  const deletePage = useDeletePage()

  const all = documents.data ?? []
  const pages = all.filter((d) => d.kind === 'page')
  const existingSlugs = pages.map((d) => parseDocumentKey(d.key)?.slug ?? '').filter(Boolean)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Content"
        description="Pages, navigation and the look of the storefront. Drafts are private until you publish."
        actions={
          <Button onClick={() => setNewPageOpen(true)}>
            <Plus aria-hidden="true" />
            New page
          </Button>
        }
      />

      {documents.isError ? (
        <ErrorState
          title="Could not load content"
          error={documents.error}
          onRetry={() => void documents.refetch()}
          isRetrying={documents.isRefetching}
        />
      ) : (
        <>
          <section aria-labelledby="pages-heading" className="space-y-3">
            <h2 id="pages-heading" className="text-base font-semibold">
              Pages
            </h2>
            <PagesTable
              pages={pages}
              isLoading={documents.isPending}
              onDelete={(slug) => deletePage.mutate(slug)}
              isDeleting={deletePage.isPending}
            />
          </section>

          <div className="grid min-w-0 gap-8 *:min-w-0 lg:grid-cols-2">
            <section aria-labelledby="global-heading" className="space-y-3">
              <h2 id="global-heading" className="text-base font-semibold">
                Global content
              </h2>
              <GlobalContentList documents={all} isLoading={documents.isPending} />
            </section>
            <section aria-labelledby="activity-heading" className="space-y-3">
              <h2 id="activity-heading" className="text-base font-semibold">
                Recent activity
              </h2>
              <RecentActivity limit={10} />
            </section>
          </div>
        </>
      )}

      <NewPageDialog
        open={newPageOpen}
        onOpenChange={setNewPageOpen}
        existingSlugs={existingSlugs}
      />
    </div>
  )
}
