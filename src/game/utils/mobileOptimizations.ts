/**
 * Mobile Optimizations - Haptic feedback, responsive UI, battery optimization, etc.
 */

export interface HapticFeedback {
  light(): void
  medium(): void
  heavy(): void
  success(): void
  warning(): void
  error(): void
}

class HapticFeedbackImpl implements HapticFeedback {
  private vibrate(pattern: number | number[]): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  }

  light(): void {
    this.vibrate(10)
  }

  medium(): void {
    this.vibrate(20)
  }

  heavy(): void {
    this.vibrate(30)
  }

  success(): void {
    this.vibrate([10, 50, 10])
  }

  warning(): void {
    this.vibrate([20, 50, 20])
  }

  error(): void {
    this.vibrate([30, 100, 30, 100, 30])
  }
}

export const hapticFeedback = new HapticFeedbackImpl()

export interface ResponsiveUISettings {
  scale: number
  fontSize: number
  buttonSize: number
  spacing: number
}

export function calculateResponsiveScale(): ResponsiveUISettings {
  const width = window.innerWidth
  const height = window.innerHeight
  const minDimension = Math.min(width, height)
  
  // Base scale for mobile (375px width)
  const baseWidth = 375
  const scale = Math.max(0.8, Math.min(1.5, minDimension / baseWidth))
  
  return {
    scale,
    fontSize: 14 * scale,
    buttonSize: 44 * scale, // Minimum touch target
    spacing: 8 * scale
  }
}

export interface BatteryMonitor {
  getLevel(): number | null
  isCharging(): boolean | null
  onLevelChange(callback: (level: number) => void): void
  onChargingChange(callback: (charging: boolean) => void): void
}

class BatteryMonitorImpl implements BatteryMonitor {
  private battery: any = null
  private levelCallbacks: Array<(level: number) => void> = []
  private chargingCallbacks: Array<(charging: boolean) => void> = []

  constructor() {
    if ('getBattery' in navigator) {
      // @ts-ignore
      navigator.getBattery().then((battery: any) => {
        this.battery = battery
        battery.addEventListener('levelchange', () => {
          this.levelCallbacks.forEach(cb => cb(battery.level))
        })
        battery.addEventListener('chargingchange', () => {
          this.chargingCallbacks.forEach(cb => cb(battery.charging))
        })
      })
    }
  }

  getLevel(): number | null {
    return this.battery ? this.battery.level : null
  }

  isCharging(): boolean | null {
    return this.battery ? this.battery.charging : null
  }

  onLevelChange(callback: (level: number) => void): void {
    this.levelCallbacks.push(callback)
    if (this.battery) {
      callback(this.battery.level)
    }
  }

  onChargingChange(callback: (charging: boolean) => void): void {
    this.chargingCallbacks.push(callback)
    if (this.battery) {
      callback(this.battery.charging)
    }
  }
}

export const batteryMonitor = new BatteryMonitorImpl()

export interface NetworkMonitor {
  getConnectionType(): 'wifi' | 'cellular' | 'ethernet' | 'unknown'
  getEffectiveType(): 'slow-2g' | '2g' | '3g' | '4g' | 'unknown'
  onConnectionChange(callback: (type: string) => void): void
}

class NetworkMonitorImpl implements NetworkMonitor {
  private connection: any = null
  private callbacks: Array<(type: string) => void> = []

  constructor() {
    // @ts-ignore
    if ('connection' in navigator) {
      // @ts-ignore
      this.connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (this.connection) {
        this.connection.addEventListener('change', () => {
          this.callbacks.forEach(cb => cb(this.getConnectionType()))
        })
      }
    }
  }

  getConnectionType(): 'wifi' | 'cellular' | 'ethernet' | 'unknown' {
    if (!this.connection) return 'unknown'
    const type = this.connection.type || this.connection.effectiveType
    if (type === 'wifi') return 'wifi'
    if (type === 'cellular' || type === '2g' || type === '3g' || type === '4g') return 'cellular'
    if (type === 'ethernet') return 'ethernet'
    return 'unknown'
  }

  getEffectiveType(): 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' {
    if (!this.connection) return 'unknown'
    const effectiveType = this.connection.effectiveType
    if (effectiveType === 'slow-2g') return 'slow-2g'
    if (effectiveType === '2g') return '2g'
    if (effectiveType === '3g') return '3g'
    if (effectiveType === '4g') return '4g'
    return 'unknown'
  }

  onConnectionChange(callback: (type: string) => void): void {
    this.callbacks.push(callback)
    if (this.connection) {
      callback(this.getConnectionType())
    }
  }
}

export const networkMonitor = new NetworkMonitorImpl()

export interface AppLifecycleManager {
  isVisible(): boolean
  onVisibilityChange(callback: (visible: boolean) => void): void
  onPause(callback: () => void): void
  onResume(callback: () => void): void
}

class AppLifecycleManagerImpl implements AppLifecycleManager {
  private visibilityCallbacks: Array<(visible: boolean) => void> = []
  private pauseCallbacks: Array<() => void> = []
  private resumeCallbacks: Array<() => void> = []
  private wasVisible = true

  constructor() {
    document.addEventListener('visibilitychange', () => {
      const visible = !document.hidden
      this.visibilityCallbacks.forEach(cb => cb(visible))
      
      if (!visible && this.wasVisible) {
        this.pauseCallbacks.forEach(cb => cb())
      } else if (visible && !this.wasVisible) {
        this.resumeCallbacks.forEach(cb => cb())
      }
      
      this.wasVisible = visible
    })
  }

  isVisible(): boolean {
    return !document.hidden
  }

  onVisibilityChange(callback: (visible: boolean) => void): void {
    this.visibilityCallbacks.push(callback)
    callback(this.isVisible())
  }

  onPause(callback: () => void): void {
    this.pauseCallbacks.push(callback)
  }

  onResume(callback: () => void): void {
    this.resumeCallbacks.push(callback)
  }
}

export const appLifecycleManager = new AppLifecycleManagerImpl()

