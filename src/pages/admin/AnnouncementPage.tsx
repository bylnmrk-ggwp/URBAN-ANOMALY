import { PageHeader } from '@/components/common/PageHeader'
import { AnnouncementEditor } from '@/features/cms/presentation/announcement/AnnouncementEditor'

export default function AnnouncementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcement bar"
        description="The strip above the storefront header for shipping notes and promotions."
      />
      <AnnouncementEditor />
    </div>
  )
}
