import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatRelative } from '@/lib/format'

import type { AdminRole, TeamMember } from '../domain/entities'
import { ROLE_LABELS, isAdminRole } from './roles'

interface TeamTableProps {
  members: TeamMember[]
  isLoading: boolean
  emptyState: ReactNode
  /** Whether the viewer may change roles / remove members (owner only). */
  canManage: boolean
  currentUserId: string | null
  onChangeRole: (member: TeamMember, role: AdminRole) => void
  onRemove: (member: TeamMember) => void
  updatingId: string | null
}

function StatusCell({ member }: { member: TeamMember }) {
  return member.status === 'active' ? (
    <StatusBadge label="Active" tone="success" />
  ) : (
    <StatusBadge label="Invited" tone="info" />
  )
}

export function TeamTable({
  members,
  isLoading,
  emptyState,
  canManage,
  currentUserId,
  onChangeRole,
  onRemove,
  updatingId,
}: TeamTableProps) {
  const roleControl = (m: TeamMember) =>
    canManage ? (
      <Select
        value={m.role}
        onValueChange={(v) => isAdminRole(v) && v !== m.role && onChangeRole(m, v)}
        disabled={updatingId === m.id}
      >
        <SelectTrigger aria-label={`Role for ${m.fullName}`} className="min-h-11 w-32 md:min-h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="owner">{ROLE_LABELS.owner}</SelectItem>
          <SelectItem value="staff">{ROLE_LABELS.staff}</SelectItem>
        </SelectContent>
      </Select>
    ) : (
      <span>{ROLE_LABELS[m.role]}</span>
    )

  const removeButton = (m: TeamMember) =>
    canManage ? (
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Remove ${m.fullName}`}
        onClick={() => onRemove(m)}
        disabled={m.id === currentUserId}
        className="text-destructive min-h-11 min-w-11 md:min-h-9 md:min-w-9"
      >
        <Trash2 aria-hidden="true" />
      </Button>
    ) : null

  const lastActive = (m: TeamMember) => (m.lastActiveAt ? formatRelative(m.lastActiveAt) : 'Never')

  const columns: DataTableColumn<TeamMember>[] = [
    {
      key: 'name',
      header: 'Member',
      cell: (m) => (
        <div className="min-w-0">
          <p className="font-medium">
            {m.fullName}
            {m.id === currentUserId ? (
              <span className="text-muted-foreground font-normal"> (you)</span>
            ) : null}
          </p>
          <p className="text-muted-foreground truncate text-xs">{m.email}</p>
        </div>
      ),
    },
    { key: 'role', header: 'Role', cell: roleControl },
    { key: 'status', header: 'Status', cell: (m) => <StatusCell member={m} /> },
    { key: 'active', header: 'Last active', cell: lastActive, hideBelow: 'lg' },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      cell: removeButton,
      align: 'right',
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={members}
      rowKey={(m) => m.id}
      isLoading={isLoading}
      emptyState={emptyState}
      caption="Team members"
      mobileCard={(m) => (
        <article className="space-y-3 rounded-lg border p-4" aria-label={m.fullName}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">
                {m.fullName}
                {m.id === currentUserId ? (
                  <span className="text-muted-foreground font-normal"> (you)</span>
                ) : null}
              </p>
              <p className="text-muted-foreground truncate text-xs">{m.email}</p>
            </div>
            <StatusCell member={m} />
          </div>
          <div className="flex items-center justify-between gap-3">
            {roleControl(m)}
            {removeButton(m)}
          </div>
          <p className="text-muted-foreground text-xs">Last active: {lastActive(m)}</p>
        </article>
      )}
    />
  )
}
