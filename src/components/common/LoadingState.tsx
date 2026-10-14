import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface LoadingStateProps {
  label?: string
  className?: string
  /** Full-page centered variant used by route suspense boundaries. */
  fullPage?: boolean
}

export function LoadingState({
  label = 'Loading…',
  className,
  fullPage = false,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'text-muted-foreground flex items-center justify-center gap-2 text-sm',
        fullPage ? 'min-h-[60vh]' : 'py-12',
        className,
      )}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
