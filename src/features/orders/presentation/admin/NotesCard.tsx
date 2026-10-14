import { Loader2, StickyNote } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { useUpdateAdminNotes } from '../../application/admin'
import type { Order } from '../../domain/entities'

interface NotesCardProps {
  order: Order
}

export function NotesCard({ order }: NotesCardProps) {
  const id = useId()
  const updateNotes = useUpdateAdminNotes()
  const [notes, setNotes] = useState(order.adminNotes)
  const isDirty = notes !== order.adminNotes

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <StickyNote className="text-muted-foreground size-4" aria-hidden="true" />
          Internal notes
        </CardTitle>
        <CardDescription>Visible to staff only, never to the customer.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            updateNotes.mutate({ id: order.id, notes: notes.trim() })
          }}
        >
          <Label htmlFor={id} className="sr-only">
            Admin notes
          </Label>
          <Textarea
            id={id}
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Packing instructions, customer calls, exceptions…"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs" aria-live="polite">
              {isDirty ? 'Unsaved changes' : ''}
            </span>
            <Button type="submit" size="sm" disabled={!isDirty || updateNotes.isPending}>
              {updateNotes.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Save notes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
