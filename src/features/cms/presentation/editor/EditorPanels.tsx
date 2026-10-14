import { X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

import type { DocumentKey } from '../../domain/documents'
import { SECTION_META, type PageContent, type Section } from '../../domain/sections'
import { DeviceSwitcher } from './DeviceSwitcher'
import type { PreviewDevice } from './devices'
import { sectionTitle } from './draftOps'
import { PreviewFrame } from './PreviewFrame'
import { SectionForm } from './SectionForm'
import { SectionList } from './SectionList'

type MobileTab = 'sections' | 'preview'

interface EditorPanelsProps {
  docKey: DocumentKey
  token: string
  draft: PageContent
  device: PreviewDevice
  selected: Section | null
  selectedId: string | null
  onSelect: (id: string | null) => void
  onSelectFromPreview: (id: string) => void
  onChangeDraft: (next: PageContent) => void
  onChangeSection: (section: Section) => void
  sectionErrors: Record<string, string[]>
  /** Changes whenever the draft is replaced from the server, remounting the section form. */
  formKey: string
  isDesktop: boolean
}

/**
 * Two-pane body of the editor. Desktop: 380px section panel + preview side by side, with the
 * selected section's form under the list. Mobile: tabs switch panes and the form opens in a
 * bottom sheet.
 */
export function EditorPanels({
  docKey,
  token,
  draft,
  device,
  selected,
  selectedId,
  onSelect,
  onSelectFromPreview,
  onChangeDraft,
  onChangeSection,
  sectionErrors,
  formKey,
  isDesktop,
}: EditorPanelsProps) {
  const [tab, setTab] = useState<MobileTab>('sections')
  const [mobileDevice, setMobileDevice] = useState<PreviewDevice>('mobile')

  const form = selected ? (
    <SectionForm key={`${selected.id}:${formKey}`} section={selected} onChange={onChangeSection} />
  ) : null

  return (
    <>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v === 'preview' ? 'preview' : 'sections')}
        className="border-b px-3 py-2 lg:hidden"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sections" className="min-h-10">
            Sections
          </TabsTrigger>
          <TabsTrigger value="preview" className="min-h-10">
            Preview
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          aria-label="Sections panel"
          className={cn(
            'bg-card min-h-0 border-r lg:w-[380px] lg:shrink-0 lg:overflow-y-auto',
            tab !== 'sections' && 'hidden lg:block',
          )}
        >
          <div className="space-y-5 p-3 sm:p-4">
            <SectionList
              content={draft}
              selectedId={selectedId}
              onSelect={onSelect}
              onChange={onChangeDraft}
              errors={sectionErrors}
            />
            {isDesktop && selected ? (
              <>
                <Separator />
                <section aria-label="Section settings" className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                        {SECTION_META[selected.type].label}
                      </p>
                      <h3 className="truncate text-sm font-semibold">{sectionTitle(selected)}</h3>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close section settings"
                      onClick={() => onSelect(null)}
                    >
                      <X aria-hidden="true" />
                    </Button>
                  </div>
                  {form}
                </section>
              </>
            ) : null}
          </div>
        </aside>

        <section
          aria-label="Preview"
          className={cn(
            'bg-muted flex min-h-[70dvh] flex-1 flex-col lg:min-h-0',
            tab !== 'preview' && 'hidden lg:flex',
          )}
        >
          <div className="flex justify-end px-3 pt-3 md:hidden">
            <DeviceSwitcher value={mobileDevice} onChange={setMobileDevice} />
          </div>
          <PreviewFrame
            docKey={docKey}
            token={token}
            draft={draft}
            device={isDesktop ? device : mobileDevice}
            selectedId={selectedId}
            onSelect={onSelectFromPreview}
            className="flex-1"
          />
        </section>
      </div>

      {!isDesktop ? (
        <Sheet open={selected !== null} onOpenChange={(open) => !open && onSelect(null)}>
          <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto rounded-t-lg">
            <SheetHeader>
              <SheetTitle>{selected ? sectionTitle(selected) : 'Section'}</SheetTitle>
              <SheetDescription>
                {selected ? SECTION_META[selected.type].description : ''}
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-8">{form}</div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  )
}
