import { z } from 'zod'

import { PRODUCT_SIZES } from './entities'

export const productColorSchema = z.object({
  name: z.string().trim().min(1, 'Color name is required.').max(30),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex color.'),
})

export const productVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(3, 'SKU is required.').max(40),
  size: z.enum(PRODUCT_SIZES),
  color: productColorSchema,
  stock: z.coerce.number().int('Whole numbers only.').min(0, 'Stock cannot be negative.'),
  lowStockThreshold: z.coerce.number().int().min(0),
})

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, 'Image is required.'),
  alt: z.string().trim().max(120),
  isPrimary: z.boolean(),
})

export const productFormSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
    slug: z
      .string()
      .trim()
      .min(2, 'Slug is required.')
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.'),
    description: z.string().trim().min(10, 'Describe the product in at least 10 characters.'),
    details: z.array(z.string().trim()),
    categoryId: z.string().min(1, 'Choose a category.'),
    basePrice: z.coerce.number().positive('Price must be greater than zero.'),
    salePrice: z.coerce.number().positive('Sale price must be greater than zero.').nullable(),
    status: z.enum(['draft', 'published', 'archived']),
    isFeatured: z.boolean(),
    seoTitle: z.string().trim().max(70, 'Keep the SEO title under 70 characters.').optional(),
    seoDescription: z
      .string()
      .trim()
      .max(160, 'Keep the meta description under 160 characters.')
      .optional(),
    images: z.array(productImageSchema).min(1, 'Add at least one product image.'),
    sizes: z.array(z.enum(PRODUCT_SIZES)).min(1, 'Select at least one size.'),
    colors: z.array(productColorSchema).min(1, 'Add at least one color.'),
    variants: z.array(productVariantSchema).min(1, 'Generate variants from sizes and colors.'),
  })
  .superRefine((values, ctx) => {
    if (values.salePrice !== null && values.salePrice >= values.basePrice) {
      ctx.addIssue({
        code: 'custom',
        path: ['salePrice'],
        message: 'Sale price must be lower than the base price.',
      })
    }
    const primaryCount = values.images.filter((img) => img.isPrimary).length
    if (primaryCount !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['images'],
        message: 'Select exactly one primary image.',
      })
    }
    const skus = values.variants.map((v) => v.sku.toUpperCase())
    if (new Set(skus).size !== skus.length) {
      ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Variant SKUs must be unique.' })
    }
  })

export type ProductFormValues = z.infer<typeof productFormSchema>
export type ProductFormInput = z.input<typeof productFormSchema>
