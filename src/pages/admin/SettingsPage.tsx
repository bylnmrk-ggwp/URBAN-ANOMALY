import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useStoreSettings } from '@/features/settings/application/hooks'
import { SettingsForm } from '@/features/settings/presentation/SettingsForm'
import { RequirePermission } from '@/features/team/presentation/RequirePermission'

export default function SettingsPage() {
  return (
    <RequirePermission permission="settings.edit">
      <SettingsPageContent />
    </RequirePermission>
  )
}

function SettingsPageContent() {
  const settings = useStoreSettings()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Store identity, shipping, payments and notification preferences."
      />

      {settings.isPending ? (
        <div className="grid gap-6 lg:grid-cols-3" aria-busy="true" aria-label="Loading settings">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-72 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-36 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      ) : settings.isError ? (
        <ErrorState
          title="Could not load settings"
          error={settings.error}
          onRetry={() => void settings.refetch()}
          isRetrying={settings.isRefetching}
        />
      ) : (
        <SettingsForm settings={settings.data} />
      )}
    </div>
  )
}
