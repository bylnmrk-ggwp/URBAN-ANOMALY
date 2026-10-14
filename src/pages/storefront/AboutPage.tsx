import { usePublishedDocument } from '@/features/cms/application/usePublishedDocument'
import { pageKey } from '@/features/cms/domain/documents'
import { PageRenderer } from '@/features/cms/presentation/PageRenderer'

export default function AboutPage() {
  const { content } = usePublishedDocument('page', pageKey('about'))
  return <PageRenderer content={content} />
}
