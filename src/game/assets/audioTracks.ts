/**
 * Audio Tracks System
 * Background music and ambient tracks for zones
 */

export interface AudioTrack {
  id: string
  name: string
  type: 'ambient' | 'combat' | 'boss' | 'menu'
  zoneId?: string
  loop: boolean
  volume: number
  path?: string
  data?: string // For data URLs or generated audio
}

/**
 * Zone background music tracks
 */
export const ZoneTracks: Record<string, AudioTrack> = {
  nexus_city: {
    id: 'track-nexus-city',
    name: 'Nexus City Theme',
    type: 'ambient',
    zoneId: 'nexus_city',
    loop: true,
    volume: 0.4,
  },
  quantum_peak: {
    id: 'track-quantum-peak',
    name: 'Quantum Peak Theme',
    type: 'ambient',
    zoneId: 'quantum_peak',
    loop: true,
    volume: 0.4,
  },
  void_depths: {
    id: 'track-void-depths',
    name: 'Void Depths Theme',
    type: 'ambient',
    zoneId: 'void_depths',
    loop: true,
    volume: 0.3,
  },
  neon_district: {
    id: 'track-neon-district',
    name: 'Neon District Theme',
    type: 'ambient',
    zoneId: 'neon_district',
    loop: true,
    volume: 0.5,
  },
  data_stream: {
    id: 'track-data-stream',
    name: 'Data Stream Theme',
    type: 'ambient',
    zoneId: 'data_stream',
    loop: true,
    volume: 0.4,
  },
}

/**
 * Combat music tracks
 */
export const CombatTracks: Record<string, AudioTrack> = {
  combat_normal: {
    id: 'track-combat-normal',
    name: 'Combat Theme',
    type: 'combat',
    loop: true,
    volume: 0.5,
  },
  combat_intense: {
    id: 'track-combat-intense',
    name: 'Intense Combat',
    type: 'combat',
    loop: true,
    volume: 0.6,
  },
  boss: {
    id: 'track-boss',
    name: 'Boss Battle',
    type: 'boss',
    loop: true,
    volume: 0.7,
  },
}

/**
 * Menu tracks
 */
export const MenuTracks: Record<string, AudioTrack> = {
  menu_main: {
    id: 'track-menu-main',
    name: 'Main Menu',
    type: 'menu',
    loop: true,
    volume: 0.5,
  },
  menu_character: {
    id: 'track-menu-character',
    name: 'Character Creation',
    type: 'menu',
    loop: true,
    volume: 0.4,
  },
}

class AudioTrackManager {
  private currentTrack: HTMLAudioElement | null = null
  private currentTrackId: string | null = null
  private tracks: Map<string, HTMLAudioElement> = new Map()

  /**
   * Play zone track
   */
  playZoneTrack(zoneId: string, fadeIn: boolean = true): void {
    const track = ZoneTracks[zoneId]
    if (!track) return

    this.playTrack(track.id, track.volume, track.loop, fadeIn)
  }

  /**
   * Play combat track
   */
  playCombatTrack(trackId: string = 'combat_normal', fadeIn: boolean = true): void {
    const track = CombatTracks[trackId]
    if (!track) return

    this.playTrack(track.id, track.volume, track.loop, fadeIn)
  }

  /**
   * Play boss track
   */
  playBossTrack(fadeIn: boolean = true): void {
    const track = CombatTracks.boss
    this.playTrack(track.id, track.volume, track.loop, fadeIn)
  }

  /**
   * Play menu track
   */
  playMenuTrack(trackId: string = 'menu_main', fadeIn: boolean = true): void {
    const track = MenuTracks[trackId]
    if (!track) return

    this.playTrack(track.id, track.volume, track.loop, fadeIn)
  }

  /**
   * Play track
   */
  private playTrack(trackId: string, volume: number, loop: boolean, fadeIn: boolean): void {
    // Stop current track
    if (this.currentTrack) {
      if (fadeIn) {
        this.fadeOut(this.currentTrack, () => {
          this.currentTrack?.pause()
          this.currentTrack = null
        })
      } else {
        this.currentTrack.pause()
        this.currentTrack.currentTime = 0
        this.currentTrack = null
      }
    }

    // Get or create track
    let track = this.tracks.get(trackId)
    if (!track) {
      track = new Audio()
      // In production, this would load from a path
      // track.src = `/audio/tracks/${trackId}.mp3`
      this.tracks.set(trackId, track)
    }

    this.currentTrack = track
    this.currentTrackId = trackId
    track.volume = fadeIn ? 0 : volume
    track.loop = loop

    if (fadeIn) {
      this.fadeIn(track, volume)
    } else {
      track.volume = volume
    }

    track.play().catch(() => {
      // Ignore autoplay errors
    })
  }

  /**
   * Stop current track
   */
  stopTrack(fadeOut: boolean = true): void {
    if (!this.currentTrack) return

    if (fadeOut) {
      this.fadeOut(this.currentTrack, () => {
        this.currentTrack?.pause()
        this.currentTrack = null
        this.currentTrackId = null
      })
    } else {
      this.currentTrack.pause()
      this.currentTrack.currentTime = 0
      this.currentTrack = null
      this.currentTrackId = null
    }
  }

  /**
   * Fade in
   */
  private fadeIn(audio: HTMLAudioElement, targetVolume: number, duration: number = 1000): void {
    audio.volume = 0
    const steps = 20
    const stepVolume = targetVolume / steps
    const stepTime = duration / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      audio.volume = Math.min(targetVolume, stepVolume * currentStep)

      if (currentStep >= steps) {
        clearInterval(interval)
      }
    }, stepTime)
  }

  /**
   * Fade out
   */
  private fadeOut(audio: HTMLAudioElement, callback: () => void, duration: number = 1000): void {
    const startVolume = audio.volume
    const steps = 20
    const stepVolume = startVolume / steps
    const stepTime = duration / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      audio.volume = Math.max(0, startVolume - stepVolume * currentStep)

      if (currentStep >= steps) {
        clearInterval(interval)
        callback()
      }
    }, stepTime)
  }

  /**
   * Get current track ID
   */
  getCurrentTrackId(): string | null {
    return this.currentTrackId
  }

  /**
   * Set track volume
   */
  setTrackVolume(volume: number): void {
    if (this.currentTrack) {
      this.currentTrack.volume = volume
    }
  }
}

export const audioTrackManager = new AudioTrackManager()

/**
 * Play zone background music
 */
export function playZoneTrack(zoneId: string, fadeIn: boolean = true): void {
  audioTrackManager.playZoneTrack(zoneId, fadeIn)
}

/**
 * Play combat music
 */
export function playCombatTrack(trackId: string = 'combat_normal', fadeIn: boolean = true): void {
  audioTrackManager.playCombatTrack(trackId, fadeIn)
}

/**
 * Play boss music
 */
export function playBossTrack(fadeIn: boolean = true): void {
  audioTrackManager.playBossTrack(fadeIn)
}

/**
 * Stop current track
 */
export function stopTrack(fadeOut: boolean = true): void {
  audioTrackManager.stopTrack(fadeOut)
}

