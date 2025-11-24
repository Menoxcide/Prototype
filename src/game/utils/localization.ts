/**
 * Localization System - i18n infrastructure and translation
 */

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ar' | 'ru'

export interface Translation {
  [key: string]: string | Translation
}

export interface LocaleData {
  locale: Locale
  translations: Translation
  isRTL: boolean
  dateFormat: string
  numberFormat: string
}

class LocalizationManager {
  private currentLocale: Locale = 'en'
  private translations: Map<Locale, Translation> = new Map()
  private localeData: Map<Locale, LocaleData> = new Map()

  constructor() {
    this.initializeLocales()
  }

  private initializeLocales(): void {
    // English (default)
    this.localeData.set('en', {
      locale: 'en',
      translations: {},
      isRTL: false,
      dateFormat: 'MM/DD/YYYY',
      numberFormat: 'en-US'
    })

    // Spanish
    this.localeData.set('es', {
      locale: 'es',
      translations: {},
      isRTL: false,
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'es-ES'
    })

    // French
    this.localeData.set('fr', {
      locale: 'fr',
      translations: {},
      isRTL: false,
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'fr-FR'
    })

    // German
    this.localeData.set('de', {
      locale: 'de',
      translations: {},
      isRTL: false,
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'de-DE'
    })

    // Japanese
    this.localeData.set('ja', {
      locale: 'ja',
      translations: {},
      isRTL: false,
      dateFormat: 'YYYY/MM/DD',
      numberFormat: 'ja-JP'
    })

    // Chinese
    this.localeData.set('zh', {
      locale: 'zh',
      translations: {},
      isRTL: false,
      dateFormat: 'YYYY/MM/DD',
      numberFormat: 'zh-CN'
    })

    // Arabic (RTL)
    this.localeData.set('ar', {
      locale: 'ar',
      translations: {},
      isRTL: true,
      dateFormat: 'DD/MM/YYYY',
      numberFormat: 'ar-SA'
    })

    // Russian
    this.localeData.set('ru', {
      locale: 'ru',
      translations: {},
      isRTL: false,
      dateFormat: 'DD.MM.YYYY',
      numberFormat: 'ru-RU'
    })
  }

  setLocale(locale: Locale): void {
    this.currentLocale = locale
    const data = this.localeData.get(locale)
    if (data) {
      // Apply RTL if needed
      document.documentElement.dir = data.isRTL ? 'rtl' : 'ltr'
      document.documentElement.lang = locale
    }
  }

  getLocale(): Locale {
    return this.currentLocale
  }

  t(key: string, params?: Record<string, string | number>): string {
    const translation = this.getTranslation(key)
    if (!translation) {
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
}

export const localizationManager = new LocalizationManager()

