import { Monitor, Smartphone, Tablet, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import type { PreviewDevice } from './devices'

const DEVICES: { id: PreviewDevice; label: string; icon: LucideIcon }[] = [
  { id: 'mobile', label: 'Mobile (390px)', icon: Smartphone },
  { id: 'tablet', label: 'Tablet (768px)', icon: Tablet },
  { id: 'desktop', label: 'Desktop', icon: Monitor },
]

interface DeviceSwitcherProps {
  value: PreviewDevice
  onChange: (device: PreviewDevice) => void
  className?: string
}

export function DeviceSwitcher({ value, onChange, className }: DeviceSwitcherProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Preview device"
      className={cn('bg-muted inline-flex items-center gap-0.5 rounded-md p-0.5', className)}
    >
      {DEVICES.map(({ id, label, icon: Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              role="radio"
              aria-checked={value === id}
              aria-label={label}
              variant="ghost"
              size="icon-sm"
              className={cn(
                'size-9 lg:size-8',
                value === id && 'bg-background text-foreground hover:bg-background shadow-xs',
              )}
              onClick={() => onChange(id)}
            >
              <Icon aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
