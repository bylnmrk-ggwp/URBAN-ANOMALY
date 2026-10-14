import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ImageRef } from '@/features/cms/domain/common'
import { emptyImage } from '@/features/cms/domain/common'
import { DEFAULT_MEDIA } from '@/features/cms/domain/defaults'
import { renderWithProviders, resetMockSession, screen, signInAs, within } from '@/tests/render'

import { ImagePickerField } from './ImagePickerField'

function Harness({ initial = emptyImage }: { initial?: ImageRef }) {
  const [value, setValue] = useState<ImageRef>(initial)
  return (
    <>
      <ImagePickerField label="Hero image" value={value} onChange={setValue} />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  )
}

const readValue = () => JSON.parse(screen.getByTestId('value').textContent ?? '{}') as ImageRef

describe('ImagePickerField', () => {
  beforeEach(async () => {
    await resetMockSession()
    await signInAs('admin')
  })
  afterEach(async () => {
    await resetMockSession()
  })

  it('choosing from the library sets mediaId, url and alt', async () => {
    const { user } = renderWithProviders(<Harness />)
    const asset = DEFAULT_MEDIA[0]
    if (!asset) throw new Error('seed media missing')

    await user.click(screen.getByRole('button', { name: 'Choose from library' }))
    const dialog = await screen.findByRole('dialog', { name: 'Media library' })
    await user.click(await within(dialog).findByRole('button', { name: `Select ${asset.alt}` }))

    expect(readValue()).toEqual({ mediaId: asset.id, url: asset.url, alt: asset.alt })
    expect(screen.queryByRole('dialog', { name: 'Media library' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: asset.alt })).toHaveAttribute('src', asset.url)
  })

  it('keeps alt text the editor already typed when picking an asset', async () => {
    const { user } = renderWithProviders(
      <Harness initial={{ mediaId: null, url: '', alt: 'Custom alt' }} />,
    )
    const asset = DEFAULT_MEDIA[1]
    if (!asset) throw new Error('seed media missing')

    await user.click(screen.getByRole('button', { name: 'Choose from library' }))
    const dialog = await screen.findByRole('dialog', { name: 'Media library' })
    await user.click(await within(dialog).findByRole('button', { name: `Select ${asset.alt}` }))

    expect(readValue()).toEqual({ mediaId: asset.id, url: asset.url, alt: 'Custom alt' })
  })

  it('remove clears the reference', async () => {
    const asset = DEFAULT_MEDIA[0]
    if (!asset) throw new Error('seed media missing')
    const { user } = renderWithProviders(
      <Harness initial={{ mediaId: asset.id, url: asset.url, alt: asset.alt }} />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(readValue()).toEqual(emptyImage)
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('Use URL accepts https only', async () => {
    const { user } = renderWithProviders(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Use URL' }))
    const input = await screen.findByLabelText('Image URL')
    await user.type(input, 'http://insecure.example/x.jpg')
    await user.click(screen.getByRole('button', { name: 'Use this URL' }))
    expect(screen.getByRole('alert')).toHaveTextContent('https://')
    expect(readValue().url).toBe('')

    await user.clear(input)
    await user.type(input, 'https://cdn.example/x.jpg{Enter}')
    expect(readValue()).toEqual({ mediaId: null, url: 'https://cdn.example/x.jpg', alt: '' })
  })
})
