import { getPerformanceConfig, isMobile } from '../data/config'

export interface PerformanceSettings {
  maxParticles: number
  enableShadows: boolean
  shadowQuality: 'low' | 'medium' | 'high'
  renderDistance: number
  targetFPS: number
  enableLOD: boolean
  particleQuality: 'low' | 'medium' | 'high'
  textureQuality: 'low' | 'medium' | 'high'
}

let currentSettings: PerformanceSettings | null = null

export function getPerformanceSettings(): PerformanceSettings {
  if (currentSettings) return currentSettings

  const config = getPerformanceConfig()
  const mobile = isMobile()

  currentSettings = {
    maxParticles: config.maxParticles,
    enableShadows: config.enableShadows,
    shadowQuality: config.shadowQuality,
    renderDistance: config.renderDistance,
    targetFPS: config.targetFPS,
    enableLOD: mobile,
    particleQuality: mobile ? 'low' : 'high',
    textureQuality: mobile ? 'low' : 'high'
  }

  return currentSettings
}

export function updatePerformanceSettings(settings: Partial<PerformanceSettings>) {
  if (currentSettings) {
    currentSettings = { ...currentSettings, ...settings }
  }
}

export function adjustPerformanceForFPS(currentFPS: number) {
  const settings = getPerformanceSettings()
  
  if (currentFPS < settings.targetFPS * 0.8) {
    // FPS is low, reduce quality
    updatePerformanceSettings({
      maxParticles: Math.max(10, settings.maxParticles * 0.7),
      particleQuality: 'low',
      renderDistance: Math.max(30, settings.renderDistance * 0.8)
    })
  } else if (currentFPS > settings.targetFPS * 1.2) {
    // FPS is high, can increase quality
    updatePerformanceSettings({
      maxParticles: Math.min(200, settings.maxParticles * 1.1),
      renderDistance: Math.min(100, settings.renderDistance * 1.1)
    })
  }
}

export function getLODLevel(distance: number, renderDistance: number): 'high' | 'medium' | 'low' {
  if (!getPerformanceSettings().enableLOD) return 'high'
  
  const ratio = distance / renderDistance
  if (ratio < 0.3) return 'high'
  if (ratio < 0.7) return 'medium'
  return 'low'
}

