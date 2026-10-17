import { Images, Search } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

import { useMediaList } from '../../application/useMedia'
import type { MediaAsset } from '../../domain/media'
import { MediaGrid, MediaGridSkeleton } from './MediaGrid'
import { UploadDropzone } from './UploadDropzone'

export interface MediaLibraryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (asset: MediaAsset) => void
}

export function MediaLibraryDialog({ open, onOpenChange, onSelect }: MediaLibraryDialogProps) {
  const [tab, setTab] = useState('library')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const media = useMediaList(debouncedSearch)

  const choose = (asset: MediaAsset) => {
    onSelect(asset)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Media library</DialogTitle>
          <DialogDescription>Pick an image from the library or upload a new one.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-4">
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="relative">
              <Label htmlFor="media-library-search" className="sr-only">
                Search images
              </Label>
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                id="media-library-search"
                type="search"
                placeholder="Search by alt text or file name"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {media.isPending ? (
                <MediaGridSkeleton count={8} />
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
                    debouncedSearch ? 'Try a different search.' : 'Upload your first image.'
                  }
                  className="py-10"
                />
              ) : (
                <MediaGrid assets={media.data} selectable onSelect={choose} />
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload">
            <UploadDropzone compact onUploaded={choose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
