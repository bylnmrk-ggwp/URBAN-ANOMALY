import { FileX2 } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { LoadingState } from '@/components/common/LoadingState'
import { Button } from '@/components/ui/button'
import { UnsavedChangesGuard } from '@/features/products/presentation/admin/UnsavedChangesGuard'
import { useIsDesktop } from '@/hooks/useMediaQuery'

import { createPreviewToken, previewPathFor } from '../../application/previewBridge'
import { useDraftDocument } from '../../application/useDraftDocument'
import type { DocumentKey } from '../../domain/documents'
import type { PageContent } from '../../domain/sections'
import type { PreviewDevice } from './devices'
import { invalidSectionLabels, updateSection, validateDraft } from './draftOps'
import { EditorPanels } from './EditorPanels'
import { PageSettingsForm } from './PageSettingsForm'
import { ConflictBanner, PublishBar } from './PublishBar'
import { documentStatus } from './documentStatus'
import { PublishDialog } from './PublishDialog'
import { RevisionsSheet } from './RevisionsSheet'
import { ScheduleDialog } from './ScheduleDialog'

interface EditorShellProps {
  docKey: DocumentKey
}

/** Visual page editor: publish bar, section panel and live storefront preview. */
export function EditorShell({ docKey }: EditorShellProps) {
  const state = useDraftDocument('page', docKey)
  const {
    document,
    draft,
    setDraft,
    isDirty,
    save,
    publish,
    schedule,
    cancelSchedule,
    conflict,
    reload,
    discard,
  } = state
  const isDesktop = useIsDesktop()
  const [token] = useState(() => createPreviewToken())

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [reloading, setReloading] = useState(false)

  // Section forms are keyed on this so they re-initialise whenever local edits are dropped
  // (save, discard, reload, restore) and the draft is replaced from the server.
  const [epoch, setEpoch] = useState(0)
  const [wasDirty, setWasDirty] = useState(isDirty)
  if (wasDirty !== isDirty) {
    setWasDirty(isDirty)
    if (!isDirty) setEpoch((e) => e + 1)
  }
  const formKey = `${document?.draftVersion ?? 0}:${epoch}`

  const validation = useMemo(() => (draft ? validateDraft(draft) : null), [draft])
  const changeDraft = useCallback((next: PageContent) => setDraft(() => next), [setDraft])
  const handleSelectFromPreview = useCallback((id: string) => setSelectedId(id), [])

  /** Publishing and scheduling both need a valid draft; toasts the errors and returns false. */
  const ensureValid = () => {
    if (!draft || !validation) return false
    if (!validation.isValid) {
      const labels = invalidSectionLabels(draft, validation)
      const detail = labels.length ? `Fix: ${labels.join(', ')}` : validation.pageErrors.join('; ')
      toast.error('Some sections have errors.', { description: detail })
      return false
    }
    return true
  }
  const handlePublishClick = () => {
    if (ensureValid()) setPublishOpen(true)
  }
  const handleScheduleClick = () => {
    if (ensureValid()) setScheduleOpen(true)
  }

  const handleReload = async () => {
    setReloading(true)
    try {
      await reload()
    } finally {
      setReloading(false)
    }
  }

  if (state.isLoading) return <LoadingState fullPage />
  if (state.error) {
    return (
      <ErrorState
        title="Could not load this page"
        error={state.error}
        onRetry={() => void handleReload()}
        isRetrying={reloading}
      />
    )
  }
  if (!document || !draft || !validation) {
    return (
      <EmptyState
        icon={FileX2}
        title="Page not found"
        description="This document does not exist or was deleted."
        action={
          <Button asChild>
            <Link to={routes.admin.content}>Back to Content</Link>
          </Button>
        }
      />
    )
  }

  const selected = draft.sections.find((s) => s.id === selectedId) ?? null

  return (
    <div className="-m-4 flex flex-col sm:-m-6 lg:-m-8 lg:h-[calc(100dvh-4rem)]">
      <UnsavedChangesGuard shouldBlock={() => isDirty} />

      <PublishBar
        title={document.title}
        status={documentStatus(document, isDirty)}
        isDirty={isDirty}
        isSaving={save.isPending}
        isPublishing={publish.isPending}
        scheduledAt={document.scheduledAt}
        isScheduling={schedule.isPending}
        isCancellingSchedule={cancelSchedule.isPending}
        livePath={previewPathFor(docKey)}
        device={device}
        onDeviceChange={setDevice}
        onSave={() => save.mutate()}
        onPublish={handlePublishClick}
        onSchedule={handleScheduleClick}
        onCancelSchedule={() => cancelSchedule.mutate()}
        onDiscard={discard}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenPageSettings={() => setSettingsOpen(true)}
      />
      {conflict ? (
        <ConflictBanner onReload={() => void handleReload()} isReloading={reloading} />
      ) : null}

      <EditorPanels
        docKey={docKey}
        token={token}
        draft={draft}
        device={device}
        selected={selected}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onSelectFromPreview={handleSelectFromPreview}
        onChangeDraft={changeDraft}
        onChangeSection={(section) => setDraft((current) => updateSection(current, section))}
        sectionErrors={validation.sectionErrors}
        formKey={formKey}
        isDesktop={isDesktop}
      />

      <PageSettingsForm
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        content={draft}
        onChange={(settings) => setDraft((current) => ({ ...current, ...settings }))}
      />
      <RevisionsSheet open={historyOpen} onOpenChange={setHistoryOpen} state={state} />
      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        title={document.title}
        willSaveFirst={isDirty}
        isPending={publish.isPending}
        onConfirm={(note) => publish.mutate(note, { onSuccess: () => setPublishOpen(false) })}
      />
      <ScheduleDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        title={document.title}
        willSaveFirst={isDirty}
        isPending={schedule.isPending}
        onConfirm={(at) => schedule.mutate(at, { onSuccess: () => setScheduleOpen(false) })}
      />
    </div>
  )
}
