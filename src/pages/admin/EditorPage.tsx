import { FileX2 } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router'

import { routes } from '@/app/router/routes'
import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { GLOBAL_KEYS, parseDocumentKey, type DocumentKey } from '@/features/cms/domain/documents'
import { EditorShell } from '@/features/cms/presentation/editor/EditorShell'

/** Global documents have dedicated editors; the visual editor handles `page:*` keys only. */
const GLOBAL_EDITOR_ROUTES: Record<string, string> = {
  [GLOBAL_KEYS.navigation]: routes.admin.navigation,
  [GLOBAL_KEYS.theme]: routes.admin.theme,
  [GLOBAL_KEYS.announcement]: routes.admin.announcement,
}

export default function EditorPage() {
  const [params] = useSearchParams()
  const raw = params.get('doc') ?? ''
  const parsed = parseDocumentKey(raw)

  if (parsed && parsed.kind !== 'page') {
    const target = GLOBAL_EDITOR_ROUTES[raw]
    if (target) return <Navigate to={target} replace />
  }

  if (!parsed || parsed.kind !== 'page' || !parsed.slug) {
    return (
      <EmptyState
        icon={FileX2}
        title="No page selected"
        description="Pick a page from the Content list to open it in the editor."
        action={
          <Button asChild>
            <Link to={routes.admin.content}>Go to Content</Link>
          </Button>
        }
      />
    )
  }

  const docKey = raw as DocumentKey
  // Remount the whole editor when the document changes so local state never leaks across pages.
  return <EditorShell key={docKey} docKey={docKey} />
}
