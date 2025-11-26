/**
 * Analytics and Telemetry System
 * Fully integrated with Firebase Analytics for production event tracking
 * 
 * Features:
 * - Automatic Firebase Analytics integration in production
 * - In-memory event buffer (last 100 events)
 * - Console logging in development mode
 * - Event type constants for consistent tracking
 * 
 * Usage:
 *   import { analytics, EVENT_TYPES } from './utils/analytics'
 *   analytics.track(EVENT_TYPES.PLAYER_LEVEL_UP, { level: 5 })
 */

export interface GameEvent {
  type: string
  data?: Record<string, any>
  timestamp: number
}

class Analytics {
  private events: GameEvent[] = []
  private enabled = true
  private firebaseAnalytics: any = null

  constructor() {
    // Initialize Firebase Analytics if available
    if (typeof window !== 'undefined' && import.meta.env.PROD) {
      this.initializeFirebaseAnalytics()
    }
  }

  private async initializeFirebaseAnalytics() {
    try {
      // Dynamically import Firebase Analytics
      const analyticsModule = await import('firebase/analytics')
      const appModule = await import('firebase/app')
      
      try {
        const app = appModule.getApp()
        this.firebaseAnalytics = analyticsModule.getAnalytics(app)
      } catch (e) {
        // App not initialized yet, try to initialize
        const { firebaseConfig } = await import('../../firebase/config')
        const app = appModule.initializeApp(firebaseConfig)
        this.firebaseAnalytics = analyticsModule.getAnalytics(app)
      }
    } catch (error) {
      // Firebase Analytics not available or not configured
      // This is fine - analytics is optional
    }
  }

  track(eventType: string, data?: Record<string, any>) {
    if (!this.enabled) return

    const event: GameEvent = {
      type: eventType,
      data,
      timestamp: Date.now()
    }

    this.events.push(event)

    // Keep only last 100 events in memory
    if (this.events.length > 100) {
      this.events.shift()
    }

    // Send to Firebase Analytics in production
    if (import.meta.env.PROD && this.firebaseAnalytics) {
      // Use dynamic import asynchronously
      import('firebase/analytics').then(({ logEvent }) => {
        try {
          logEvent(this.firebaseAnalytics, eventType, data || {})
        } catch (error) {
          // Silently fail - analytics is optional
        }
      }).catch(() => {
        // Analytics not available
      })
    } else if (import.meta.env.DEV) {
      // Log to console in development
      console.log('Analytics:', event)
    }
  }

  getEvents(): GameEvent[] {
    return [...this.events]
  }

  clearEvents() {
    this.events = []
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled
  }
}

export const analytics = new Analytics()

// Common event types
export const EVENT_TYPES = {
  PLAYER_CREATED: 'player_created',
  PLAYER_LEVEL_UP: 'player_level_up',
  SPELL_CAST: 'spell_cast',
  ENEMY_KILLED: 'enemy_killed',
  LOOT_PICKED_UP: 'loot_picked_up',
  QUEST_COMPLETED: 'quest_completed',
  GUILD_CREATED: 'guild_created',
  ITEM_PURCHASED: 'item_purchased',
  DUNGEON_ENTERED: 'dungeon_entered',
  WORLD_BOSS_SPAWNED: 'world_boss_spawned'
}

