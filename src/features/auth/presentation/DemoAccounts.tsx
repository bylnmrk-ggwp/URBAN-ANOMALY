import { Button } from '@/components/ui/button'

const DEMO_PASSWORD = 'password'

const DEMO_ACCOUNTS = [
  { label: 'Admin (owner)', email: 'admin@demo.local' },
  { label: 'Staff', email: 'staff@demo.local' },
  { label: 'Buyer', email: 'buyer@demo.local' },
] as const

interface DemoAccountsProps {
  onUse: (email: string, password: string) => void
}

/** Mock-mode helper listing the seeded demo accounts. Never rendered against a real backend. */
export function DemoAccounts({ onUse }: DemoAccountsProps) {
  return (
    <aside
      aria-label="Demo accounts"
      className="bg-muted/60 text-muted-foreground mt-6 rounded-md border border-dashed p-4 text-xs"
    >
      <p className="text-foreground font-medium">Demo accounts</p>
      <p className="mt-1">
        This store runs on sample data. Password for all accounts is{' '}
        <code className="text-foreground font-mono">{DEMO_PASSWORD}</code>.
      </p>
      <ul className="mt-3 space-y-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email} className="flex items-center justify-between gap-3">
            <span>
              <span className="text-foreground font-medium">{account.label}</span>{' '}
              <span className="font-mono">{account.email}</span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => onUse(account.email, DEMO_PASSWORD)}
              aria-label={`Use ${account.label} demo account`}
            >
              Use
            </Button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
