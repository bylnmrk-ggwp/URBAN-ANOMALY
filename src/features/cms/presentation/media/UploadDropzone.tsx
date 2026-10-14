import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'

import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

import { useUploadMedia } from '../../application/useMedia'
import type { MediaAsset } from '../../domain/media'
import {
  formatBytes,
  MEDIA_ALLOWED_MIME,
  MEDIA_MAX_BYTES,
  validateMediaFile,
} from '../../domain/media'

interface UploadItem {
  id: number
  name: string
  size: number
  status: 'uploading' | 'done' | 'error'
  error?: string
}

interface UploadDropzoneProps {
  onUploaded?: (asset: MediaAsset) => void
  disabled?: boolean
  className?: string
  /** Smaller padding for use inside dialogs. */
  compact?: boolean
}

let nextItemId = 1

export function UploadDropzone({ onUploaded, disabled, className, compact }: UploadDropzoneProps) {
  const upload = useUploadMedia()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const id = useId()

  const patch = (itemId: number, changes: Partial<UploadItem>) =>
    setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, ...changes } : it)))

  const handleFiles = (files: FileList | File[] | null) => {
    if (!files || disabled) return
    for (const file of Array.from(files)) {
      const itemId = nextItemId++
      const problem = validateMediaFile(file)
      setItems((prev) => [
        ...prev,
        {
          id: itemId,
          name: file.name,
          size: file.size,
          status: problem ? 'error' : 'uploading',
          error: problem ?? undefined,
        },
      ])
      if (problem) continue
      upload.mutate(
        { file },
        {
          onSuccess: (asset) => {
            patch(itemId, { status: 'done' })
            onUploaded?.(asset)
          },
          onError: (error) =>
            patch(itemId, { status: 'error', error: getErrorMessage(error, 'Upload failed.') }),
        },
      )
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center transition-colors',
          compact ? 'px-4 py-6' : 'px-6 py-10',
          dragging ? 'border-primary bg-muted' : 'border-border',
          disabled && 'opacity-60',
        )}
      >
        <UploadCloud className="text-muted-foreground size-6" aria-hidden="true" />
        <p id={`${id}-label`} className="text-sm font-medium">
          Drag images here or
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          Choose files
        </Button>
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="file"
          multiple
          accept={MEDIA_ALLOWED_MIME.join(',')}
          className="sr-only"
          aria-label="Choose image files to upload"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-muted-foreground text-xs">
          JPEG, PNG, WebP or AVIF, up to {formatBytes(MEDIA_MAX_BYTES)} each.
        </p>
      </div>

      {items.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Upload progress" aria-live="polite">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
            >
              {item.status === 'uploading' ? (
                <Loader2 className="text-muted-foreground size-4 animate-spin" aria-hidden="true" />
              ) : item.status === 'done' ? (
                <CheckCircle2 className="text-success size-4" aria-hidden="true" />
              ) : (
                <XCircle className="text-destructive size-4" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
              <span className="text-muted-foreground tabular-nums">{formatBytes(item.size)}</span>
              <span
                className={cn(
                  'shrink-0',
                  item.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {item.status === 'uploading'
                  ? 'Uploading…'
                  : item.status === 'done'
                    ? 'Uploaded'
                    : item.error}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
