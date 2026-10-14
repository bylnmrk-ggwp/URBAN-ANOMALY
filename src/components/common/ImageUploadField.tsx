import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  Trash2,
} from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUploadMedia } from '@/features/cms/application/useMedia'
import type { MediaAsset } from '@/features/cms/domain/media'
import { formatBytes, MEDIA_ALLOWED_MIME, MEDIA_MAX_BYTES } from '@/features/cms/domain/media'
import { MediaLibraryDialog } from '@/features/cms/presentation/media/MediaLibraryDialog'
import type { ProductImageInput } from '@/features/products/domain/entities'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface ImageUploadFieldProps {
  value: ProductImageInput[]
  onChange: (images: ProductImageInput[]) => void
  disabled?: boolean
}

/** Guarantees exactly one primary image: the first one when none is flagged. */
function normalizePrimary(images: ProductImageInput[]): ProductImageInput[] {
  const primaryIndex = images.findIndex((img) => img.isPrimary)
  const target = primaryIndex === -1 ? 0 : primaryIndex
  return images.map((img, index) => ({ ...img, isPrimary: index === target }))
}

function swap(images: ProductImageInput[], from: number, to: number): ProductImageInput[] {
  const a = images[from]
  const b = images[to]
  if (!a || !b) return images
  const next = [...images]
  next[from] = b
  next[to] = a
  return next
}

interface PendingUpload {
  id: number
  name: string
  error?: string
}

let nextUploadId = 1

export function ImageUploadField({ value, onChange, disabled = false }: ImageUploadFieldProps) {
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [uploads, setUploads] = useState<PendingUpload[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMedia = useUploadMedia()
  const id = useId()

  // Concurrent uploads each resolve against the list as it is at that moment, so the
  // callback reads a ref instead of the value captured when the upload started.
  const valueRef = useRef(value)
  useEffect(() => {
    valueRef.current = value
  }, [value])

  const update = (images: ProductImageInput[]) => onChange(normalizePrimary(images))

  const addByUrl = () => {
    const trimmed = url.trim()
    if (!/^https?:\/\/\S+$/i.test(trimmed)) {
      setUrlError('Enter a valid http(s) image URL.')
      return
    }
    update([...value, { url: trimmed, alt: '', isPrimary: value.length === 0 }])
    setUrl('')
    setUrlError(null)
  }

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      const uploadId = nextUploadId++
      setUploads((prev) => [...prev, { id: uploadId, name: file.name }])
      uploadMedia.mutate(
        { file },
        {
          onSuccess: (asset) => {
            setUploads((prev) => prev.filter((u) => u.id !== uploadId))
            const nextImages = normalizePrimary([
              ...valueRef.current,
              { url: asset.url, alt: asset.alt, isPrimary: false },
            ])
            valueRef.current = nextImages
            onChange(nextImages)
          },
          onError: (error) =>
            setUploads((prev) =>
              prev.map((u) =>
                u.id === uploadId ? { ...u, error: getErrorMessage(error, 'Upload failed.') } : u,
              ),
            ),
        },
      )
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const dismissUpload = (uploadId: number) =>
    setUploads((prev) => prev.filter((u) => u.id !== uploadId))

  /** Copies the library asset's public URL; the first image stays primary. */
  const addFromLibrary = (asset: MediaAsset) =>
    update([...value, { url: asset.url, alt: asset.alt, isPrimary: false }])

  const setAlt = (index: number, alt: string) =>
    update(value.map((img, i) => (i === index ? { ...img, alt } : img)))
  const setPrimary = (index: number) =>
    update(value.map((img, i) => ({ ...img, isPrimary: i === index })))
  const remove = (index: number) => update(value.filter((_, i) => i !== index))

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <Label htmlFor={`${id}-url`} className="sr-only">
            Image URL
          </Label>
          <Input
            id={`${id}-url`}
            type="url"
            placeholder="https://example.com/image.jpg"
            value={url}
            disabled={disabled}
            aria-invalid={Boolean(urlError)}
            onChange={(e) => {
              setUrl(e.target.value)
              setUrlError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addByUrl()
              }
            }}
          />
          {urlError ? <p className="text-destructive mt-1 text-xs">{urlError}</p> : null}
        </div>
        <Button type="button" variant="outline" onClick={addByUrl} disabled={disabled}>
          <Link2 aria-hidden="true" />
          Add URL
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <ImagePlus aria-hidden="true" />
          Choose files
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setLibraryOpen(true)}
          disabled={disabled}
        >
          <Images aria-hidden="true" />
          Choose from library
        </Button>
        <MediaLibraryDialog
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          onSelect={addFromLibrary}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={MEDIA_ALLOWED_MIME.join(',')}
          className="sr-only"
          aria-label="Choose image files"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Uploads go to the media library (JPEG, PNG, WebP or AVIF, up to{' '}
        {formatBytes(MEDIA_MAX_BYTES)}) and can be reused on other products. Image URLs are saved
        as-is.
      </p>

      {uploads.length > 0 ? (
        <ul className="space-y-1" aria-label="Uploads in progress">
          {uploads.map((item) => (
            <li
              key={item.id}
              className="bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
            >
              {item.error ? (
                <AlertCircle className="text-destructive size-4 shrink-0" aria-hidden="true" />
              ) : (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              )}
              <span className="truncate">{item.name}</span>
              {item.error ? (
                <>
                  <span className="text-destructive ml-auto">{item.error}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Dismiss failed upload ${item.name}`}
                    onClick={() => dismissUpload(item.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </>
              ) : (
                <span className="text-muted-foreground ml-auto">Uploading…</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {value.length === 0 ? (
        <div className="text-muted-foreground flex items-center justify-center rounded-lg border border-dashed px-4 py-10 text-sm">
          No images yet. Add one by URL or pick local files.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Product images">
          {value.map((image, index) => (
            <li
              key={`${image.id ?? 'new'}-${image.url}`}
              className={cn(
                'bg-card flex flex-col gap-2 rounded-lg border p-2',
                image.isPrimary && 'ring-ring ring-1',
              )}
            >
              <div className="bg-muted aspect-[3/4] overflow-hidden rounded-md">
                <img
                  src={image.url}
                  alt={image.alt || `Product image ${index + 1}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name={`${id}-primary`}
                  checked={image.isPrimary}
                  onChange={() => setPrimary(index)}
                  disabled={disabled}
                  className="accent-primary size-4"
                />
                {image.isPrimary ? 'Primary image' : 'Set as primary'}
              </label>
              <Input
                aria-label={`Alt text for image ${index + 1}`}
                placeholder="Alt text"
                value={image.alt}
                disabled={disabled}
                onChange={(e) => setAlt(index, e.target.value)}
                className="h-8 text-xs"
              />
              <div className="flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move image ${index + 1} up`}
                    disabled={disabled || index === 0}
                    onClick={() => update(swap(value, index, index - 1))}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Move image ${index + 1} down`}
                    disabled={disabled || index === value.length - 1}
                    onClick={() => update(swap(value, index, index + 1))}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:text-destructive"
                  aria-label={`Remove image ${index + 1}`}
                  disabled={disabled}
                  onClick={() => remove(index)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
