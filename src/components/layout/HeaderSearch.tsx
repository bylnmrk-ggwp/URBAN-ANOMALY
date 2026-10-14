import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { routes } from '@/app/router/routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const navigate = useNavigate()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = term.trim()
    if (!query) return
    navigate(`${routes.shop}?q=${encodeURIComponent(query)}`)
    setOpen(false)
    setTerm('')
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="size-11" aria-label="Search products">
          <Search className="size-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" className="gap-0">
        <SheetHeader className="container-x pt-6 pb-2">
          <SheetTitle>Search</SheetTitle>
          <SheetDescription>Find products by name, colour or category.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} role="search" className="container-x flex gap-2 pb-8">
          <Input
            type="search"
            name="q"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search for linen shirts, wide-leg trousers…"
            aria-label="Search term"
            autoFocus
            className="h-11 text-base"
          />
          <Button type="submit" size="lg" className="h-11">
            Search
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}
