import { Search, Users } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCustomers } from '@/features/customers/application/hooks'
import { CustomerDetailSheet } from '@/features/customers/presentation/CustomerDetailSheet'
import { CustomersTable } from '@/features/customers/presentation/CustomersTable'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { pluralize } from '@/lib/format'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const debouncedSearch = useDebouncedValue(search.trim())
  const customers = useCustomers(debouncedSearch)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={
          customers.data
            ? `${pluralize(customers.data.length, 'customer')}${debouncedSearch ? ' match your search' : ''}.`
            : 'People who have placed orders or created an account.'
        }
      />

      <div className="relative max-w-md">
        <Label htmlFor="customers-search" className="sr-only">
          Search customers
        </Label>
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id="customers-search"
          type="search"
          placeholder="Search by name, email or phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {customers.isError ? (
        <ErrorState
          title="Could not load customers"
          error={customers.error}
          onRetry={() => void customers.refetch()}
          isRetrying={customers.isRefetching}
        />
      ) : (
        <CustomersTable
          customers={customers.data ?? []}
          isLoading={customers.isPending}
          onSelect={(customer) => setSelectedId(customer.id)}
          emptyState={
            <EmptyState
              icon={Users}
              title={debouncedSearch ? 'No customers match your search' : 'No customers yet'}
              description={
                debouncedSearch
                  ? 'Try a different name or email.'
                  : 'Customers appear here after their first order.'
              }
            />
          }
        />
      )}

      <CustomerDetailSheet
        customerId={selectedId}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      />
    </div>
  )
}
