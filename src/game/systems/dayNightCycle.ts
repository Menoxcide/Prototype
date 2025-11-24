/**
 * Day/Night Cycle System
 * Dynamic lighting and sky changes based on time of day
 */

import * as THREE from 'three'

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night'

export interface DayNightConfig {
  cycleDuration: number // Duration of full cycle in seconds
  currentTime: number // Current time in cycle (0-1)
  enabled: boolean
}

export class DayNightCycle {
  private config: DayNightConfig
  private ambientLight: THREE.AmbientLight
  private directionalLight: THREE.DirectionalLight
  private skyColor: THREE.Color = new THREE.Color()
  private sunPosition: THREE.Vector3 = new THREE.Vector3()

  constructor(
    ambientLight: THREE.AmbientLight,
    directionalLight: THREE.DirectionalLight,
    config?: Partial<DayNightConfig>
  ) {
    this.ambientLight = ambientLight
    this.directionalLight = directionalLight
    this.config = {
      cycleDuration: 300, // 5 minutes default
      currentTime: 0.5, // Start at noon
      enabled: true,
      ...config
    }
  }

  /**
   * Update time of day
   */
  update(delta: number): void {
    if (!this.config.enabled) return

    this.config.currentTime += delta / this.config.cycleDuration
    if (this.config.currentTime >= 1) {
      this.config.currentTime = 0
    }

    this.updateLighting()
  }

  /**
   * Update lighting based on time of day
   */
  private updateLighting(): void {
    const time = this.config.currentTime
    const timeOfDay = this.getTimeOfDay()

    // Sun position (orbital)
    const sunAngle = time * Math.PI * 2 - Math.PI / 2
    this.sunPosition.set(
      Math.cos(sunAngle) * 50,
      Math.sin(sunAngle) * 50,
      0
    )
    this.directionalLight.position.copy(this.sunPosition)
    this.directionalLight.lookAt(0, 0, 0)

    // Lighting based on time of day
    switch (timeOfDay) {
      case 'dawn':
        // Warm orange/red
        this.ambientLight.intensity = 0.4
        this.ambientLight.color.setRGB(1, 0.6, 0.4)
        this.directionalLight.intensity = 0.5
        this.directionalLight.color.setRGB(1, 0.7, 0.5)
        this.skyColor.setRGB(0.3, 0.2, 0.1)
        break

      case 'day':
        // Bright white/cyan
        this.ambientLight.intensity = 0.6
        this.ambientLight.color.setRGB(0.8, 0.9, 1.0)
        this.directionalLight.intensity = 1.0
        this.directionalLight.color.setRGB(1, 1, 0.95)
        this.skyColor.setRGB(0.2, 0.3, 0.4)
        break

      case 'dusk':
        // Purple/pink
        this.ambientLight.intensity = 0.3
        this.ambientLight.color.setRGB(0.6, 0.4, 0.8)
        this.directionalLight.intensity = 0.4
        this.directionalLight.color.setRGB(0.8, 0.5, 0.9)
        this.skyColor.setRGB(0.2, 0.1, 0.3)
        break

      case 'night':
        // Dark blue/purple with neon accents
        this.ambientLight.intensity = 0.2
        this.ambientLight.color.setRGB(0.1, 0.1, 0.3)
        this.directionalLight.intensity = 0.1
        this.directionalLight.color.setRGB(0.2, 0.2, 0.5)
        this.skyColor.setRGB(0.05, 0.05, 0.15)
        break
    }
  }

  /**
   * Get current time of day
   */
  getTimeOfDay(): TimeOfDay {
    const time = this.config.currentTime
    if (time < 0.25) return 'dawn'
    if (time < 0.5) return 'day'
    if (time < 0.75) return 'dusk'
    return 'night'
  }

  /**
   * Get sky color
   */
  getSkyColor(): THREE.Color {
    return this.skyColor.clone()
  }

  /**
   * Get sun position
   */
  getSunPosition(): THREE.Vector3 {
    return this.sunPosition.clone()
  }

  /**
   * Set time of day manually
   */
  setTime(time: number): void {
    this.config.currentTime = Math.max(0, Math.min(1, time))
    this.updateLighting()
  }

  /**
   * Set time of day by name
   */
  setTimeOfDay(timeOfDay: TimeOfDay): void {
    const times: Record<TimeOfDay, number> = {
      dawn: 0.125,
      day: 0.375,
      dusk: 0.625,
      night: 0.875
    }
    this.setTime(times[timeOfDay])
  }

  /**
   * Enable/disable cycle
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  /**
   * Get current time (0-1)
   */
  getCurrentTime(): number {
    return this.config.currentTime
  }
}

