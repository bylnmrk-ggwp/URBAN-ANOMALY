import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { repositories } from '@/config/repositories'
import { getErrorMessage, isAppError } from '@/lib/errors'
import { queryKeys } from '@/lib/queryKeys'

import type { MediaAsset } from '../domain/media'
import { validateMediaFile } from '../domain/media'

export interface UploadMediaInput {
  file: File
  alt?: string
}

export type ImageDimensions = { width: number; height: number } | null

/**
 * Reads intrinsic dimensions client-side so the media record carries them. Returns null
 * when the environment cannot decode the file (jsdom, unsupported codec) instead of
 * failing the upload.
 */
export async function readImageDimensions(file: File): Promise<ImageDimensions> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return size
    } catch {
      // fall through to the <img> approach
    }
  }
  if (typeof Image === 'undefined' || typeof URL.createObjectURL !== 'function') return null
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<ImageDimensions>((resolve) => {
      const img = new Image()
      const timer = setTimeout(() => resolve(null), 3000)
      img.onload = () => {
        clearTimeout(timer)
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
      }
      img.onerror = () => {
        clearTimeout(timer)
        resolve(null)
      }
      img.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Debouncing is the caller's job; the key includes the search so each term is cached. */
export function useMediaList(search: string) {
  return useQuery({
    queryKey: queryKeys.media.list(search),
    queryFn: () => repositories.media.list({ search }),
  })
}

export function useMediaUsages(id: string | null) {
  return useQuery({
    queryKey: queryKeys.media.usages(id ?? ''),
    queryFn: () => repositories.media.usages(id ?? ''),
    enabled: id !== null,
  })
}

export function useUploadMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, alt }: UploadMediaInput): Promise<MediaAsset> => {
      const problem = validateMediaFile(file)
      if (problem) throw new Error(problem)
      const dimensions = await readImageDimensions(file)
      return repositories.media.upload({
        file,
        alt: alt ?? file.name.replace(/\.[^.]+$/, ''),
        width: dimensions?.width ?? null,
        height: dimensions?.height ?? null,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
    },
  })
}

export function useUpdateMediaAlt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, alt }: { id: string; alt: string }) => repositories.media.updateAlt(id, alt),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
      toast.success('Alt text saved.')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not save alt text.')),
  })
}

export const MEDIA_IN_USE_MESSAGE =
  'This image is used by one or more documents. Remove it from them before deleting.'

/** Surfaces a `conflict` AppError with a user-facing message; other errors pass through. */
export function describeDeleteError(error: unknown): string {
  if (isAppError(error) && error.code === 'conflict') return MEDIA_IN_USE_MESSAGE
  return getErrorMessage(error, 'Could not delete the image.')
}

export function useDeleteMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repositories.media.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.media.all })
      toast.success('Image deleted.')
    },
    onError: (error) => toast.error(describeDeleteError(error)),
  })
}
