import { Skeleton } from '@/components/ui/skeleton'

export function ProductDetailsSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16" aria-hidden="true">
      <div className="flex gap-4">
        <div className="hidden w-20 shrink-0 flex-col gap-3 lg:flex">
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="aspect-[3/4] w-full" />
          <Skeleton className="aspect-[3/4] w-full" />
        </div>
        <Skeleton className="aspect-[3/4] w-full flex-1" />
      </div>
      <div className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-2">
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="size-11 rounded-full" />
            <Skeleton className="size-11 rounded-full" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-12" />
          <div className="flex gap-2">
            <Skeleton className="h-11 w-14" />
            <Skeleton className="h-11 w-14" />
            <Skeleton className="h-11 w-14" />
            <Skeleton className="h-11 w-14" />
          </div>
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  )
}
