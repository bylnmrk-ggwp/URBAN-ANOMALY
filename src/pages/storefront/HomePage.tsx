import { usePublishedDocument } from '@/features/cms/application/usePublishedDocument'
import { pageKey } from '@/features/cms/domain/documents'
import { PageRenderer } from '@/features/cms/presentation/PageRenderer'

export default function HomePage() {
  const { content } = usePublishedDocument('page', pageKey('home'))
  return <PageRenderer content={content} />
}
