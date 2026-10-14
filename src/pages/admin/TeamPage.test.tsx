import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { repositories } from '@/config/repositories'
import { isAppError } from '@/lib/errors'
import {
  renderWithProviders,
  resetMockSession,
  screen,
  signInAs,
  waitFor,
  within,
} from '@/tests/render'

import TeamPage from './TeamPage'

function renderPage() {
  return renderWithProviders(<TeamPage />, {
    route: '/admin/team',
    initialEntries: ['/admin/team'],
  })
}

describe('TeamPage', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('lists members, marks the signed-in owner and disables removing yourself', async () => {
    renderPage()
    expect((await screen.findAllByText(/Store Admin/)).length).toBeGreaterThan(0)
    expect(screen.getAllByText('(you)').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Jamie Reyes').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Remove Store Admin' })[0]).toBeDisabled()
  })

  it('invites a staff member and removes them again', async () => {
    const { user } = renderPage()
    await screen.findAllByText(/Store Admin/)

    await user.click(screen.getByRole('button', { name: 'Invite member' }))
    const dialog = await screen.findByRole('dialog', { name: 'Invite a team member' })
    await user.type(within(dialog).getByLabelText('Full name'), 'Pat Cruz')
    await user.type(within(dialog).getByLabelText('Email'), 'pat@demo.local')
    await user.click(within(dialog).getByRole('button', { name: 'Send invite' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await screen.findAllByText('Pat Cruz')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Invited').length).toBeGreaterThan(0)

    await user.click(screen.getAllByRole('button', { name: 'Remove Pat Cruz' })[0] as HTMLElement)
    const confirm = await screen.findByRole('alertdialog', { name: 'Remove Pat Cruz?' })
    await user.click(within(confirm).getByRole('button', { name: 'Remove' }))
    await waitFor(() => expect(screen.queryByText('Pat Cruz')).not.toBeInTheDocument())
  })

  it('refuses to demote or remove the last owner', async () => {
    const team = await repositories.team.list()
    const owner = team.find((m) => m.role === 'owner')
    expect(owner).toBeDefined()
    const conflict = (e: unknown) =>
      isAppError(e) && e.code === 'conflict' && /at least one owner/.test(e.message)
    await expect(repositories.team.updateRole(owner?.id ?? '', 'staff')).rejects.toSatisfy(conflict)
    await expect(repositories.team.remove(owner?.id ?? '')).rejects.toSatisfy(conflict)
    expect((await repositories.team.list()).filter((m) => m.role === 'owner')).toHaveLength(1)
  })

  it('blocks staff from managing the team', async () => {
    await resetMockSession()
    await repositories.auth.signIn({ email: 'staff@demo.local', password: 'password' })
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/403/)
    await expect(
      repositories.team.invite({ email: 'x@demo.local', fullName: 'X Y', role: 'staff' }),
    ).rejects.toSatisfy((e: unknown) => isAppError(e) && e.code === 'forbidden')
  })
})
