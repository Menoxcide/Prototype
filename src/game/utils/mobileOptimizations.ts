/**
 * Mobile Optimizations - Haptic feedback, responsive UI, battery optimization, etc.
 */

import { isMobile } from '../data/config'
import { getQualityManager, setQualityPreset } from './qualitySettings'

/**
 * Enhanced mobile device detection
 */
export function isMobileDevice(): boolean {
  return isMobile()
}

/**
 * Device capability information
 */
export interface DeviceCapabilities {
  webglVersion: 'webgl' | 'webgl2' | null
  gpuTier: 'low' | 'medium' | 'high' | 'unknown'
  maxTextureSize: number
  maxVertexAttributes: number
  maxVertexUniformVectors: number
  maxFragmentUniformVectors: number
  maxTextureImageUnits: number
  renderer: string
  vendor: string
  score: number // 0-100 device capability score
}

/**
 * Detect WebGL version
 */
function detectWebGLVersion(): 'webgl' | 'webgl2' | null {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  
  if (!gl) return null
  
  return gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl'
}

/**
 * Get GPU tier based on WebGL renderer info
 */
function getGPUTier(gl: WebGLRenderingContext | WebGL2RenderingContext): 'low' | 'medium' | 'high' | 'unknown' {
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  if (!debugInfo) return 'unknown'
  
  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
  
  // High-end GPUs
  if (
    renderer.includes('adreno 6') ||
    renderer.includes('adreno 7') ||
    renderer.includes('mali-g7') ||
    renderer.includes('mali-g78') ||
    renderer.includes('apple a') ||
    renderer.includes('apple m') ||
    renderer.includes('nvidia') ||
    renderer.includes('amd') ||
    renderer.includes('intel iris')
  ) {
    return 'high'
  }
  
  // Medium GPUs
  if (
    renderer.includes('adreno 5') ||
    renderer.includes('adreno 4') ||
    renderer.includes('mali-g5') ||
    renderer.includes('mali-g6') ||
    renderer.includes('powervr')
  ) {
    return 'medium'
  }
  
  // Low-end GPUs (default)
  return 'low'
}

/**
 * Calculate device capability score (0-100)
 */
function calculateDeviceScore(capabilities: DeviceCapabilities): number {
  let score = 50 // Base score
  
  // WebGL version bonus
  if (capabilities.webglVersion === 'webgl2') score += 20
  else if (capabilities.webglVersion === 'webgl') score += 10
  
  // GPU tier bonus
  if (capabilities.gpuTier === 'high') score += 30
  else if (capabilities.gpuTier === 'medium') score += 15
  else if (capabilities.gpuTier === 'low') score += 0
  
  // Texture size bonus (normalize to 0-10 points)
  const maxTextureSize = Math.min(capabilities.maxTextureSize, 8192)
  score += (maxTextureSize / 8192) * 10
  
  // Cap at 100
  return Math.min(100, Math.max(0, score))
}

/**
 * Detect device capabilities
 */
export function detectDeviceCapabilities(): DeviceCapabilities {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') as WebGLRenderingContext | WebGL2RenderingContext | null
  
  if (!gl) {
    return {
      webglVersion: null,
      gpuTier: 'unknown',
      maxTextureSize: 0,
      maxVertexAttributes: 0,
      maxVertexUniformVectors: 0,
      maxFragmentUniformVectors: 0,
      maxTextureImageUnits: 0,
      renderer: 'unknown',
      vendor: 'unknown',
      score: 0
    }
  }
  
  const webglVersion = detectWebGLVersion()
  const gpuTier = getGPUTier(gl)
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  
  const capabilities: DeviceCapabilities = {
    webglVersion,
    gpuTier,
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
    maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
    renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
    vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
    score: 0
  }
  
  capabilities.score = calculateDeviceScore(capabilities)
  
  return capabilities
}

// Cache device capabilities
let cachedCapabilities: DeviceCapabilities | null = null

/**
 * Get device capabilities (cached)
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  if (cachedCapabilities) {
    return cachedCapabilities
  }
  
  cachedCapabilities = detectDeviceCapabilities()
  
  // Store in localStorage for future sessions
  try {
    localStorage.setItem('deviceCapabilities', JSON.stringify(cachedCapabilities))
  } catch (e) {
    // Ignore localStorage errors
  }
  
  return cachedCapabilities
}

/**
 * Load device capabilities from cache
 */
export function loadCachedDeviceCapabilities(): DeviceCapabilities | null {
  if (cachedCapabilities) {
    return cachedCapabilities
  }
  
  try {
    const cached = localStorage.getItem('deviceCapabilities')
    if (cached) {
      cachedCapabilities = JSON.parse(cached)
      return cachedCapabilities
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  
  return null
}

/**
 * Mobile optimization flags
 */
export interface MobileOptimizationFlags {
  isMobile: boolean
  targetFPS: 30 | 60
  enablePostProcessing: boolean
  enableShadows: boolean
  enableAntialiasing: boolean
  textureAtlasSize: 1024 | 2048
  devicePixelRatio: 1 | 2
  lodMultiplier: number
  particleLimit: number
  renderDistanceMultiplier: number
  batteryOptimized: boolean
  networkOptimized: boolean
  deviceCapabilities?: DeviceCapabilities
}

/**
 * Get mobile optimization flags based on device capabilities
 */
export function getMobileOptimizationFlags(): MobileOptimizationFlags {
  const mobile = isMobileDevice()
  
  if (!mobile) {
    // Desktop defaults
    return {
      isMobile: false,
      targetFPS: 60,
      enablePostProcessing: true,
      enableShadows: true,
      enableAntialiasing: true,
      textureAtlasSize: 2048,
      devicePixelRatio: 2,
      lodMultiplier: 1.0,
      particleLimit: 200,
      renderDistanceMultiplier: 1.0,
      batteryOptimized: false,
      networkOptimized: false
    }
  }

  // Check battery level
  const batteryLevel = batteryMonitor.getLevel()
  const isCharging = batteryMonitor.isCharging()
  const batteryOptimized = batteryLevel !== null && batteryLevel < 0.2 && !isCharging

  // Check network connection
  const networkType = networkMonitor.getConnectionType()
  const effectiveType = networkMonitor.getEffectiveType()
  const networkOptimized = networkType === 'cellular' || 
                          effectiveType === 'slow-2g' || 
                          effectiveType === '2g' ||
                          effectiveType === '3g'

  // Get device capabilities
  const deviceCapabilities = getDeviceCapabilities()
  
  // Determine target FPS based on device capabilities
  // High-end mobile can handle 60fps, low-end should use 30fps
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const pixelCount = screenWidth * screenHeight
  
  // Use device capability score to determine FPS
  let targetFPS: 30 | 60 = 30
  if (!batteryOptimized) {
    if (deviceCapabilities.score >= 70 || (deviceCapabilities.gpuTier === 'high' && pixelCount < 2000000)) {
      targetFPS = 60
    } else if (deviceCapabilities.score >= 50 && pixelCount < 1500000) {
      targetFPS = 60
    }
  }

  // Apply battery and network optimizations
  const lodMultiplier = batteryOptimized || networkOptimized ? 0.5 : 0.7
  const renderDistanceMultiplier = batteryOptimized || networkOptimized ? 0.6 : 0.8
  const particleLimit = batteryOptimized ? 25 : (networkOptimized ? 35 : 50)
  const enablePostProcessing = !batteryOptimized && !networkOptimized
  const enableShadows = !batteryOptimized && targetFPS === 60

  return {
    isMobile: true,
    targetFPS,
    enablePostProcessing,
    enableShadows,
    enableAntialiasing: false,
    textureAtlasSize: batteryOptimized ? 1024 : 1024, // Always use 1024 on mobile
    devicePixelRatio: 1, // Use 1 on mobile for better performance
    lodMultiplier,
    particleLimit,
    renderDistanceMultiplier,
    batteryOptimized,
    networkOptimized,
    deviceCapabilities
  }
}

/**
 * Apply mobile optimizations to quality settings
 */
export function applyMobileOptimizations(): void {
  if (!isMobileDevice()) return

  const flags = getMobileOptimizationFlags()
  const qualityManager = getQualityManager()
  const currentSettings = qualityManager.getSettings()
  const deviceCapabilities = flags.deviceCapabilities || getDeviceCapabilities()

  // Auto-set quality preset based on device capabilities
  let targetPreset: 'low' | 'medium' | 'high' = 'low'
  
  if (deviceCapabilities.score >= 70 && deviceCapabilities.gpuTier === 'high') {
    targetPreset = 'medium'
  } else if (deviceCapabilities.score >= 50 && deviceCapabilities.gpuTier === 'medium') {
    targetPreset = 'low'
  } else {
    targetPreset = 'low'
  }
  
  // Override to low if battery optimized
  if (flags.batteryOptimized) {
    targetPreset = 'low'
  }
  
  // Apply preset if different from current
  if (currentSettings.preset !== targetPreset) {
    setQualityPreset(targetPreset)
  }

  // Apply mobile-specific overrides
  qualityManager.updateSettings({
    postProcessing: flags.enablePostProcessing,
    shadows: flags.enableShadows,
    antialiasing: flags.enableAntialiasing,
    particleCount: flags.particleLimit,
    renderDistance: Math.floor(currentSettings.renderDistance * flags.renderDistanceMultiplier),
    lodDistance: {
      high: Math.floor(currentSettings.lodDistance.high * flags.lodMultiplier),
      medium: Math.floor(currentSettings.lodDistance.medium * flags.lodMultiplier),
      low: Math.floor(currentSettings.lodDistance.low * flags.lodMultiplier)
    }
  })
}

// Auto-apply mobile optimizations on module load if on mobile
if (isMobileDevice()) {
  // Load cached device capabilities first
  loadCachedDeviceCapabilities()
  
  // Apply optimizations after a short delay to ensure quality manager is initialized
  setTimeout(() => {
    // Detect device capabilities if not cached
    if (!cachedCapabilities) {
      getDeviceCapabilities()
    }
    
    applyMobileOptimizations()
    
    // Monitor battery and network changes
    batteryMonitor.onLevelChange((level) => {
      if (level < 0.2 && !batteryMonitor.isCharging()) {
        applyMobileOptimizations()
      }
    })

    networkMonitor.onConnectionChange(() => {
      applyMobileOptimizations()
    })
  }, 100)
}

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

/**
 * Frame rate capping utility
 */
export interface FrameRateCap {
  cap(targetFPS: number, callback: () => void): () => void
}

class FrameRateCapImpl implements FrameRateCap {
  private lastTime: number = 0
  private frameId: number | null = null
  private isRunning: boolean = false

  cap(targetFPS: number, callback: () => void): () => void {
    if (this.isRunning) {
      this.stop()
    }

    this.isRunning = true
    const interval = 1000 / targetFPS
    this.lastTime = performance.now()

    const frame = (currentTime: number) => {
      if (!this.isRunning) return

      const deltaTime = currentTime - this.lastTime

      if (deltaTime >= interval) {
        this.lastTime = currentTime - (deltaTime % interval)
        callback()
      }

      this.frameId = requestAnimationFrame(frame)
    }

    this.frameId = requestAnimationFrame(frame)

    // Return stop function
    return () => this.stop()
  }

  private stop(): void {
    this.isRunning = false
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
  }
}

export const frameRateCap = new FrameRateCapImpl()

/**
 * Create a throttled version of a function that respects frame rate cap
 */
export function createThrottledFrameCallback(
  targetFPS: number,
  callback: () => void
): () => void {
  if (!isMobileDevice() || targetFPS >= 60) {
    // No throttling needed for desktop or high FPS
    return callback
  }

  let lastTime = 0
  const interval = 1000 / targetFPS

  return () => {
    const currentTime = performance.now()
    if (currentTime - lastTime >= interval) {
      lastTime = currentTime
      callback()
    }
  }
}

