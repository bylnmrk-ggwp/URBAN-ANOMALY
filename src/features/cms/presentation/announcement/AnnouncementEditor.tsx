import { ErrorState } from '@/components/common/ErrorState'
import { Form } from '@/components/ui/form'
import { UnsavedChangesGuard } from '@/features/products/presentation/admin/UnsavedChangesGuard'

import { useDraftDocument, type DraftDocumentState } from '../../application/useDraftDocument'
import { GLOBAL_KEYS } from '../../domain/documents'
import { announcementContentSchema, type AnnouncementContent } from '../../domain/navigation'
import { DraftActions } from '../globals/DraftActions'
import { GlobalEditorLayout, GlobalEditorSkeleton } from '../globals/GlobalEditorLayout'
import { useGlobalDraftForm } from '../globals/useGlobalDraftForm'
import { AnnouncementForm } from './AnnouncementForm'
import { AnnouncementPreview } from './AnnouncementPreview'

export function AnnouncementEditor() {
  const doc = useDraftDocument('announcement', GLOBAL_KEYS.announcement)

  if (doc.isLoading) return <GlobalEditorSkeleton label="Loading announcement bar" />
  if (doc.error || !doc.draft) {
    return (
      <ErrorState
        title="Could not load the announcement bar"
        error={doc.error}
        onRetry={() => void doc.reload()}
      />
    )
  }
  return <Loaded doc={doc} initial={doc.draft} />
}

function Loaded({
  doc,
  initial,
}: {
  doc: DraftDocumentState<'announcement'>
  initial: AnnouncementContent
}) {
  const { form, isDirty, saveDraft, publishDraft, discardChanges } = useGlobalDraftForm(
    doc,
    announcementContentSchema,
    initial,
  )
  const live = form.watch()

  return (
    <Form {...form}>
      <UnsavedChangesGuard shouldBlock={() => doc.isDirty || form.formState.isDirty} />
      <form onSubmit={(e) => e.preventDefault()} noValidate>
        <GlobalEditorLayout
          conflict={doc.conflict}
          onReload={() => void doc.reload()}
          form={<AnnouncementForm form={form} />}
          preview={<AnnouncementPreview content={live} />}
          actions={
            <DraftActions
              subject="announcement bar"
              document={doc.document}
              isDirty={isDirty}
              isSaving={doc.save.isPending}
              isPublishing={doc.publish.isPending}
              onSave={() => void saveDraft()}
              onPublish={() => void publishDraft()}
              onDiscard={discardChanges}
            />
          }
        />
      </form>
    </Form>
  )
}
