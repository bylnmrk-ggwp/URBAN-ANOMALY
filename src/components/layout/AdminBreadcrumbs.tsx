import { Fragment } from 'react'
import { Link, useLocation } from 'react-router'

import { routes } from '@/app/router/routes'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

import { adminSegmentLabels } from './adminNav'

interface Crumb {
  label: string
  href: string
}

/** Builds crumbs from `/admin/<segments>`; unknown segments are ids and read "Details". */
function deriveAdminCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean).slice(1)
  return segments.map((segment, index) => ({
    label: adminSegmentLabels[segment] ?? 'Details',
    href: `/admin/${segments.slice(0, index + 1).join('/')}`,
  }))
}

export function AdminBreadcrumbs() {
  const { pathname } = useLocation()
  const crumbs = deriveAdminCrumbs(pathname)
  const last = crumbs.length - 1

  return (
    <Breadcrumb>
      <BreadcrumbList className="text-xs sm:text-sm">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={routes.admin.dashboard}>Admin</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === last ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
