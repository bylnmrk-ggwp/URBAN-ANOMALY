import { getSupabaseClient } from '@/lib/supabase/client'
import {
  parseRpcJson,
  teamMemberJsonSchema,
  teamMemberListJsonSchema,
  toTeamMember,
  unwrap,
} from '@/lib/supabase/mappers'

import type { AdminRole, TeamMember, TeamRepository } from '../domain/entities'

/**
 * Active members are `profiles` rows with `role = 'admin'` (sub-role in `admin_role`);
 * people without a confirmed account yet are rows in `team_invites`, promoted by a trigger on
 * `auth.users` once that address is confirmed (0006_features_round2.sql). Every write is an
 * owner-only RPC that also enforces the last-owner rule; `team_members` lists both kinds,
 * oldest first.
 */
export class SupabaseTeamRepository implements TeamRepository {
  private get db() {
    return getSupabaseClient()
  }

  async list(): Promise<TeamMember[]> {
    const data = unwrap(await this.db.rpc('team_members'))
    return parseRpcJson(teamMemberListJsonSchema, data, 'team_members').map(toTeamMember)
  }

  async invite(input: { email: string; fullName: string; role: AdminRole }): Promise<TeamMember> {
    const data = unwrap(
      await this.db.rpc('invite_team_member', {
        p_email: input.email.trim().toLowerCase(),
        p_full_name: input.fullName.trim(),
        p_role: input.role,
      }),
    )
    return toTeamMember(parseRpcJson(teamMemberJsonSchema, data, 'invite_team_member'))
  }

  async updateRole(id: string, role: AdminRole): Promise<TeamMember> {
    const data = unwrap(await this.db.rpc('update_team_member_role', { p_id: id, p_role: role }))
    return toTeamMember(parseRpcJson(teamMemberJsonSchema, data, 'update_team_member_role'))
  }

  async remove(id: string): Promise<void> {
    unwrap(await this.db.rpc('remove_team_member', { p_id: id }))
  }
}
