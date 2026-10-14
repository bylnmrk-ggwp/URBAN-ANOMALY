import { Check } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import type { MediaAsset } from '../../domain/media'
import { formatBytes } from '../../domain/media'

interface MediaGridProps {
  assets: MediaAsset[]
  /** Highlights the matching tile; used in selectable mode. */
  selectedId?: string | null
  onSelect: (asset: MediaAsset) => void
  /** Tiles read "Select <alt>" instead of "Open <alt>" in the accessibility tree. */
  selectable?: boolean
  className?: string
}

export function MediaGrid({ assets, selectedId, onSelect, selectable, className }: MediaGridProps) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        className,
      )}
      aria-label="Media library"
    >
      {assets.map((asset) => {
        const selected = asset.id === selectedId
        const name = asset.alt || asset.path.split('/').pop() || 'Untitled image'
        return (
          <li key={asset.id}>
            <button
              type="button"
              onClick={() => onSelect(asset)}
              aria-label={`${selectable ? 'Select' : 'Open'} ${name}`}
              aria-pressed={selectable ? selected : undefined}
              className={cn(
                'bg-card group focus-visible:ring-ring/50 flex w-full flex-col overflow-hidden rounded-lg border text-left transition-colors outline-none focus-visible:ring-[3px]',
                selected ? 'ring-primary ring-2' : 'hover:border-foreground/30',
              )}
            >
              <div className="bg-muted relative aspect-square w-full overflow-hidden">
                <img
                  src={asset.url}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                />
                {selected ? (
                  <span className="bg-primary text-primary-foreground absolute top-2 right-2 flex size-6 items-center justify-center rounded-full">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 space-y-0.5 p-2">
                <p className="truncate text-xs font-medium">{name}</p>
                <p className="text-muted-foreground truncate text-[11px] tabular-nums">
                  {formatBytes(asset.sizeBytes)}
                  {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                </p>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function MediaGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      aria-busy="true"
      aria-label="Loading media"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-1.5 p-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}
