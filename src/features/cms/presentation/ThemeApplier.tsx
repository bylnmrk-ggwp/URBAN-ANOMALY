import { useEffect } from 'react'

import { usePublishedDocument } from '../application/usePublishedDocument'
import { GLOBAL_KEYS } from '../domain/documents'
import { seasonCssText, THEME_CSS_KEYS, themeCssOverrides } from '../domain/theme'

const SEASON_STYLE_ID = 'cms-season-palette'

/**
 * Applies the published theme.
 *
 * The season palette goes in as a stylesheet with a `:root` and a `.dark` rule, so dark mode
 * keeps working; its keys and values both come from the season table, never from stored
 * content. Colours the admin has hand-edited away from the season are then written as CSS
 * custom properties on `<html>`, where only the keys produced by `themeToCssVariables` are
 * ever set. The default season and untouched colours write nothing at all, leaving the
 * stylesheet (and dark mode) exactly as authored.
 */
export function ThemeApplier() {
  const { content } = usePublishedDocument('theme', GLOBAL_KEYS.theme)
  const seasonCss = seasonCssText(content.season)

  useEffect(() => {
    if (!seasonCss) return
    const element = document.createElement('style')
    element.id = SEASON_STYLE_ID
    element.textContent = seasonCss
    document.head.append(element)
    return () => element.remove()
  }, [seasonCss])

  useEffect(() => {
    const overrides = Object.entries(themeCssOverrides(content))
    if (overrides.length === 0) return
    const style = document.documentElement.style
    for (const [key, value] of overrides) style.setProperty(key, value)
    return () => {
      for (const key of THEME_CSS_KEYS) style.removeProperty(key)
    }
  }, [content])

  return null
}
