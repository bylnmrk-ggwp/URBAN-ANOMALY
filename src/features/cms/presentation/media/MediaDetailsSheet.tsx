import { Copy, ExternalLink, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { routes } from '@/app/router/routes'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatDateTime } from '@/lib/format'

import {
  describeDeleteError,
  useDeleteMedia,
  useMediaUsages,
  useUpdateMediaAlt,
} from '../../application/useMedia'
import type { DocumentKey } from '../../domain/documents'
import { parseDocumentKey } from '../../domain/documents'
import type { MediaAsset } from '../../domain/media'
import { formatBytes } from '../../domain/media'

/** Where "Used in" entries link. Page documents open in the visual editor (editor agent route). */
function editorHrefFor(key: DocumentKey): string {
  const parsed = parseDocumentKey(key)
  switch (parsed?.kind) {
    case 'navigation':
      return routes.admin.navigation
    case 'theme':
      return routes.admin.theme
    case 'announcement':
      return routes.admin.announcement
    default:
      return `/admin/editor?doc=${encodeURIComponent(key)}`
  }
}

function usageLabel(key: DocumentKey): string {
  const parsed = parseDocumentKey(key)
  if (!parsed) return key
  if (parsed.kind === 'page') return `Page: ${parsed.slug}`
  return parsed.kind.charAt(0).toUpperCase() + parsed.kind.slice(1)
}

interface MediaDetailsSheetProps {
  asset: MediaAsset | null
  onOpenChange: (open: boolean) => void
}

export function MediaDetailsSheet({ asset, onOpenChange }: MediaDetailsSheetProps) {
  return (
    <Sheet open={asset !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {asset ? (
          <Details key={asset.id} asset={asset} onClose={() => onOpenChange(false)} />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Details({ asset, onClose }: { asset: MediaAsset; onClose: () => void }) {
  const usages = useMediaUsages(asset.id)
  const updateAlt = useUpdateMediaAlt()
  const remove = useDeleteMedia()
  const [alt, setAlt] = useState(asset.alt)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const usedIn = usages.data ?? []
  const inUse = usedIn.length > 0
  const altDirty = alt.trim() !== asset.alt

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(asset.url)
      toast.success('URL copied.')
    } catch {
      toast.error('Could not copy. Select the URL and copy it manually.')
    }
  }

  const confirmDelete = () => {
    setDeleteError(null)
    remove.mutate(asset.id, {
      onSuccess: () => {
        setConfirmOpen(false)
        onClose()
      },
      onError: (error) => {
        setConfirmOpen(false)
        setDeleteError(describeDeleteError(error))
      },
    })
  }

  return (
    <>
      <SheetHeader>
        <SheetTitle className="truncate">{asset.alt || 'Image details'}</SheetTitle>
        <SheetDescription>
          {formatBytes(asset.sizeBytes)}
          {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''} · {asset.mime}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 px-4 pb-6">
        <div className="bg-muted aspect-[4/3] overflow-hidden rounded-lg border">
          <img src={asset.url} alt={asset.alt} className="size-full object-contain" />
        </div>

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault()
            updateAlt.mutate({ id: asset.id, alt: alt.trim() })
          }}
        >
          <Label htmlFor="media-alt">Alt text</Label>
          <div className="flex gap-2">
            <Input
              id="media-alt"
              value={alt}
              maxLength={160}
              onChange={(e) => setAlt(e.target.value)}
              placeholder="Describe the image for screen readers"
            />
            <Button type="submit" variant="outline" disabled={!altDirty || updateAlt.isPending}>
              {updateAlt.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Save
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <Label htmlFor="media-url">URL</Label>
          <div className="flex gap-2">
            <Input id="media-url" readOnly value={asset.url} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Copy URL"
              onClick={copyUrl}
            >
              <Copy aria-hidden="true" />
            </Button>
            <Button asChild variant="outline" size="icon">
              <a
                href={asset.url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open image in new tab"
              >
                <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>

        <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt>Uploaded by</dt>
          <dd className="text-foreground truncate">{asset.uploadedBy}</dd>
          <dt>Uploaded</dt>
          <dd className="text-foreground">{formatDateTime(asset.createdAt)}</dd>
          <dt>Path</dt>
          <dd className="text-foreground truncate font-mono">{asset.path}</dd>
        </dl>

        <section className="space-y-2" aria-labelledby="media-used-in">
          <h3 id="media-used-in" className="text-sm font-medium">
            Used in
          </h3>
          {usages.isPending ? (
            <Skeleton className="h-8 w-full" />
          ) : usages.isError ? (
            <p className="text-destructive text-xs">Could not load usages.</p>
          ) : usedIn.length === 0 ? (
            <p className="text-muted-foreground text-xs">Not used by any document.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {usedIn.map((key) => (
                <li key={key}>
                  <Link to={editorHrefFor(key)} className="underline-offset-4 hover:underline">
                    {usageLabel(key)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-2 border-t pt-4">
          <Button
            type="button"
            variant="destructive"
            className="w-full"
            disabled={inUse || usages.isPending || remove.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 aria-hidden="true" />
            Delete image
          </Button>
          {inUse ? (
            <p className="text-muted-foreground text-xs">
              Remove this image from the documents above before deleting it.
            </p>
          ) : null}
          {deleteError ? (
            <p role="alert" className="text-destructive text-xs">
              {deleteError}
            </p>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this image?"
        description="The file is removed from the media library. This cannot be undone."
        confirmLabel="Delete"
        destructive
        isPending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  )
}
