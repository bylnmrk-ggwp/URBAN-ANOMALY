import { Loader2, Truck } from 'lucide-react'
import { useId, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useSetTracking } from '../../application/admin'
import type { Order } from '../../domain/entities'

const COURIERS = ['J&T Express', 'LBC', 'Ninja Van', 'Flash Express', 'Other'] as const
type Courier = (typeof COURIERS)[number]

function toCourierSelection(courier: string | undefined): { courier: Courier; other: string } {
  if (!courier) return { courier: 'J&T Express', other: '' }
  const known = COURIERS.find((c) => c === courier)
  return known ? { courier: known, other: '' } : { courier: 'Other', other: courier }
}

interface TrackingCardProps {
  order: Order
}

export function TrackingCard({ order }: TrackingCardProps) {
  const id = useId()
  const setTracking = useSetTracking()
  const initial = toCourierSelection(order.tracking?.courier)
  const [courier, setCourier] = useState<Courier>(initial.courier)
  const [otherCourier, setOtherCourier] = useState(initial.other)
  const [trackingNumber, setTrackingNumber] = useState(order.tracking?.trackingNumber ?? '')
  const [error, setError] = useState<string | null>(null)

  const resolvedCourier = courier === 'Other' ? otherCourier.trim() : courier
  const isDirty =
    resolvedCourier !== (order.tracking?.courier ?? '') ||
    trackingNumber.trim() !== (order.tracking?.trackingNumber ?? '')

  const save = () => {
    if (!resolvedCourier) {
      setError('Enter the courier name.')
      return
    }
    if (trackingNumber.trim().length < 4) {
      setError('Enter the tracking number.')
      return
    }
    setError(null)
    setTracking.mutate({
      id: order.id,
      tracking: { courier: resolvedCourier, trackingNumber: trackingNumber.trim() },
    })
  }

  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="text-muted-foreground size-4" aria-hidden="true" />
          Tracking
        </CardTitle>
        <CardDescription>Shown to the customer once the order is shipped.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-courier`}>Courier</Label>
            <Select
              value={courier}
              onValueChange={(v) => {
                const match = COURIERS.find((c) => c === v)
                if (match) setCourier(match)
              }}
            >
              <SelectTrigger id={`${id}-courier`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COURIERS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {courier === 'Other' ? (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-other`}>Courier name</Label>
              <Input
                id={`${id}-other`}
                value={otherCourier}
                onChange={(e) => setOtherCourier(e.target.value)}
                placeholder="Courier"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-number`}>Tracking number</Label>
            <Input
              id={`${id}-number`}
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. JT1234567890"
              className="font-mono"
              aria-invalid={Boolean(error)}
            />
            {error ? <p className="text-destructive text-xs">{error}</p> : null}
          </div>
          <Button type="submit" size="sm" disabled={setTracking.isPending || !isDirty}>
            {setTracking.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {order.tracking ? 'Update tracking' : 'Save tracking'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
