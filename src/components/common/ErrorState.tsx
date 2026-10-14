import { AlertCircle, RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/errors'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  error?: unknown
  message?: string
  onRetry?: () => void
  isRetrying?: boolean
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  message,
  onRetry,
  isRetrying = false,
  className,
}: ErrorStateProps) {
  const description = message ?? getErrorMessage(error, 'Please try again.')
  return (
    <div
      role="alert"
      className={cn(
        'border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center rounded-lg border px-6 py-12 text-center',
        className,
      )}
    >
      <div className="bg-destructive/10 text-destructive mb-4 flex size-12 items-center justify-center rounded-full">
        <AlertCircle className="size-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-6" onClick={onRetry} disabled={isRetrying}>
          <RefreshCw className={cn('size-4', isRetrying && 'animate-spin')} aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  )
}
