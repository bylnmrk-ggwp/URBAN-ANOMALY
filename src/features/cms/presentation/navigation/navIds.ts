/** Stable ids for new nav links and footer columns (used as React keys and in stored JSON). */
export function newNavId(prefix = 'nav'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}
