import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { SECTION_META, type SectionType } from '../../domain/sections'

interface AddSectionMenuProps {
  onAdd: (type: SectionType) => void
  className?: string
}

const SECTION_TYPES = Object.keys(SECTION_META) as SectionType[]

export function AddSectionMenu({ onAdd, className }: AddSectionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" className={className}>
          <Plus aria-hidden="true" />
          Add section
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>Section type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SECTION_TYPES.map((type) => (
          <DropdownMenuItem
            key={type}
            onSelect={() => onAdd(type)}
            className="flex-col items-start gap-0.5 py-2"
          >
            <span className="font-medium">{SECTION_META[type].label}</span>
            <span className="text-muted-foreground text-xs">{SECTION_META[type].description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
