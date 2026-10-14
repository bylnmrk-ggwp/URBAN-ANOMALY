import { ImageIcon, Images, Link2, X } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import type { ImageRef } from '../../domain/common'
import { emptyImage } from '../../domain/common'
import type { MediaAsset } from '../../domain/media'
import { MediaLibraryDialog } from './MediaLibraryDialog'

export interface ImagePickerFieldProps {
  value: ImageRef
  onChange: (ref: ImageRef) => void
  label: string
  description?: string
  disabled?: boolean
}

const HTTPS_URL = /^https:\/\/\S+$/i

export function ImagePickerField({
  value,
  onChange,
  label,
  description,
  disabled,
}: ImagePickerFieldProps) {
  const id = useId()
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [urlOpen, setUrlOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)

  const pickFromLibrary = (asset: MediaAsset) =>
    onChange({ mediaId: asset.id, url: asset.url, alt: value.alt || asset.alt })

  const applyUrl = () => {
    const trimmed = url.trim()
    if (!HTTPS_URL.test(trimmed)) {
      setUrlError('Enter an https:// image URL.')
      return
    }
    onChange({ mediaId: null, url: trimmed, alt: value.alt })
    setUrl('')
    setUrlError(null)
    setUrlOpen(false)
  }

  return (
    <div className="space-y-2">
      <p id={`${id}-label`} className="text-sm font-medium">
        {label}
      </p>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        className="bg-card flex flex-col gap-3 rounded-lg border p-3 sm:flex-row"
      >
        <div className="bg-muted flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border">
          {value.url ? (
            <img src={value.url} alt={value.alt} className="size-full object-cover" />
          ) : (
            <ImageIcon className="text-muted-foreground size-6" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-alt`}>Alt text</Label>
            <Input
              id={`${id}-alt`}
              value={value.alt}
              maxLength={160}
              disabled={disabled}
              placeholder="Describe the image"
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setLibraryOpen(true)}
            >
              <Images aria-hidden="true" />
              Choose from library
            </Button>

            <Popover open={urlOpen} onOpenChange={setUrlOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={disabled}>
                  <Link2 aria-hidden="true" />
                  Use URL
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 space-y-2">
                <Label htmlFor={`${id}-url`}>Image URL</Label>
                <Input
                  id={`${id}-url`}
                  type="url"
                  placeholder="https://…"
                  value={url}
                  aria-invalid={Boolean(urlError)}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    setUrlError(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      applyUrl()
                    }
                  }}
                />
                {urlError ? (
                  <p className="text-destructive text-xs" role="alert">
                    {urlError}
                  </p>
                ) : null}
                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={applyUrl}>
                    Use this URL
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {value.url ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                className="text-destructive hover:text-destructive"
                onClick={() => onChange({ ...emptyImage })}
              >
                <X aria-hidden="true" />
                Remove
              </Button>
            ) : null}
          </div>
          {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
        </div>
      </div>

      <MediaLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onSelect={pickFromLibrary}
      />
    </div>
  )
}
