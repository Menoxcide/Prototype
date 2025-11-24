/**
 * Quality Settings System - Manages rendering quality presets
 * Supports dynamic quality adjustment based on performance
 */

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra'

export interface QualitySettings {
  preset: QualityPreset
  renderDistance: number
  shadowDistance: number
  particleCount: number
  lodDistance: {
    high: number
    medium: number
    low: number
  }
  textureQuality: 'low' | 'medium' | 'high'
  antialiasing: boolean
  shadows: boolean
  postProcessing: boolean
  instancedRendering: boolean
  maxEnemies: number
  maxLootDrops: number
}

const QUALITY_PRESETS: Record<QualityPreset, QualitySettings> = {
  low: {
    preset: 'low',
    renderDistance: 30,
    shadowDistance: 0,
    particleCount: 50,
    lodDistance: {
      high: 10,
      medium: 20,
      low: 30
    },
    textureQuality: 'low',
    antialiasing: false,
    shadows: false,
    postProcessing: false,
    instancedRendering: true,
    maxEnemies: 20,
    maxLootDrops: 30
  },
  medium: {
    preset: 'medium',
    renderDistance: 50,
    shadowDistance: 20,
    particleCount: 100,
    lodDistance: {
      high: 15,
      medium: 30,
      low: 50
    },
    textureQuality: 'medium',
    antialiasing: false,
    shadows: true,
    postProcessing: false,
    instancedRendering: true,
    maxEnemies: 50,
    maxLootDrops: 50
  },
  high: {
    preset: 'high',
    renderDistance: 75,
    shadowDistance: 40,
    particleCount: 200,
    lodDistance: {
      high: 25,
      medium: 50,
      low: 75
    },
    textureQuality: 'high',
    antialiasing: true,
    shadows: true,
    postProcessing: true,
    instancedRendering: true,
    maxEnemies: 100,
    maxLootDrops: 100
  },
  ultra: {
    preset: 'ultra',
    renderDistance: 100,
    shadowDistance: 60,
    particleCount: 500,
    lodDistance: {
      high: 40,
      medium: 70,
      low: 100
    },
    textureQuality: 'high',
    antialiasing: true,
    shadows: true,
    postProcessing: true,
    instancedRendering: true,
    maxEnemies: 200,
    maxLootDrops: 200
  }
}

class QualitySettingsManager {
  private currentSettings: QualitySettings
  private listeners: Set<(settings: QualitySettings) => void> = new Set()

  constructor() {
    // Load from localStorage or default to medium
    const saved = localStorage.getItem('qualitySettings')
    if (saved) {
      try {
        this.currentSettings = { ...QUALITY_PRESETS.medium, ...JSON.parse(saved) }
      } catch {
        this.currentSettings = QUALITY_PRESETS.medium
      }
    } else {
      this.currentSettings = QUALITY_PRESETS.medium
    }
  }

  getSettings(): QualitySettings {
    return { ...this.currentSettings }
  }

  setPreset(preset: QualityPreset): void {
    this.currentSettings = { ...QUALITY_PRESETS[preset] }
    this.save()
    this.notifyListeners()
  }

  updateSettings(updates: Partial<QualitySettings>): void {
    this.currentSettings = { ...this.currentSettings, ...updates }
    this.save()
    this.notifyListeners()
  }

  subscribe(listener: (settings: QualitySettings) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentSettings))
  }

  private save(): void {
    localStorage.setItem('qualitySettings', JSON.stringify(this.currentSettings))
  }

  /**
   * Automatically adjust quality based on performance
   */
  adjustQualityBasedOnPerformance(fps: number): void {
    if (fps < 30 && this.currentSettings.preset !== 'low') {
      this.setPreset('low')
    } else if (fps < 45 && this.currentSettings.preset === 'ultra') {
      this.setPreset('high')
    } else if (fps < 50 && this.currentSettings.preset === 'high') {
      this.setPreset('medium')
    } else if (fps >= 60 && this.currentSettings.preset === 'low') {
      this.setPreset('medium')
    }
  }
}

// Singleton instance
let qualityManager: QualitySettingsManager | null = null

export function getQualityManager(): QualitySettingsManager {
  if (!qualityManager) {
    qualityManager = new QualitySettingsManager()
  }
  return qualityManager
}

export function getQualitySettings(): QualitySettings {
  return getQualityManager().getSettings()
}

export function setQualityPreset(preset: QualityPreset): void {
  getQualityManager().setPreset(preset)
}

export function updateQualitySettings(updates: Partial<QualitySettings>): void {
  getQualityManager().updateSettings(updates)
}

