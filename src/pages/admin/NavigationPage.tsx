import { PageHeader } from '@/components/common/PageHeader'
import { NavigationEditor } from '@/features/cms/presentation/navigation/NavigationEditor'

export default function NavigationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Navigation"
        description="Header links and footer columns shown on every storefront page."
      />
      <NavigationEditor />
    </div>
  )
}
