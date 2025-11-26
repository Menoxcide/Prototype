/**
 * Language Selector Component
 * Allows users to change the game language
 */

import { useTranslation } from '../../hooks/useTranslation'

export default function LanguageSelector() {
  const { locale, setLocale, availableLocales, getLocaleName } = useTranslation()

  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        {t('settings.language')}
      </label>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        className="w-full bg-gray-800 text-gray-300 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500"
      >
        {availableLocales.map((loc) => (
          <option key={loc} value={loc}>
            {getLocaleName(loc)}
          </option>
        ))}
      </select>
    </div>
  )
}

