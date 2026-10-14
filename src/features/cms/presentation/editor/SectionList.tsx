import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { LayoutList } from 'lucide-react'
import { useState } from 'react'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'

import type { PageContent, SectionType } from '../../domain/sections'
import { AddSectionMenu } from './AddSectionMenu'
import {
  addSection,
  duplicateSection,
  moveSection,
  removeSection,
  reorderSections,
  sectionTitle,
  toggleSectionVisible,
} from './draftOps'
import { SectionRow } from './SectionRow'

export interface SectionListProps {
  content: PageContent
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (next: PageContent) => void
  /** Validation messages per section id; invalid rows show a red dot. */
  errors?: Record<string, string[]>
}

/** Ordered, sortable list of page sections. Fully controlled; every edit goes through `onChange`. */
export function SectionList({
  content,
  selectedId,
  onSelect,
  onChange,
  errors = {},
}: SectionListProps) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = content.sections.map((s) => s.id)
  const deleting = content.sections.find((s) => s.id === pendingDelete) ?? null

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onChange(reorderSections(content, String(active.id), String(over.id)))
  }

  const handleAdd = (type: SectionType) => {
    const result = addSection(content, type)
    onChange(result.content)
    onSelect(result.newId)
  }

  const handleDuplicate = (id: string) => {
    const result = duplicateSection(content, id)
    onChange(result.content)
    onSelect(result.newId)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    onChange(removeSection(content, pendingDelete))
    if (selectedId === pendingDelete) onSelect(null)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Sections</h2>
        <AddSectionMenu onAdd={handleAdd} className="h-9 lg:h-8 lg:px-2.5 lg:text-xs" />
      </div>

      {content.sections.length === 0 ? (
        <EmptyState
          icon={LayoutList}
          title="No sections yet"
          description="Add a section to start building this page."
          className="py-10"
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <ol aria-label="Page sections" className="space-y-1.5">
              {content.sections.map((section, index) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  index={index}
                  count={content.sections.length}
                  selected={section.id === selectedId}
                  errors={errors[section.id]}
                  onSelect={() => onSelect(section.id)}
                  onMove={(direction) => onChange(moveSection(content, section.id, direction))}
                  onToggleVisible={() => onChange(toggleSectionVisible(content, section.id))}
                  onDuplicate={() => handleDuplicate(section.id)}
                  onDelete={() => setPendingDelete(section.id)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this section?"
        description={
          deleting
            ? `"${sectionTitle(deleting)}" will be removed from the draft. You can still discard the draft or restore an earlier version.`
            : ''
        }
        confirmLabel="Delete section"
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  )
}
