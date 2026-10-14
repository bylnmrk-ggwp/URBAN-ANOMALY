import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

import { SECTION_META, type Section } from '../../domain/sections'
import { sectionTitle } from './draftOps'

interface SectionRowProps {
  section: Section
  index: number
  count: number
  selected: boolean
  errors: string[] | undefined
  onSelect: () => void
  onMove: (direction: 'up' | 'down') => void
  onToggleVisible: () => void
  onDuplicate: () => void
  onDelete: () => void
}

/** Touch targets are 44px on mobile and 36px on desktop. */
const iconButton = 'size-11 lg:size-9'

export function SectionRow({
  section,
  index,
  count,
  selected,
  errors,
  onSelect,
  onMove,
  onToggleVisible,
  onDuplicate,
  onDelete,
}: SectionRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const label = sectionTitle(section)
  const typeLabel = SECTION_META[section.type].label
  const hasErrors = Boolean(errors && errors.length > 0)

  return (
    <li
      ref={setNodeRef}
      style={style}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'bg-background group flex items-center gap-1 rounded-md border pr-1 pl-0.5 transition-colors',
        selected ? 'border-primary ring-primary/20 ring-2' : 'hover:bg-muted/60',
        isDragging && 'relative z-10 shadow-sm',
        !section.visible && 'opacity-70',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Reorder"
        className={cn(
          'text-muted-foreground hover:text-foreground flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md active:cursor-grabbing',
          iconButton,
        )}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center py-1.5 text-left lg:min-h-9"
      >
        <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase">
          {typeLabel}
          {hasErrors ? (
            <span
              role="img"
              aria-label="Has errors"
              title={errors?.join('\n')}
              className="bg-destructive inline-block size-1.5 rounded-full"
            />
          ) : null}
          {!section.visible ? <span className="tracking-normal normal-case">· Hidden</span> : null}
        </span>
        <span className="w-full truncate text-sm font-medium">{label}</span>
      </button>

      <div className="hidden shrink-0 items-center lg:flex">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move up: ${label}`}
          disabled={index === 0}
          onClick={() => onMove('up')}
        >
          <ChevronUp aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Move down: ${label}`}
          disabled={index === count - 1}
          onClick={() => onMove('down')}
        >
          <ChevronDown aria-hidden="true" />
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconButton}
        aria-label={section.visible ? `Hide section: ${label}` : `Show section: ${label}`}
        aria-pressed={section.visible}
        onClick={onToggleVisible}
      >
        {section.visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={iconButton}
            aria-label={`More actions: ${label}`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem
            onSelect={() => onMove('up')}
            disabled={index === 0}
            className="lg:hidden"
          >
            <ChevronUp aria-hidden="true" />
            Move up
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onMove('down')}
            disabled={index === count - 1}
            className="lg:hidden"
          >
            <ChevronDown aria-hidden="true" />
            Move down
          </DropdownMenuItem>
          <DropdownMenuSeparator className="lg:hidden" />
          <DropdownMenuItem onSelect={onDuplicate}>
            <Copy aria-hidden="true" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
