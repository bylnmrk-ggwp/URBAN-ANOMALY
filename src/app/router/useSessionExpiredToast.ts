import { useEffect } from 'react'
import { toast } from 'sonner'

import type { AuthStatus } from '@/features/auth/domain/entities'

const TOAST_ID = 'session-expired'

/** Shows the expiry notice once per expiry; the stable toast id dedupes repeat renders. */
export function useSessionExpiredToast(status: AuthStatus) {
  useEffect(() => {
    if (status !== 'expired') return
    toast.error('Your session has expired. Please sign in again.', { id: TOAST_ID })
  }, [status])
}
