import { useId } from 'react'

import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { SavedAddress } from '@/features/auth/domain/entities'
import { cn } from '@/lib/utils'

export const NEW_ADDRESS = 'new'

interface SavedAddressPickerProps {
  addresses: SavedAddress[]
  selectedId: string
  onSelect: (id: string) => void
}

export function SavedAddressPicker({ addresses, selectedId, onSelect }: SavedAddressPickerProps) {
  const id = useId()
  const options: { value: string; title: string; body: string | null; isDefault: boolean }[] = [
    ...addresses.map((address) => ({
      value: address.id,
      title: address.label,
      body: `${address.addressLine}, ${address.barangay}, ${address.city}, ${address.province} ${address.postalCode}`,
      isDefault: address.isDefault,
    })),
    { value: NEW_ADDRESS, title: 'Use a different address', body: null, isDefault: false },
  ]

  return (
    <RadioGroup
      value={selectedId}
      onValueChange={onSelect}
      aria-label="Saved addresses"
      className="gap-2"
    >
      {options.map((option) => {
        const inputId = `${id}-${option.value}`
        const checked = selectedId === option.value
        return (
          <Label
            key={option.value}
            htmlFor={inputId}
            className={cn(
              'flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-4 font-normal transition-colors',
              checked ? 'border-foreground' : 'hover:border-muted-foreground/50',
            )}
          >
            <RadioGroupItem id={inputId} value={option.value} className="mt-0.5" />
            <span className="flex-1 space-y-0.5">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {option.title}
                {option.isDefault ? <Badge variant="outline">Default</Badge> : null}
              </span>
              {option.body ? (
                <span className="text-muted-foreground block text-sm">{option.body}</span>
              ) : null}
            </span>
          </Label>
        )
      })}
    </RadioGroup>
  )
}
