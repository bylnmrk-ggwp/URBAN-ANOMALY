import { useCallback, useContext } from 'react'
import { UNSAFE_DataRouterContext, useBeforeUnload, useBlocker } from 'react-router'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'

interface UnsavedChangesGuardProps {
  /** Evaluated when a navigation starts, so callers can read refs or form state lazily. */
  shouldBlock: () => boolean
}

/**
 * Blocks in-app navigation and tab closes while a form has unsaved changes.
 * `useBlocker` only works inside a data router; when the app is mounted with a
 * declarative `<Routes>` tree we still warn on tab close but cannot intercept
 * client-side navigation, so the blocker half is mounted conditionally.
 */
export function UnsavedChangesGuard({ shouldBlock }: UnsavedChangesGuardProps) {
  const dataRouter = useContext(UNSAFE_DataRouterContext)

  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (shouldBlock()) event.preventDefault()
      },
      [shouldBlock],
    ),
  )

  if (!dataRouter) return null
  return <RouterBlocker shouldBlock={shouldBlock} />
}

function RouterBlocker({ shouldBlock }: UnsavedChangesGuardProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      currentLocation.pathname !== nextLocation.pathname && shouldBlock(),
  )

  return (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset()
      }}
      title="Discard unsaved changes?"
      description="You have changes that have not been saved. If you leave this page they will be lost."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      destructive
      onConfirm={() => {
        if (blocker.state === 'blocked') blocker.proceed()
      }}
    />
  )
}
