import { UserCog, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/application/useAuth'
import { useTeam, useTeamMutations } from '@/features/team/application/hooks'
import type { AdminRole, InviteFormValues, TeamMember } from '@/features/team/domain/entities'
import { InviteDialog } from '@/features/team/presentation/InviteDialog'
import { RequirePermission } from '@/features/team/presentation/RequirePermission'
import { TeamTable } from '@/features/team/presentation/TeamTable'
import { getErrorMessage } from '@/lib/errors'

export default function TeamPage() {
  return (
    <RequirePermission permission="team.manage">
      <TeamPageContent />
    </RequirePermission>
  )
}

function TeamPageContent() {
  const { user } = useAuth()
  const team = useTeam()
  const { invite, updateRole, remove } = useTeamMutations()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const canManage = user?.adminRole === 'owner'

  const submitInvite = async (values: InviteFormValues) => {
    try {
      await invite.mutateAsync(values)
      toast.success(`Invitation sent to ${values.email}.`)
      setInviteOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not send the invitation.'))
    }
  }

  const changeRole = (member: TeamMember, role: AdminRole) => {
    setUpdatingId(member.id)
    updateRole.mutate(
      { id: member.id, role },
      {
        onSuccess: () => toast.success(`${member.fullName} is now ${role}.`),
        onError: (error) => toast.error(getErrorMessage(error, 'Could not change the role.')),
        onSettled: () => setUpdatingId(null),
      },
    )
  }

  const confirmRemove = () => {
    if (!removing) return
    const target = removing
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success(`${target.fullName} removed from the team.`)
        setRemoving(null)
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Could not remove this member.'))
        setRemoving(null)
      },
    })
  }

  const inviteButton = canManage ? (
    <Button onClick={() => setInviteOpen(true)}>
      <UserPlus aria-hidden="true" />
      Invite member
    </Button>
  ) : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="People who can sign in to the admin area and what they are allowed to do."
        actions={inviteButton}
      />

      {team.isError ? (
        <ErrorState
          title="Could not load the team"
          error={team.error}
          onRetry={() => void team.refetch()}
          isRetrying={team.isRefetching}
        />
      ) : (
        <TeamTable
          members={team.data ?? []}
          isLoading={team.isPending}
          canManage={canManage}
          currentUserId={user?.id ?? null}
          onChangeRole={changeRole}
          onRemove={setRemoving}
          updatingId={updatingId}
          emptyState={
            <EmptyState
              icon={UserCog}
              title="No team members"
              description="Invite someone to help run the store."
              action={inviteButton}
            />
          }
        />
      )}

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onSubmit={submitInvite}
        isPending={invite.isPending}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={removing ? `Remove ${removing.fullName}?` : 'Remove member?'}
        description="They will lose access to the admin area immediately. You can invite them again later."
        confirmLabel="Remove"
        destructive
        isPending={remove.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
