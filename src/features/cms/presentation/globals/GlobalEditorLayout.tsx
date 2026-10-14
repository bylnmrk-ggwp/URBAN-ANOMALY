import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface GlobalEditorLayoutProps {
  form: ReactNode
  preview: ReactNode
  actions: ReactNode
  conflict: boolean
  onReload: () => void
  isReloading?: boolean
}

/**
 * Two columns on lg (form left, sticky preview + actions right); stacked on mobile with a
 * sticky bottom action bar. Shared by the navigation, theme and announcement editors.
 */
export function GlobalEditorLayout({
  form,
  preview,
  actions,
  conflict,
  onReload,
  isReloading,
}: GlobalEditorLayoutProps) {
  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      {conflict ? <ConflictBanner onReload={onReload} isReloading={isReloading} /> : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-5">
        <div className="min-w-0 space-y-6 lg:col-span-3">{form}</div>
        <div className="min-w-0 lg:col-span-2">
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="hidden lg:block">{actions}</div>
            {preview}
          </div>
        </div>
      </div>

      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-20 border-t px-4 py-3 backdrop-blur lg:hidden">
        {actions}
      </div>
    </div>
  )
}

function ConflictBanner({
  onReload,
  isReloading,
}: {
  onReload: () => void
  isReloading?: boolean
}) {
  return (
    <div
      role="alert"
      className="border-warning/40 bg-warning/10 flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-medium">Someone else saved this document.</p>
          <p className="text-muted-foreground">
            Reload to get the latest version. Your unsaved edits will be replaced, so note them down
            first if you need them.
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onReload}
        disabled={isReloading}
        className="shrink-0"
      >
        <RefreshCw className={isReloading ? 'animate-spin' : undefined} aria-hidden="true" />
        Reload
      </Button>
    </div>
  )
}

export function GlobalEditorSkeleton({ label }: { label: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-5" aria-busy="true" aria-label={label}>
      <div className="space-y-6 lg:col-span-3">
        <Skeleton className="h-64 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
      <div className="space-y-4 lg:col-span-2">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  )
}
