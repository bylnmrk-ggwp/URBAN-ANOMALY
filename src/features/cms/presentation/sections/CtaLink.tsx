import type { ComponentProps, ReactNode } from 'react'
import { Link } from 'react-router'

import { isExternalHref } from '../../domain/common'

interface CtaLinkProps extends Omit<ComponentProps<'a'>, 'href'> {
  href: string
  children: ReactNode
}

/**
 * Link for editor-authored hrefs: relative paths use the router, https URLs open in a
 * new tab. Designed to sit inside `<Button asChild>`, which forwards its classes here.
 */
export function CtaLink({ href, children, ...props }: CtaLinkProps) {
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  }
  return (
    <Link to={href} {...props}>
      {children}
    </Link>
  )
}
