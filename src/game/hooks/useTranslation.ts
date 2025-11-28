/**
 * React hook for using translations
 */

import { useState, useEffect } from 'react'
import { localizationManager, Locale } from '../utils/localization'

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(localizationManager.getLocale())

  useEffect(() => {
    const unsubscribe = localizationManager.subscribe(() => {
      // Force re-render when translations load or locale changes
      setLocaleState(localizationManager.getLocale())
    })
    return unsubscribe
  }, [])

  const t = (key: string, params?: Record<string, string | number>) => {
    return localizationManager.t(key, params)
  }

  const setLocale = (newLocale: Locale) => {
    localizationManager.setLocale(newLocale)
    setLocaleState(newLocale)
  }

  return {
    t,
    locale,
    setLocale,
    isRTL: localizationManager.isRTL(),
    availableLocales: localizationManager.getAvailableLocales(),
    getLocaleName: (loc: Locale) => localizationManager.getLocaleName(loc)
  }
}

