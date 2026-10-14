import { AppError } from '@/lib/errors'
import type { MockStore } from '@/mocks/MockStore'
import { SEED_TEAM } from '@/mocks/data/team'
import { clone, nowIso } from '@/mocks/helpers'

import type { AdminRole, TeamMember, TeamRepository } from '../domain/entities'

const LAST_OWNER_MESSAGE = 'A store needs at least one owner. Promote someone else first.'

export class MockTeamRepository implements TeamRepository {
  private readonly store: MockStore

  constructor(store: MockStore) {
    this.store = store
    if (this.store.team.length === 0) this.store.team = clone(SEED_TEAM)
  }

  async list(): Promise<TeamMember[]> {
    await this.store.delay()
    this.requireAdmin()
    return clone([...this.store.team].sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
  }

  async invite(input: { email: string; fullName: string; role: AdminRole }): Promise<TeamMember> {
    await this.store.delay()
    this.requireOwner()
    const email = input.email.trim().toLowerCase()
    if (this.store.team.some((m) => m.email.toLowerCase() === email)) {
      throw new AppError('conflict', 'That person is already on the team.')
    }
    const member: TeamMember = {
      id: this.store.nextId('team'),
      email,
      fullName: input.fullName.trim(),
      role: input.role,
      status: 'invited',
      lastActiveAt: null,
      createdAt: nowIso(),
    }
    this.store.team.push(member)
    return clone(member)
  }

  async updateRole(id: string, role: AdminRole): Promise<TeamMember> {
    await this.store.delay()
    this.requireOwner()
    const member = this.requireMember(id)
    if (member.role === 'owner' && role !== 'owner' && this.activeOwnerCount() <= 1) {
      throw new AppError('conflict', LAST_OWNER_MESSAGE)
    }
    member.role = role
    this.syncAuthUser(member)
    return clone(member)
  }

  async remove(id: string): Promise<void> {
    await this.store.delay()
    this.requireOwner()
    const member = this.requireMember(id)
    if (member.role === 'owner' && this.activeOwnerCount() <= 1) {
      throw new AppError('conflict', LAST_OWNER_MESSAGE)
    }
    this.store.team = this.store.team.filter((m) => m.id !== id)
  }

  private requireAdmin() {
    if (this.store.currentSession?.user.role !== 'admin') throw AppError.forbidden()
  }

  private requireOwner() {
    const user = this.store.currentSession?.user
    if (user?.role !== 'admin') throw AppError.forbidden()
    if (user.adminRole !== 'owner') {
      throw AppError.forbidden('Only owners can manage the team.')
    }
  }

  private requireMember(id: string): TeamMember {
    const member = this.store.team.find((m) => m.id === id)
    if (!member) throw AppError.notFound('Team member')
    return member
  }

  private activeOwnerCount(): number {
    return this.store.team.filter((m) => m.role === 'owner').length
  }

  /** Keeps the demo accounts' sub-role in step so a role change is visible after re-login. */
  private syncAuthUser(member: TeamMember) {
    const account = this.store.users.find((u) => u.user.id === member.id)
    if (account && account.user.role === 'admin') account.user.adminRole = member.role
  }
}
