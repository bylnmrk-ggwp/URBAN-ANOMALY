import { z } from 'zod'

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(60),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug is required.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'),
  description: z.string().trim().max(300),
  imageUrl: z.union([z.url('Enter a valid image URL.'), z.literal('')]),
  introTitle: z.string().trim().max(120, 'Keep the intro title under 120 characters.').optional(),
  introBody: z.string().trim().max(600, 'Keep the intro under 600 characters.').optional(),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>
