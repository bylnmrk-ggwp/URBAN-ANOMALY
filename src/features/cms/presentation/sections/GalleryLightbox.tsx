import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

import type { GalleryImage } from '../../domain/sections'

interface GalleryLightboxProps {
  images: GalleryImage[]
  /** Index of the open image, or null when closed. */
  index: number | null
  onIndexChange: (index: number | null) => void
}

/** Full-screen image viewer with previous/next buttons and arrow-key navigation. */
export function GalleryLightbox({ images, index, onIndexChange }: GalleryLightboxProps) {
  const open = index !== null && images[index] !== undefined
  const current = index === null ? undefined : images[index]
  const count = images.length

  const step = (delta: number) => {
    if (index === null || count === 0) return
    onIndexChange((index + delta + count) % count)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        step(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step closes over index/count
  }, [open, index, count])

  const caption = current?.caption || current?.alt || ''
  const position = index === null ? '' : `Image ${index + 1} of ${count}`

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onIndexChange(null)}>
      <DialogContent
        className="max-h-[90dvh] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto border-0 bg-black/95 p-2 text-white sm:max-w-5xl sm:p-4 [&>button]:text-white"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {caption ? `${caption} (${position})` : position}
        </DialogTitle>
        {current ? (
          <figure className="flex flex-col items-center gap-3">
            <div className="relative flex w-full items-center justify-center">
              <img
                src={current.url}
                alt={current.alt}
                className="max-h-[70dvh] w-auto max-w-full object-contain"
              />
              {count > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Previous image"
                    className="absolute top-1/2 left-0 size-11 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
                    onClick={() => step(-1)}
                  >
                    <ChevronLeft aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Next image"
                    className="absolute top-1/2 right-0 size-11 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60 hover:text-white"
                    onClick={() => step(1)}
                  >
                    <ChevronRight aria-hidden="true" />
                  </Button>
                </>
              ) : null}
            </div>
            <figcaption className="flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1 text-sm">
              <span className="min-w-0 flex-1 break-words text-white/90">{caption}</span>
              <span className="text-white/60 tabular-nums">{position}</span>
            </figcaption>
          </figure>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
