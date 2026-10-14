import { AppError } from '@/lib/errors'

import type { AdminRole, TeamMember, TeamRepository } from '../domain/entities'

const NOT_AVAILABLE = 'Team management is not available in Supabase mode yet.'

/** Placeholder adapter: keeps `Repositories` satisfied until team RPCs ship. */
export class SupabaseTeamRepository implements TeamRepository {
  list(): Promise<TeamMember[]> {
    return Promise.reject(new AppError('unknown', NOT_AVAILABLE))
  }

  invite(_input: { email: string; fullName: string; role: AdminRole }): Promise<TeamMember> {
    return Promise.reject(new AppError('unknown', NOT_AVAILABLE))
  }

  updateRole(_id: string, _role: AdminRole): Promise<TeamMember> {
    return Promise.reject(new AppError('unknown', NOT_AVAILABLE))
  }

  remove(_id: string): Promise<void> {
    return Promise.reject(new AppError('unknown', NOT_AVAILABLE))
  }
}
