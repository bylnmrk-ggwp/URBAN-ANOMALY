import { FileUp, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'

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
import type { Category } from '@/features/categories/domain/entities'
import { getErrorMessage } from '@/lib/errors'
import { pluralize } from '@/lib/format'

import { useImportProduct } from '../../application/admin'
import { PRODUCT_CSV_COLUMNS, csvRowsToProductInputs, parseCsv } from '../../domain/csv'
import type { ProductInput } from '../../domain/entities'
import { ImportPreviewTable, type ImportPreviewRow } from './ImportPreviewTable'

interface ImportProductsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
}

type Phase = 'pick' | 'preview' | 'importing' | 'done'

interface ParsedFile {
  rows: ImportPreviewRow[]
  inputs: Map<number, ProductInput>
}

function parseFile(text: string, categories: Category[]): ParsedFile {
  const parsed = parseCsv(text)
  const { valid, errors } = csvRowsToProductInputs(parsed, categories)
  const errorByRow = new Map(errors.map((e) => [e.row, e.message]))
  const inputs = new Map<number, ProductInput>()
  const validBySlug = new Map(valid.map((v) => [v.slug, v]))
  const rows: ImportPreviewRow[] = []
  const header = parsed[0] ?? []
  const slugAt = header.findIndex((h) => h.trim().toLowerCase() === 'slug')
  const nameAt = header.findIndex((h) => h.trim().toLowerCase() === 'name')

  parsed.slice(1).forEach((cells, i) => {
    const row = i + 1
    const slug = (slugAt >= 0 ? cells[slugAt] : '')?.trim() ?? ''
    const input = validBySlug.get(slug)
    const error = errorByRow.get(row) ?? null
    if (input && !error) inputs.set(row, input)
    rows.push({
      row,
      name: input?.name ?? (nameAt >= 0 ? cells[nameAt] : '')?.trim() ?? '',
      slug,
      basePrice: input?.basePrice ?? null,
      error,
      outcome: 'pending',
      resultMessage: null,
    })
  })
  const fileError = errorByRow.get(0)
  if (fileError)
    rows.unshift({
      row: 0,
      name: 'File',
      slug: '',
      basePrice: null,
      error: fileError,
      outcome: 'skipped',
      resultMessage: null,
    })
  return { rows, inputs }
}

export function ImportProductsDialog({
  open,
  onOpenChange,
  categories,
}: ImportProductsDialogProps) {
  const importer = useImportProduct()
  const [phase, setPhase] = useState<Phase>('pick')
  const [file, setFile] = useState<ParsedFile | null>(null)
  const [progress, setProgress] = useState(0)
  const cancelRef = useRef(false)

  const reset = () => {
    setPhase('pick')
    setFile(null)
    setProgress(0)
    cancelRef.current = false
  }

  const handleOpenChange = (next: boolean) => {
    if (phase === 'importing') return
    if (!next) reset()
    onOpenChange(next)
  }

  const onFile = async (picked: File | undefined) => {
    if (!picked) return
    const text = await picked.text()
    setFile(parseFile(text, categories))
    setPhase('preview')
  }

  const validCount = file?.inputs.size ?? 0
  const createdCount = file?.rows.filter((r) => r.outcome === 'created').length ?? 0

  const updateRow = (row: number, patch: Partial<ImportPreviewRow>) =>
    setFile((prev) =>
      prev
        ? { ...prev, rows: prev.rows.map((r) => (r.row === row ? { ...r, ...patch } : r)) }
        : prev,
    )

  const runImport = async () => {
    if (!file) return
    setPhase('importing')
    cancelRef.current = false
    const entries = [...file.inputs.entries()]
    let done = 0
    for (const [row, input] of entries) {
      if (cancelRef.current) {
        updateRow(row, { outcome: 'skipped' })
        continue
      }
      updateRow(row, { outcome: 'importing' })
      try {
        await importer.mutateAsync(input)
        updateRow(row, { outcome: 'created' })
      } catch (error) {
        updateRow(row, {
          outcome: 'failed',
          resultMessage: getErrorMessage(error, 'Could not create this product.'),
        })
      }
      done += 1
      setProgress(Math.round((done / entries.length) * 100))
    }
    await importer.invalidate()
    setPhase('done')
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import products from CSV</DialogTitle>
          <DialogDescription>
            Columns: <code className="font-mono text-xs">{PRODUCT_CSV_COLUMNS.join(', ')}</code>.
            Lists use <code className="font-mono text-xs">|</code> as separator; colors are{' '}
            <code className="font-mono text-xs">Name:#RRGGBB</code>. Export first to get a template.
          </DialogDescription>
        </DialogHeader>

        {phase === 'pick' ? (
          <div className="space-y-2">
            <Label htmlFor="products-csv-file">CSV file</Label>
            <Input
              id="products-csv-file"
              type="file"
              accept=".csv,text/csv"
              className="min-h-11 py-2"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </div>
        ) : null}

        {file ? (
          <div className="space-y-3">
            <p className="text-sm" role="status">
              {phase === 'done'
                ? `Imported ${pluralize(createdCount, 'product')}.`
                : `${pluralize(validCount, 'valid row')} of ${file.rows.filter((r) => r.row > 0).length} will be imported.`}
            </p>
            {phase === 'importing' || phase === 'done' ? (
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress}
                aria-label="Import progress"
                className="bg-muted h-2 w-full overflow-hidden rounded-full"
              >
                <div
                  className="bg-primary h-full transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
            <ImportPreviewTable rows={file.rows} />
          </div>
        ) : null}

        <DialogFooter>
          {phase === 'importing' ? (
            <Button type="button" variant="outline" onClick={() => (cancelRef.current = true)}>
              Cancel remaining
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              {phase === 'done' ? 'Close' : 'Cancel'}
            </Button>
          )}
          {phase === 'preview' ? (
            <Button type="button" onClick={() => void runImport()} disabled={validCount === 0}>
              <FileUp aria-hidden="true" />
              Import {pluralize(validCount, 'product')}
            </Button>
          ) : null}
          {phase === 'importing' ? (
            <Button type="button" disabled>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Importing…
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
