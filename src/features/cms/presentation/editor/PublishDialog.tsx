import { Loader2 } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PublishDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** True when unsaved edits will be saved as part of publishing. */
  willSaveFirst: boolean
  isPending: boolean
  onConfirm: (note: string) => void
}

export function PublishDialog({
  open,
  onOpenChange,
  title,
  willSaveFirst,
  isPending,
  onConfirm,
}: PublishDialogProps) {
  const [note, setNote] = useState('')
  const noteId = useId()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return
        if (!next) setNote('')
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish “{title}”?</DialogTitle>
          <DialogDescription>
            {willSaveFirst ? 'Your draft is saved first, then it ' : 'The current draft '}
            goes live for every visitor. A version is added to the history so you can restore it
            later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={noteId}>Note (optional)</Label>
          <Textarea
            id={noteId}
            rows={2}
            maxLength={200}
            placeholder="What changed?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={() => onConfirm(note.trim())}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
