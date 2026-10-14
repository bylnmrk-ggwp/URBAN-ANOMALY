import { useEffect } from 'react'

import { usePublishedDocument } from '../application/usePublishedDocument'
import { THEME_DEFAULT } from '../domain/defaults'
import { GLOBAL_KEYS } from '../domain/documents'
import type { ThemeContent } from '../domain/theme'
import { THEME_CSS_KEYS, themeToCssVariables } from '../domain/theme'

const DEFAULT_VARIABLES = JSON.stringify(themeToCssVariables(THEME_DEFAULT))

function isDefaultTheme(theme: ThemeContent): boolean {
  return JSON.stringify(themeToCssVariables(theme)) === DEFAULT_VARIABLES
}

/**
 * Applies the published theme as CSS custom properties on `<html>`. Only the keys
 * produced by `themeToCssVariables` are ever written. The default theme mirrors the
 * stylesheet, so it writes nothing and leaves the stylesheet (and dark mode) untouched.
 */
export function ThemeApplier() {
  const { content } = usePublishedDocument('theme', GLOBAL_KEYS.theme)

  useEffect(() => {
    if (isDefaultTheme(content)) return
    const style = document.documentElement.style
    for (const [key, value] of Object.entries(themeToCssVariables(content))) {
      style.setProperty(key, value)
    }
    return () => {
      for (const key of THEME_CSS_KEYS) style.removeProperty(key)
    }
  }, [content])

  return null
}
