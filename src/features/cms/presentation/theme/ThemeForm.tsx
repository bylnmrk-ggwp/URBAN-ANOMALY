import { RotateCcw } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { seasonBaselineTheme, THEME_FONTS, type ThemeContent } from '../../domain/theme'
import { ColorField, type ColorName } from './ColorField'
import { SeasonField } from './SeasonField'
import { SegmentedField } from './SegmentedField'

const COLOR_FIELDS: ReadonlyArray<{ name: ColorName; label: string }> = [
  { name: 'colors.primary', label: 'Primary' },
  { name: 'colors.primaryForeground', label: 'Primary text' },
  { name: 'colors.background', label: 'Background' },
  { name: 'colors.foreground', label: 'Text' },
  { name: 'colors.muted', label: 'Muted surface' },
  { name: 'colors.mutedForeground', label: 'Muted text' },
  { name: 'colors.border', label: 'Border' },
]

export function ThemeForm({ form }: { form: UseFormReturn<ThemeContent> }) {
  const season = form.watch('season')
  return (
    <>
      <Card className="gap-4 rounded-lg shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Season</CardTitle>
          <CardDescription>
            The brand ships seasonal logo cuts. Each one brings its own palette.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SeasonField form={form} />
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-lg shadow-none">
        <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-base">Colours</CardTitle>
            <CardDescription>
              Six-digit hex values, seeded by the season. Keep text and background contrast high.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => form.reset(seasonBaselineTheme(season), { keepDefaultValues: true })}
          >
            <RotateCcw aria-hidden="true" />
            Reset to defaults
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {COLOR_FIELDS.map((c) => (
            <ColorField key={c.name} form={form} name={c.name} label={c.label} />
          ))}
        </CardContent>
      </Card>

      <Card className="gap-4 rounded-lg shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Type and shape</CardTitle>
          <CardDescription>Font, corner radius, button shape and vertical rhythm.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormField
            control={form.control}
            name="fontFamily"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Font</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full sm:w-64" aria-label="Font">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {THEME_FONTS.map((font) => (
                      <SelectItem key={font} value={font}>
                        {font}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <SegmentedField
            form={form}
            name="radius"
            label="Corner radius"
            options={[
              { value: 'none', label: 'None' },
              { value: 'sm', label: 'Small' },
              { value: 'md', label: 'Medium' },
              { value: 'lg', label: 'Large' },
            ]}
          />
          <SegmentedField
            form={form}
            name="buttonStyle"
            label="Button style"
            options={[
              { value: 'square', label: 'Square' },
              { value: 'rounded', label: 'Rounded' },
              { value: 'pill', label: 'Pill' },
            ]}
          />
          <SegmentedField
            form={form}
            name="sectionSpacing"
            label="Section spacing"
            description="Vertical padding between storefront sections."
            options={[
              { value: 'compact', label: 'Compact' },
              { value: 'default', label: 'Default' },
              { value: 'spacious', label: 'Spacious' },
            ]}
          />
        </CardContent>
      </Card>
    </>
  )
}
