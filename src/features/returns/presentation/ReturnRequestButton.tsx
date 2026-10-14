import { Undo2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import type { Order } from '@/features/orders/domain/entities'

import { ReturnRequestDialog } from './ReturnRequestDialog'

interface ReturnRequestButtonProps {
  order: Order
}

export function ReturnRequestButton({ order }: ReturnRequestButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
        <Undo2 aria-hidden="true" />
        Request a return
      </Button>
      {open ? <ReturnRequestDialog order={order} open={open} onOpenChange={setOpen} /> : null}
    </>
  )
}
