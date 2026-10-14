import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { EmptyState } from '@/components/common/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/application/useAuth'
import type { SavedAddress } from '@/features/auth/domain/entities'
import { getErrorMessage } from '@/lib/errors'

import { AddressForm } from './AddressForm'

export function AddressList() {
  const { user, removeAddress } = useAuth()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SavedAddress | null>(null)
  const [removing, setRemoving] = useState<SavedAddress | null>(null)
  const addresses = user?.addresses ?? []

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (address: SavedAddress) => {
    setEditing(address)
    setFormOpen(true)
  }

  const confirmRemove = async () => {
    if (!removing) return
    try {
      await removeAddress.mutateAsync(removing.id)
      toast.success('Address removed')
      setRemoving(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not remove this address.'))
    }
  }

  return (
    <div className="space-y-6">
      {addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No saved addresses"
          description="Add an address to check out faster next time."
          action={
            <Button onClick={openCreate} className="min-h-11">
              <Plus aria-hidden="true" />
              Add address
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={openCreate} variant="outline" className="min-h-11">
              <Plus aria-hidden="true" />
              Add address
            </Button>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <li key={address.id} className="flex flex-col justify-between rounded-md border p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">{address.label}</h3>
                    {address.isDefault ? <Badge variant="outline">Default</Badge> : null}
                  </div>
                  <address className="text-muted-foreground mt-2 text-sm not-italic">
                    <p>{address.addressLine}</p>
                    <p>
                      {address.barangay}, {address.city}
                    </p>
                    <p>
                      {address.province} {address.postalCode}
                    </p>
                    {address.deliveryInstructions ? (
                      <p className="mt-1">Note: {address.deliveryInstructions}</p>
                    ) : null}
                  </address>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-11"
                    onClick={() => openEdit(address)}
                  >
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive min-h-11"
                    onClick={() => setRemoving(address)}
                  >
                    <Trash2 aria-hidden="true" />
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <AddressForm open={formOpen} onOpenChange={setFormOpen} address={editing} />
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this address?"
        description={
          removing ? `"${removing.label}" will be removed from your saved addresses.` : ''
        }
        confirmLabel="Remove"
        destructive
        isPending={removeAddress.isPending}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
