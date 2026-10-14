import type { ISODateString } from '@/types/common'

export interface MediaAsset {
  id: string
  bucket: string
  path: string
  url: string
  alt: string
  mime: string
  sizeBytes: number
  width: number | null
  height: number | null
  uploadedBy: string
  createdAt: ISODateString
}

export const MEDIA_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024
export const MEDIA_BUCKET = 'cms-media'

export interface MediaUploadInput {
  file: File
  alt: string
  width: number | null
  height: number | null
}

export interface MediaFilters {
  search?: string
}

export function validateMediaFile(file: File): string | null {
  if (!(MEDIA_ALLOWED_MIME as readonly string[]).includes(file.type)) {
    return 'Only JPEG, PNG, WebP and AVIF images are allowed.'
  }
  if (file.size > MEDIA_MAX_BYTES) return 'Images must be 5 MB or smaller.'
  return null
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
