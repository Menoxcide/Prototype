/**
 * Sound Manager - Handles all game audio
 * Provides sound effects and music management
 */

export interface SoundDefinition {
  id: string
  type: 'effect' | 'music' | 'ambient'
  volume?: number
  loop?: boolean
  path?: string
  data?: string // For data URLs or generated sounds
}

class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private music: HTMLAudioElement | null = null
  private masterVolume: number = 0.7
  private effectsVolume: number = 0.8
  private musicVolume: number = 0.5
  private enabled: boolean = true

  /**
   * Generate procedural sound effect
   */
  generateSound(id: string, type: 'hit' | 'explosion' | 'spell' | 'pickup' | 'ui'): HTMLAudioElement {
    if (this.sounds.has(id)) {
      return this.sounds.get(id)!
    }

    // Create audio context for procedural sound generation
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const duration = type === 'explosion' ? 0.5 : type === 'spell' ? 0.3 : 0.1
    const sampleRate = audioContext.sampleRate
    const frameCount = sampleRate * duration
    const buffer = audioContext.createBuffer(1, frameCount, sampleRate)
    const data = buffer.getChannelData(0)

    // Generate sound based on type
    switch (type) {
      case 'hit':
        // Sharp impact sound
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate
          data[i] = Math.sin(2 * Math.PI * 200 * t) * Math.exp(-t * 10) * 0.5
        }
        break
      case 'explosion':
        // Low rumble with high frequency burst
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate
          data[i] = (Math.sin(2 * Math.PI * 50 * t) * 0.3 + 
                     Math.sin(2 * Math.PI * 500 * t) * Math.exp(-t * 5) * 0.7) * Math.exp(-t * 2)
        }
        break
      case 'spell':
        // Magical whoosh / cyberpunk tech sound
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate
          const freq = 300 + t * 200
          // Add cyberpunk flavor with harmonics
          data[i] = (Math.sin(2 * Math.PI * freq * t) * 0.6 +
                     Math.sin(2 * Math.PI * freq * 2 * t) * 0.3 +
                     Math.sin(2 * Math.PI * freq * 3 * t) * 0.1) * Math.exp(-t * 3) * 0.6
        }
        break
      case 'pickup':
        // Pleasant chime
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate
          data[i] = Math.sin(2 * Math.PI * 400 * t) * Math.exp(-t * 5) * 0.4
        }
        break
      case 'ui':
        // Soft click
        for (let i = 0; i < frameCount; i++) {
          const t = i / sampleRate
          data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 20) * 0.3
        }
        break
    }

    // Convert to audio element
    const audio = new Audio()
    // Note: In a real implementation, you'd convert the buffer to a blob URL
    // For now, we'll use placeholder paths
    this.sounds.set(id, audio)
    return audio
  }

  /**
   * Play sound effect
   */
  playSound(id: string, volume: number = 1.0): void {
    if (!this.enabled) return

    const sound = this.sounds.get(id)
    if (sound) {
      sound.volume = volume * this.effectsVolume * this.masterVolume
      sound.currentTime = 0
      sound.play().catch(() => {
        // Ignore autoplay errors
      })
    }
  }

  /**
   * Play music
   */
  playMusic(id: string, loop: boolean = true): void {
    if (!this.enabled) return

    const music = this.sounds.get(id)
    if (music) {
      this.music = music
      music.volume = this.musicVolume * this.masterVolume
      music.loop = loop
      music.play().catch(() => {
        // Ignore autoplay errors
      })
    }
  }

  /**
   * Stop music
   */
  stopMusic(): void {
    if (this.music) {
      this.music.pause()
      this.music.currentTime = 0
      this.music = null
    }
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Set effects volume
   */
  setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume))
  }

  /**
   * Set music volume
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume))
    if (this.music) {
      this.music.volume = this.musicVolume * this.masterVolume
    }
  }

  /**
   * Enable/disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled && this.music) {
      this.stopMusic()
    }
  }

  /**
   * Preload common sounds
   */
  async preloadSounds(): Promise<void> {
    // Generate common sound effects
    this.generateSound('hit', 'hit')
    this.generateSound('explosion', 'explosion')
    this.generateSound('spell-cast', 'spell')
    this.generateSound('pickup', 'pickup')
    this.generateSound('ui-click', 'ui')
    this.generateSound('ui-hover', 'ui')
    this.generateSound('spell-quantum-bolt', 'spell')
    this.generateSound('spell-plasma-burst', 'explosion')
    this.generateSound('spell-void-strike', 'spell')
    this.generateSound('spell-heal', 'spell')
    this.generateSound('spell-teleport', 'spell')
    this.generateSound('quest-complete', 'pickup')
    this.generateSound('level-up', 'pickup')
    
    // Preload expanded sounds
    const { preloadExpandedSounds } = await import('./expandedSounds')
    preloadExpandedSounds()
  }
}

export const soundManager = new SoundManager()

