import { useEffect } from 'react'
import { useLocation } from 'react-router'

/** Resets window scroll on every pathname change so new pages start at the top. */
export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname])

  return null
}
