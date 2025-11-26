/**
 * Localization System - i18n infrastructure and translation
 */

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ar' | 'ru'

export interface Translation {
  [key: string]: string | Translation
}

export interface LocaleData {
  locale: Locale
  name: string
  translations: Translation
  isRTL: boolean
  dateFormat: string
  numberFormat: string
}

class LocalizationManager {
  private currentLocale: Locale = 'en'
  private translations: Map<Locale, Translation> = new Map()
  private localeData: Map<Locale, LocaleData> = new Map()
  private loadingPromises: Map<Locale, Promise<void>> = new Map()
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.initializeLocales()
    // Load saved locale from localStorage or detect browser language
    const savedLocale = localStorage.getItem('locale') as Locale | null
    if (savedLocale && this.localeData.has(savedLocale)) {
      this.currentLocale = savedLocale
      this.setLocale(savedLocale) // This will load translations and apply RTL
    } else {
      // Attempt to detect browser language
      const browserLanguage = navigator.language.split('-')[0] as Locale
      if (this.localeData.has(browserLanguage)) {
        this.setLocale(browserLanguage)
      } else {
        // Load default locale translations immediately
        this.loadLocale('en')
      }
    }
  }

  private initializeLocales(): void {
    // English (default)
    this.localeData.set('en', {
      locale: 'en',
      name: 'English',
      translations: {},
      isRTL: false,
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US'
    })

    // Spanish
    this.localeData.set('es', {
      locale: 'es',
      name: 'Español',
      translations: {},
      isRTL: false,
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'es-ES'
    })

    // French
    this.localeData.set('fr', {
      locale: 'fr',
      name: 'Français',
      translations: {},
      isRTL: false,
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'fr-FR'
    })

    // German
    this.localeData.set('de', {
      locale: 'de',
      name: 'Deutsch',
      translations: {},
      isRTL: false,
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'de-DE'
    })

    // Japanese
    this.localeData.set('ja', {
      locale: 'ja',
      name: '日本語',
      translations: {},
      isRTL: false,
      dateFormat: 'YYYY/MM/DD',
      numberFormat: 'ja-JP'
    })

    // Chinese
    this.localeData.set('zh', {
      locale: 'zh',
      name: '中文',
      translations: {},
      isRTL: false,
      dateFormat: 'YYYY/MM/DD',
      numberFormat: 'zh-CN'
    })

    // Arabic (RTL)
    this.localeData.set('ar', {
      locale: 'ar',
      name: 'العربية',
      translations: {},
      isRTL: true,
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'ar-SA'
    })

    // Russian
    this.localeData.set('ru', {
      locale: 'ru',
      name: 'Русский',
      translations: {},
      isRTL: false,
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'ru-RU'
    })
  }

  /**
   * Load translations for a locale from JSON file
   */
  async loadLocale(locale: Locale): Promise<void> {
    // If already loading, return the existing promise
    if (this.loadingPromises.has(locale)) {
      return this.loadingPromises.get(locale)!
    }

    // If already loaded, return immediately
    if (this.translations.has(locale)) {
      return Promise.resolve()
    }

    // Create loading promise
    const loadPromise = (async () => {
      try {
        const translations = await import(`../data/locales/${locale}.json`)
        this.loadTranslations(locale, translations.default)
      } catch (error) {
        console.error(`Failed to load translations for locale ${locale}:`, error)
        // Fallback to English if loading fails
        if (locale !== 'en') {
          try {
            const enTranslations = await import(`../data/locales/en.json`)
            this.loadTranslations(locale, enTranslations.default)
          } catch (fallbackError) {
            console.error('Failed to load fallback English translations:', fallbackError)
          }
        }
      } finally {
        this.loadingPromises.delete(locale)
      }
    })()

    this.loadingPromises.set(locale, loadPromise)
    return loadPromise
  }

  setLocale(locale: Locale): void {
    if (this.currentLocale === locale) return

    this.currentLocale = locale
    localStorage.setItem('locale', locale)
    
    // Load translations if not already loaded
    this.loadLocale(locale).then(() => {
      const data = this.localeData.get(locale)
      if (data) {
        // Apply RTL if needed
        document.documentElement.dir = data.isRTL ? 'rtl' : 'ltr'
        document.documentElement.lang = locale
        // Notify listeners
        this.notifyListeners()
      }
    })
  }

  getLocale(): Locale {
    return this.currentLocale
  }

  t(key: string, params?: Record<string, string | number>): string {
    const translation = this.getTranslation(key)
    if (!translation) {
      // In development, show the key to help identify missing translations
      if (import.meta.env.DEV) {
        console.warn(`Translation missing for key: ${key}`)
      }
      return key // Return key if translation not found
    }

    // Replace parameters
    if (params) {
      return translation.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match
      })
    }

    return translation
  }

  private getTranslation(key: string): string | null {
    const translations = this.translations.get(this.currentLocale)
    if (!translations) return null

    const keys = key.split('.')
    let current: any = translations

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k]
      } else {
        return null
      }
    }

    return typeof current === 'string' ? current : null
  }

  loadTranslations(locale: Locale, translations: Translation): void {
    this.translations.set(locale, translations)
  }

  formatDate(date: Date): string {
    const data = this.localeData.get(this.currentLocale)
    if (!data) return date.toLocaleDateString()

    return new Intl.DateTimeFormat(data.numberFormat).format(date)
  }

  formatNumber(number: number): string {
    const data = this.localeData.get(this.currentLocale)
    if (!data) return number.toString()

    return new Intl.NumberFormat(data.numberFormat).format(number)
  }

  isRTL(): boolean {
    const data = this.localeData.get(this.currentLocale)
    return data ? data.isRTL : false
  }

  getAvailableLocales(): Locale[] {
    return Array.from(this.localeData.keys())
  }

  /**
   * Get locale display name
   */
  getLocaleName(locale: Locale): string {
    const data = this.localeData.get(locale)
    return data?.name || locale
  }

  /**
   * Subscribe to locale changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener())
  }
}

export const localizationManager = new LocalizationManager()

