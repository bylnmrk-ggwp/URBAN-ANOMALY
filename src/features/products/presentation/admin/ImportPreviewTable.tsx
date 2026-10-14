import { StatusBadge } from '@/components/common/StatusBadge'
import type { StatusTone } from '@/features/orders/domain/rules'
import { formatPrice } from '@/lib/format'

export type ImportRowOutcome = 'pending' | 'importing' | 'created' | 'failed' | 'skipped'

export interface ImportPreviewRow {
  row: number
  name: string
  slug: string
  basePrice: number | null
  /** Parse-time error (row will not be imported). */
  error: string | null
  outcome: ImportRowOutcome
  /** Server error message once the import has run. */
  resultMessage: string | null
}

const OUTCOME_LABEL: Record<ImportRowOutcome, { label: string; tone: StatusTone }> = {
  pending: { label: 'Ready', tone: 'success' },
  importing: { label: 'Importing…', tone: 'info' },
  created: { label: 'Created', tone: 'success' },
  failed: { label: 'Failed', tone: 'destructive' },
  skipped: { label: 'Skipped', tone: 'neutral' },
}

function Outcome({ row }: { row: ImportPreviewRow }) {
  if (row.error) return <StatusBadge label="Error" tone="destructive" />
  const { label, tone } = OUTCOME_LABEL[row.outcome]
  return <StatusBadge label={label} tone={tone} />
}

export function ImportPreviewTable({ rows }: { rows: ImportPreviewRow[] }) {
  return (
    <div className="max-h-72 overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">Rows found in the CSV file</caption>
        <thead className="bg-muted/50 sticky top-0 text-left text-xs uppercase">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              Row
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Product
            </th>
            <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
              Price
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {rows.map((row) => (
            <tr key={row.row} className="align-top">
              <td className="px-3 py-2 tabular-nums">{row.row}</td>
              <td className="min-w-0 px-3 py-2">
                <p className="font-medium break-words">{row.name || '—'}</p>
                <p className="text-muted-foreground font-mono text-xs break-all">{row.slug}</p>
                {row.error || row.resultMessage ? (
                  <p className="text-destructive mt-1 text-xs break-words">
                    {row.error ?? row.resultMessage}
                  </p>
                ) : null}
              </td>
              <td className="hidden px-3 py-2 tabular-nums sm:table-cell">
                {row.basePrice !== null ? formatPrice(row.basePrice) : '—'}
              </td>
              <td className="px-3 py-2">
                <Outcome row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
