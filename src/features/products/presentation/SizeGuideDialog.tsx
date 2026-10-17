import { Ruler } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { ProductSize } from '@/features/products/domain/entities'

import { SizeRecommender } from './SizeRecommender'

const SIZE_GUIDE_ROWS: { size: string; footCm: string; eu: string }[] = [
  { size: '5', footCm: '22.3–23.0', eu: '36' },
  { size: '6', footCm: '23.1–23.8', eu: '37' },
  { size: '7', footCm: '23.9–24.6', eu: '38' },
  { size: '8', footCm: '24.7–25.4', eu: '39' },
  { size: '9', footCm: '25.5–26.2', eu: '40–41' },
  { size: '10', footCm: '26.3–27.0', eu: '42' },
  { size: '11', footCm: '27.1–27.8', eu: '43–44' },
  { size: '12', footCm: '27.9–28.6', eu: '45' },
]

export function SizeGuideTable() {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">US size</TableHead>
            <TableHead scope="col">Foot length (cm)</TableHead>
            <TableHead scope="col">EU</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {SIZE_GUIDE_ROWS.map((row) => (
            <TableRow key={row.size}>
              <TableCell className="font-medium">{row.size}</TableCell>
              <TableCell className="tabular-nums">{row.footCm}</TableCell>
              <TableCell className="tabular-nums">{row.eu}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

interface SizeGuideDialogProps {
  /** Applies a recommended size to the product selection and closes the dialog. */
  onSelectSize?: (size: ProductSize) => void
}

export function SizeGuideDialog({ onSelectSize }: SizeGuideDialogProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = onSelectSize
    ? (size: ProductSize) => {
        onSelectSize(size)
        setOpen(false)
      }
    : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto min-h-11 px-0 sm:min-h-0">
          <Ruler aria-hidden="true" />
          Size guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Size guide</DialogTitle>
          <DialogDescription>
            Foot length in centimetres. If you are between sizes, size up.
          </DialogDescription>
        </DialogHeader>
        <SizeGuideTable />
        <SizeRecommender onSelectSize={handleSelect} />
      </DialogContent>
    </Dialog>
  )
}
