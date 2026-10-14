import { arrayMove } from '@dnd-kit/sortable'

import {
  createSection,
  newSectionId,
  pageContentSchema,
  SECTION_META,
  sectionSchema,
  type PageContent,
  type Section,
  type SectionType,
} from '../../domain/sections'

/** Pure, immutable operations the editor applies to a page draft. */

export function updateSection(content: PageContent, section: Section): PageContent {
  return {
    ...content,
    sections: content.sections.map((s) => (s.id === section.id ? section : s)),
  }
}

export function moveSection(
  content: PageContent,
  id: string,
  direction: 'up' | 'down',
): PageContent {
  const index = content.sections.findIndex((s) => s.id === id)
  const target = direction === 'up' ? index - 1 : index + 1
  if (index < 0 || target < 0 || target >= content.sections.length) return content
  return { ...content, sections: arrayMove(content.sections, index, target) }
}

export function reorderSections(
  content: PageContent,
  activeId: string,
  overId: string,
): PageContent {
  const from = content.sections.findIndex((s) => s.id === activeId)
  const to = content.sections.findIndex((s) => s.id === overId)
  if (from < 0 || to < 0 || from === to) return content
  return { ...content, sections: arrayMove(content.sections, from, to) }
}

export function toggleSectionVisible(content: PageContent, id: string): PageContent {
  return {
    ...content,
    sections: content.sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
  }
}

/** Inserts a copy right after the original. Returns the new id for selection. */
export function duplicateSection(
  content: PageContent,
  id: string,
): { content: PageContent; newId: string } {
  const index = content.sections.findIndex((s) => s.id === id)
  const original = content.sections[index]
  if (!original) return { content, newId: id }
  const copy: Section = { ...structuredClone(original), id: newSectionId(), anchor: '' }
  const sections = [...content.sections]
  sections.splice(index + 1, 0, copy)
  return { content: { ...content, sections }, newId: copy.id }
}

export function removeSection(content: PageContent, id: string): PageContent {
  return { ...content, sections: content.sections.filter((s) => s.id !== id) }
}

export function addSection(
  content: PageContent,
  type: SectionType,
): { content: PageContent; newId: string } {
  const section = createSection(type)
  return { content: { ...content, sections: [...content.sections, section] }, newId: section.id }
}

export interface DraftValidation {
  /** Error messages per section id; only invalid sections are present. */
  sectionErrors: Record<string, string[]>
  /** Page-level (title, SEO) errors. */
  pageErrors: string[]
  isValid: boolean
}

/** Validates the whole draft against the content schema, attributing issues to sections. */
export function validateDraft(content: PageContent): DraftValidation {
  const sectionErrors: Record<string, string[]> = {}
  for (const section of content.sections) {
    const result = sectionSchema.safeParse(section)
    if (!result.success) {
      sectionErrors[section.id] = result.error.issues.map(
        (issue) => `${issue.path.join('.') || 'section'}: ${issue.message}`,
      )
    }
  }
  const page = pageContentSchema.omit({ sections: true }).safeParse(content)
  const pageErrors = page.success
    ? []
    : page.error.issues.map((issue) => `${issue.path.join('.') || 'page'}: ${issue.message}`)
  return {
    sectionErrors,
    pageErrors,
    isValid: pageErrors.length === 0 && Object.keys(sectionErrors).length === 0,
  }
}

/** Human labels of the sections that currently fail validation, for toasts. */
export function invalidSectionLabels(content: PageContent, validation: DraftValidation): string[] {
  return content.sections.filter((s) => validation.sectionErrors[s.id]).map((s) => sectionTitle(s))
}

export function sectionTitle(section: Section): string {
  const title = 'title' in section ? section.title.trim() : ''
  return title || SECTION_META[section.type].label
}
