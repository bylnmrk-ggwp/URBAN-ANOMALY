import { Images, Search } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMediaList } from '@/features/cms/application/useMedia'
import type { MediaAsset } from '@/features/cms/domain/media'
import { MediaDetailsSheet } from '@/features/cms/presentation/media/MediaDetailsSheet'
import { MediaGrid, MediaGridSkeleton } from '@/features/cms/presentation/media/MediaGrid'
import { UploadDropzone } from '@/features/cms/presentation/media/UploadDropzone'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export default function MediaPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const media = useMediaList(debouncedSearch)
  const [selected, setSelected] = useState<MediaAsset | null>(null)

  // Keep the sheet in sync when alt text changes or the asset is deleted.
  const current = selected ? (media.data?.find((a) => a.id === selected.id) ?? selected) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media"
        description="Images used across storefront pages. Product photos are managed on each product."
      />

      <UploadDropzone />

      <div className="relative max-w-sm">
        <Label htmlFor="media-search" className="sr-only">
          Search images
        </Label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id="media-search"
          type="search"
          placeholder="Search by alt text or file name"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {media.isPending ? (
        <MediaGridSkeleton />
      ) : media.isError ? (
        <ErrorState
          title="Could not load media"
          error={media.error}
          onRetry={() => void media.refetch()}
          isRetrying={media.isRefetching}
        />
      ) : media.data.length === 0 ? (
        <EmptyState
          icon={Images}
          title={debouncedSearch ? 'No matching images' : 'No images yet.'}
          description={
            debouncedSearch
              ? 'Try a different search term.'
              : 'Drop images above to start building your library.'
          }
        />
      ) : (
        <MediaGrid assets={media.data} onSelect={setSelected} />
      )}

      <MediaDetailsSheet asset={current} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  )
}
