import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
  /** Visual heading level. Defaults to h1. */
  as?: 'h1' | 'h2'
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  as: Tag = 'h1',
}: PageHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}
    >
      <div className="min-w-0">
        <Tag className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</Tag>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
