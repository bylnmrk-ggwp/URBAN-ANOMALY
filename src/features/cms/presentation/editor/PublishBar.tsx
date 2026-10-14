import {
  CalendarClock,
  ExternalLink,
  History,
  Loader2,
  RefreshCw,
  Settings2,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { DeviceSwitcher } from './DeviceSwitcher'
import type { PreviewDevice } from './devices'
import { DocumentStatusBadge } from './DocumentStatusBadge'
import type { DocumentStatus } from './documentStatus'
import { ScheduledBadge } from './ScheduledBadge'

interface PublishBarProps {
  title: string
  status: DocumentStatus
  isDirty: boolean
  isSaving: boolean
  isPublishing: boolean
  /** Pending scheduled publish (ISO), or null. */
  scheduledAt: string | null
  isScheduling: boolean
  isCancellingSchedule: boolean
  livePath: string
  device: PreviewDevice
  onDeviceChange: (device: PreviewDevice) => void
  onSave: () => void
  onPublish: () => void
  onSchedule: () => void
  onCancelSchedule: () => void
  onDiscard: () => void
  onOpenHistory: () => void
  onOpenPageSettings: () => void
}

function IconAction({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function PublishBar({
  title,
  status,
  isDirty,
  isSaving,
  isPublishing,
  scheduledAt,
  isScheduling,
  isCancellingSchedule,
  livePath,
  device,
  onDeviceChange,
  onSave,
  onPublish,
  onSchedule,
  onCancelSchedule,
  onDiscard,
  onOpenHistory,
  onOpenPageSettings,
}: PublishBarProps) {
  const busy = isSaving || isPublishing || isScheduling || isCancellingSchedule
  const canSchedule = isDirty || status !== 'published'
  return (
    <div className="bg-background flex flex-wrap items-center gap-2 border-b px-3 py-2 sm:px-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        <DocumentStatusBadge status={status} />
        {scheduledAt ? (
          <span className="inline-flex items-center gap-0.5">
            <ScheduledBadge scheduledAt={scheduledAt} />
            <IconAction label="Cancel scheduled publish">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11 lg:size-7"
                aria-label="Cancel scheduled publish"
                disabled={busy}
                onClick={onCancelSchedule}
              >
                {isCancellingSchedule ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <X aria-hidden="true" />
                )}
              </Button>
            </IconAction>
          </span>
        ) : null}
        {isDirty ? (
          <span className="text-muted-foreground hidden text-xs sm:inline" aria-live="polite">
            Unsaved
          </span>
        ) : null}
      </div>

      <DeviceSwitcher value={device} onChange={onDeviceChange} className="hidden md:inline-flex" />

      <div className="flex items-center gap-1">
        <IconAction label="Page settings">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 lg:size-9"
            aria-label="Page settings"
            onClick={onOpenPageSettings}
          >
            <Settings2 aria-hidden="true" />
          </Button>
        </IconAction>
        <IconAction label="History">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 lg:size-9"
            aria-label="History"
            onClick={onOpenHistory}
          >
            <History aria-hidden="true" />
          </Button>
        </IconAction>
        <IconAction label="Open live page">
          <Button asChild variant="ghost" size="icon" className="size-11 lg:size-9">
            <a href={livePath} target="_blank" rel="noreferrer" aria-label="Open live page">
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </IconAction>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          className="h-11 lg:h-9"
          disabled={!isDirty || busy}
          onClick={onDiscard}
        >
          Discard
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 lg:h-9"
          disabled={!isDirty || busy}
          onClick={onSave}
        >
          {isSaving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Save draft
        </Button>
        <IconAction label="Schedule publish">
          <Button
            type="button"
            variant="outline"
            className="h-11 lg:h-9"
            disabled={!canSchedule || busy}
            aria-label="Schedule publish"
            onClick={onSchedule}
          >
            {isScheduling ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <CalendarClock aria-hidden="true" />
            )}
            <span className="hidden sm:inline">Schedule</span>
          </Button>
        </IconAction>
        <Button type="button" className="h-11 lg:h-9" disabled={busy} onClick={onPublish}>
          {isPublishing ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Publish
        </Button>
      </div>
    </div>
  )
}

interface ConflictBannerProps {
  onReload: () => void
  isReloading: boolean
}

export function ConflictBanner({ onReload, isReloading }: ConflictBannerProps) {
  return (
    <div
      role="alert"
      className="border-warning/40 bg-warning/10 flex flex-wrap items-center gap-3 border-b px-4 py-2 text-sm"
    >
      <p className="flex-1">
        <span className="font-medium">This page changed elsewhere.</span> Your edits were not saved.
        Reload to get the latest draft, then reapply your changes.
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onReload} disabled={isReloading}>
        <RefreshCw className={isReloading ? 'animate-spin' : undefined} aria-hidden="true" />
        Reload
      </Button>
    </div>
  )
}
