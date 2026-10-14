import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface SubmitButtonProps {
  isPending: boolean
  children: ReactNode
}

export function SubmitButton({ isPending, children }: SubmitButtonProps) {
  return (
    <Button type="submit" size="lg" className="w-full" disabled={isPending}>
      {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </Button>
  )
}
