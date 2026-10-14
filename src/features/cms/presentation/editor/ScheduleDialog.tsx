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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { defaultScheduleValue, toLocalInputValue } from './scheduleTime'

interface ScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** True when unsaved edits will be saved as part of scheduling. */
  willSaveFirst: boolean
  isPending: boolean
  /** Receives the chosen moment as an ISO string. */
  onConfirm: (at: string) => void
}

export function ScheduleDialog({
  open,
  onOpenChange,
  title,
  willSaveFirst,
  isPending,
  onConfirm,
}: ScheduleDialogProps) {
  const [value, setValue] = useState(() => defaultScheduleValue())
  const [error, setError] = useState<string | null>(null)
  const inputId = useId()

  const confirm = () => {
    const time = new Date(value).getTime()
    if (!value || !Number.isFinite(time)) {
      setError('Enter a date and time.')
      return
    }
    if (time <= Date.now()) {
      setError('Pick a time in the future.')
      return
    }
    setError(null)
    onConfirm(new Date(time).toISOString())
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending) return
        if (next) {
          setValue(defaultScheduleValue())
          setError(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule “{title}”</DialogTitle>
          <DialogDescription>
            {willSaveFirst ? 'Your draft is saved first, then it ' : 'The current draft '}
            goes live automatically at the time you pick. You can cancel until then.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor={inputId}>Publish at</Label>
          <Input
            id={inputId}
            type="datetime-local"
            min={toLocalInputValue(new Date())}
            value={value}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
            className="min-h-11"
          />
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">Times are in your local time zone.</p>
          )}
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
          <Button type="button" disabled={isPending} onClick={confirm}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
