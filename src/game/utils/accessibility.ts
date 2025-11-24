/**
 * Accessibility Features - Text scaling, color-blind support, audio alternatives, etc.
 */

export interface AccessibilitySettings {
  textScale: number
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia'
  audioSubtitles: boolean
  subtitleSize: number
  subtitleColor: string
  subtitleBackground: string
  timingWindow: number // Extended timing windows
  autoComplete: boolean
  keyboardNavigation: boolean
  flashingEffects: boolean
  highContrast: boolean
}

const DEFAULT_ACCESSIBILITY: AccessibilitySettings = {
  textScale: 1.0,
  colorBlindMode: 'none',
  audioSubtitles: false,
  subtitleSize: 16,
  subtitleColor: '#ffffff',
  subtitleBackground: '#000000',
  timingWindow: 1.0,
  autoComplete: false,
  keyboardNavigation: false,
  flashingEffects: true,
  highContrast: false
}

class AccessibilityManager {
  private settings: AccessibilitySettings = { ...DEFAULT_ACCESSIBILITY }

  getSettings(): AccessibilitySettings {
    return { ...this.settings }
  }

  updateSettings(updates: Partial<AccessibilitySettings>): void {
    this.settings = { ...this.settings, ...updates }
    this.applySettings()
  }

  private applySettings(): void {
    // Apply text scaling
    document.documentElement.style.setProperty('--text-scale', this.settings.textScale.toString())
    
    // Apply color-blind filters
    if (this.settings.colorBlindMode !== 'none') {
      this.applyColorBlindFilter(this.settings.colorBlindMode)
    } else {
      this.removeColorBlindFilter()
    }
    
    // Apply high contrast
    if (this.settings.highContrast) {
      document.body.classList.add('high-contrast')
    } else {
      document.body.classList.remove('high-contrast')
    }
  }

  private applyColorBlindFilter(mode: 'protanopia' | 'deuteranopia' | 'tritanopia'): void {
    // Color-blind filter CSS
    const filterMap = {
      protanopia: 'url(#protanopia)',
      deuteranopia: 'url(#deuteranopia)',
      tritanopia: 'url(#tritanopia)'
    }
    
    document.documentElement.style.setProperty('--color-blind-filter', filterMap[mode])
  }

  private removeColorBlindFilter(): void {
    document.documentElement.style.removeProperty('--color-blind-filter')
  }

  getTextScale(): number {
    return this.settings.textScale
  }

  scaleText(baseSize: number): number {
    return baseSize * this.settings.textScale
  }

  shouldShowFlashingEffects(): boolean {
    return this.settings.flashingEffects
  }

  getTimingWindowMultiplier(): number {
    return this.settings.timingWindow
  }
}

export const accessibilityManager = new AccessibilityManager()

export interface SubtitleManager {
  showSubtitle(text: string, duration?: number): void
  hideSubtitle(): void
  setSubtitleSettings(size: number, color: string, background: string): void
}

class SubtitleManagerImpl implements SubtitleManager {
  private subtitleElement: HTMLDivElement | null = null
  private currentTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.createSubtitleElement()
  }

  private createSubtitleElement(): void {
    this.subtitleElement = document.createElement('div')
    this.subtitleElement.id = 'game-subtitles'
    this.subtitleElement.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      max-width: 80%;
      text-align: center;
      z-index: 10000;
      pointer-events: none;
      display: none;
    `
    document.body.appendChild(this.subtitleElement)
  }

  showSubtitle(text: string, duration: number = 3000): void {
    if (!this.subtitleElement) return

    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout)
    }

    this.subtitleElement.textContent = text
    this.subtitleElement.style.display = 'block'

    this.currentTimeout = setTimeout(() => {
      this.hideSubtitle()
    }, duration)
  }

  hideSubtitle(): void {
    if (this.subtitleElement) {
      this.subtitleElement.style.display = 'none'
    }
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout)
      this.currentTimeout = null
    }
  }

  setSubtitleSettings(size: number, color: string, background: string): void {
    if (!this.subtitleElement) return

    this.subtitleElement.style.fontSize = `${size}px`
    this.subtitleElement.style.color = color
    this.subtitleElement.style.background = background
  }
}

export const subtitleManager = new SubtitleManagerImpl()

