import { Link } from 'react-router'

import { usePublishedDocument } from '@/features/cms/application/usePublishedDocument'
import { isExternalHref } from '@/features/cms/domain/common'
import { GLOBAL_KEYS } from '@/features/cms/domain/documents'

export function AnnouncementBar() {
  const { content } = usePublishedDocument('announcement', GLOBAL_KEYS.announcement)
  if (!content.visible || !content.text) return null

  const text = (
    <p className="container-x py-2.5 text-center text-[11px] font-medium tracking-[0.1em] uppercase">
      {content.text}
    </p>
  )

  return (
    <div className="bg-primary text-primary-foreground">
      {!content.href ? (
        text
      ) : isExternalHref(content.href) ? (
        <a
          href={content.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block underline-offset-4 hover:underline"
        >
          {text}
        </a>
      ) : (
        <Link to={content.href} className="block underline-offset-4 hover:underline">
          {text}
        </Link>
      )}
    </div>
  )
}
