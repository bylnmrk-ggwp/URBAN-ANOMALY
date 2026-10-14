import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders, screen, within } from '@/tests/render'

import { PublishBar } from './PublishBar'
import { ScheduleDialog } from './ScheduleDialog'
import { toLocalInputValue } from './scheduleTime'

function renderBar(overrides: Partial<Parameters<typeof PublishBar>[0]> = {}) {
  const props: Parameters<typeof PublishBar>[0] = {
    title: 'Home',
    status: 'draft_changes',
    isDirty: false,
    isSaving: false,
    isPublishing: false,
    scheduledAt: null,
    isScheduling: false,
    isCancellingSchedule: false,
    livePath: '/',
    device: 'desktop',
    onDeviceChange: vi.fn(),
    onSave: vi.fn(),
    onPublish: vi.fn(),
    onSchedule: vi.fn(),
    onCancelSchedule: vi.fn(),
    onDiscard: vi.fn(),
    onOpenHistory: vi.fn(),
    onOpenPageSettings: vi.fn(),
    ...overrides,
  }
  return { ...renderWithProviders(<PublishBar {...props} />), props }
}

describe('PublishBar scheduling', () => {
  it('enables Schedule when there are unpublished changes and calls back', async () => {
    const { user, props } = renderBar()
    const button = screen.getByRole('button', { name: 'Schedule publish' })
    expect(button).toBeEnabled()
    await user.click(button)
    expect(props.onSchedule).toHaveBeenCalledTimes(1)
  })

  it('disables Schedule when the draft is already live and untouched', () => {
    renderBar({ status: 'published', isDirty: false })
    expect(screen.getByRole('button', { name: 'Schedule publish' })).toBeDisabled()
  })

  it('shows the scheduled badge with a cancel button', async () => {
    const at = '2030-01-02T03:04:00.000Z'
    const { user, props } = renderBar({ scheduledAt: at })
    expect(screen.getByText(/^Scheduled · /)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel scheduled publish' }))
    expect(props.onCancelSchedule).toHaveBeenCalledTimes(1)
  })
})

describe('ScheduleDialog', () => {
  it('defaults to about an hour ahead and submits an ISO time', async () => {
    const onConfirm = vi.fn<(at: string) => void>()
    const { user } = renderWithProviders(
      <ScheduleDialog
        open
        onOpenChange={vi.fn()}
        title="Home"
        willSaveFirst={false}
        isPending={false}
        onConfirm={onConfirm}
      />,
    )
    const dialog = screen.getByRole('dialog', { name: /Schedule “Home”/ })
    const input = within(dialog).getByLabelText('Publish at')
    expect(input).toHaveAttribute('type', 'datetime-local')
    expect(input).toHaveAttribute('min')
    const defaultMs = new Date((input as HTMLInputElement).value).getTime()
    expect(defaultMs - Date.now()).toBeGreaterThan(55 * 60 * 1000)
    expect(defaultMs - Date.now()).toBeLessThan(65 * 60 * 1000)

    await user.click(within(dialog).getByRole('button', { name: 'Schedule' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    const sent = onConfirm.mock.calls[0]?.[0] ?? ''
    expect(new Date(sent).toISOString()).toBe(sent)
  })

  it('rejects a time in the past without calling back', async () => {
    const onConfirm = vi.fn()
    const { user } = renderWithProviders(
      <ScheduleDialog
        open
        onOpenChange={vi.fn()}
        title="Home"
        willSaveFirst
        isPending={false}
        onConfirm={onConfirm}
      />,
    )
    const input = screen.getByLabelText('Publish at')
    const past = toLocalInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000))
    await user.clear(input)
    await user.type(input, past)
    await user.click(screen.getByRole('button', { name: 'Schedule' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/future/)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
