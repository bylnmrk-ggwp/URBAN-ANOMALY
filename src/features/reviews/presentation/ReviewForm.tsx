import { zodResolver } from '@hookform/resolvers/zod'
import { ImagePlus, Loader2, X } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Product } from '@/features/products/domain/entities'
import { useSubmitReview } from '@/features/reviews/application/hooks'
import {
  REVIEW_MAX_PHOTOS,
  type ReviewFormValues,
  reviewFormSchema,
} from '@/features/reviews/domain/entities'
import { getErrorMessage } from '@/lib/errors'

import { StarPicker } from './StarPicker'

interface ReviewFormProps {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SUCCESS_MESSAGE = 'Thanks — your review is awaiting approval.'

function previewUrl(file: File): string {
  return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : ''
}

export function ReviewForm({ product, open, onOpenChange }: ReviewFormProps) {
  const photoInputId = useId()
  const submitReview = useSubmitReview()
  const [photos, setPhotos] = useState<File[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const previews = useMemo(() => photos.map(previewUrl), [photos])

  useEffect(() => {
    return () => {
      if (typeof URL.revokeObjectURL !== 'function') return
      for (const url of previews) if (url) URL.revokeObjectURL(url)
    }
  }, [previews])

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 0, title: '', body: '' },
  })

  const reset = () => {
    form.reset({ rating: 0, title: '', body: '' })
    setPhotos([])
    setPhotoError(null)
  }

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const incoming = Array.from(files)
    const images = incoming.filter((file) => file.type.startsWith('image/'))
    if (images.length !== incoming.length) {
      setPhotoError('Only image files can be attached.')
    } else if (photos.length + images.length > REVIEW_MAX_PHOTOS) {
      setPhotoError(`You can attach up to ${REVIEW_MAX_PHOTOS} photos.`)
    } else {
      setPhotoError(null)
    }
    setPhotos((current) => [...current, ...images].slice(0, REVIEW_MAX_PHOTOS))
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await submitReview.mutateAsync({ productId: product.id, ...values, photos })
      toast.success(SUCCESS_MESSAGE)
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not submit your review.'))
    }
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (submitReview.isPending) return
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Write a review</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your rating</FormLabel>
                  <FormControl>
                    <StarPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Sum it up in a few words" maxLength={80} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="How does it fit? How is the fabric? What should others know?"
                      maxLength={1000}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor={photoInputId}>Photos (optional, up to {REVIEW_MAX_PHOTOS})</Label>
              <ul className="grid grid-cols-3 gap-2">
                {previews.map((url, index) => (
                  <li key={`${url}-${index}`} className="relative min-w-0">
                    <div className="bg-muted aspect-square overflow-hidden rounded-md">
                      {url ? (
                        <img src={url} alt="" className="size-full object-cover" />
                      ) : (
                        <span className="text-muted-foreground flex size-full items-center justify-center p-2 text-center text-xs break-all">
                          {photos[index]?.name}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove photo ${index + 1}`}
                      className="bg-background/90 absolute top-1 right-1 flex size-8 items-center justify-center rounded-full border"
                      onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                {photos.length < REVIEW_MAX_PHOTOS ? (
                  <li className="min-w-0">
                    <label
                      htmlFor={photoInputId}
                      className="text-muted-foreground hover:text-foreground flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs"
                    >
                      <ImagePlus className="size-5" aria-hidden="true" />
                      Add photo
                    </label>
                  </li>
                ) : null}
              </ul>
              <input
                id={photoInputId}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                aria-describedby={photoError ? `${photoInputId}-error` : undefined}
                aria-invalid={Boolean(photoError)}
                onChange={(event) => {
                  addPhotos(event.target.files)
                  event.target.value = ''
                }}
              />
              {photoError ? (
                <p id={`${photoInputId}-error`} className="text-destructive text-sm">
                  {photoError}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  reset()
                  onOpenChange(false)
                }}
                disabled={submitReview.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" className="min-h-11" disabled={submitReview.isPending}>
                {submitReview.isPending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : null}
                Submit review
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
