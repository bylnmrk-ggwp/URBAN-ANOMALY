import { ErrorState } from '@/components/common/ErrorState'
import { Form } from '@/components/ui/form'
import { UnsavedChangesGuard } from '@/features/products/presentation/admin/UnsavedChangesGuard'

import { useDraftDocument, type DraftDocumentState } from '../../application/useDraftDocument'
import { GLOBAL_KEYS } from '../../domain/documents'
import { themeContentSchema, type ThemeContent } from '../../domain/theme'
import { DraftActions } from '../globals/DraftActions'
import { GlobalEditorLayout, GlobalEditorSkeleton } from '../globals/GlobalEditorLayout'
import { useGlobalDraftForm } from '../globals/useGlobalDraftForm'
import { ThemeForm } from './ThemeForm'
import { ThemePreviewCard } from './ThemePreviewCard'

export function ThemeEditor() {
  const doc = useDraftDocument('theme', GLOBAL_KEYS.theme)

  if (doc.isLoading) return <GlobalEditorSkeleton label="Loading theme" />
  if (doc.error || !doc.draft) {
    return (
      <ErrorState
        title="Could not load theme"
        error={doc.error}
        onRetry={() => void doc.reload()}
      />
    )
  }
  return <Loaded doc={doc} initial={doc.draft} />
}

function Loaded({ doc, initial }: { doc: DraftDocumentState<'theme'>; initial: ThemeContent }) {
  const { form, isDirty, saveDraft, publishDraft, discardChanges } = useGlobalDraftForm(
    doc,
    themeContentSchema,
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
          form={<ThemeForm form={form} />}
          preview={<ThemePreviewCard theme={live} />}
          actions={
            <DraftActions
              subject="theme"
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
