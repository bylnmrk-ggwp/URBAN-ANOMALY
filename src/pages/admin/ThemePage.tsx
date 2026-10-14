import { PageHeader } from '@/components/common/PageHeader'
import { ThemeEditor } from '@/features/cms/presentation/theme/ThemeEditor'

export default function ThemePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Theme"
        description="Colours, font and shape tokens for the storefront. Changes apply site-wide once published."
      />
      <ThemeEditor />
    </div>
  )
}
