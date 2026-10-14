import { ImageUploadField } from '@/components/common/ImageUploadField'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'

import type { ProductFormApi } from './model'

interface MediaCardProps {
  form: ProductFormApi
}

export function MediaCard({ form }: MediaCardProps) {
  return (
    <Card className="gap-4 rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Media</CardTitle>
        <CardDescription>
          Portrait images (3:4) work best. The primary image is used in listings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="images"
          render={({ field }) => (
            <FormItem>
              <ImageUploadField value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
