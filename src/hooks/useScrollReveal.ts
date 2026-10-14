import { useEffect, useRef, useState, type RefObject } from 'react'

interface Options {
  /** Fraction of the element that must be visible before revealing. */
  threshold?: number
  rootMargin?: string
  /** Reveal once and stay visible (default) or toggle on every pass. */
  once?: boolean
}

/**
 * IntersectionObserver-driven reveal, mirroring Shopify's `scroll-trigger` behaviour:
 * elements start hidden and animate in the first time they enter the viewport.
 * Inside the CMS preview iframe and in tests everything is revealed immediately.
 */
export function useScrollReveal<T extends HTMLElement>(
  options: Options = {},
): [RefObject<T | null>, boolean] {
  const { threshold = 0.12, rootMargin = '0px 0px -8% 0px', once = true } = options
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(() => !supportsObserver())

  useEffect(() => {
    const node = ref.current
    if (!node || visible || !supportsObserver()) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            if (once) observer.disconnect()
          } else if (!once) {
            setVisible(false)
          }
        }
      },
      { threshold, rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin, once, visible])

  return [ref, visible]
}

function supportsObserver(): boolean {
  return (
    typeof window !== 'undefined' &&
    'IntersectionObserver' in window &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
