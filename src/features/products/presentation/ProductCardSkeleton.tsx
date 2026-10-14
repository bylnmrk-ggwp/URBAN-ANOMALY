import { Skeleton } from '@/components/ui/skeleton'

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <div className="mt-4 flex flex-col items-center gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-1.5 pt-1">
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="size-3 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-11 w-full rounded-[2px]" />
      </div>
    </div>
  )
}
