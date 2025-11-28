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

import { getFirebaseApp } from '../../firebase/auth'

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
      // Dynamically import Firebase Analytics (only this module, not firebase/app)
      // This keeps analytics code-split since it's only used in production
      const analyticsModule = await import('firebase/analytics')
      
      // Get the Firebase app from the auth module (already initialized)
      const app = getFirebaseApp()
      
      if (app) {
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
      // Use the already-imported analytics module
      // Since we initialize it in initializeFirebaseAnalytics, we can use it directly
      // But we need to import it dynamically to avoid static import issues
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
  WORLD_BOSS_SPAWNED: 'world_boss_spawned',
  // Performance metrics
  WEB_VITAL_LCP: 'web_vital_lcp',
  WEB_VITAL_FID: 'web_vital_fid',
  WEB_VITAL_CLS: 'web_vital_cls',
  PERFORMANCE_MARK: 'performance_mark',
  PERFORMANCE_BUDGET_EXCEEDED: 'performance_budget_exceeded'
}

/**
 * Track performance mark
 */
export function trackPerformanceMark(name: string, value: number, metadata?: Record<string, any>) {
  analytics.track(EVENT_TYPES.PERFORMANCE_MARK, {
    name,
    value,
    ...metadata
  })
}

/**
 * Track performance budget exceeded
 */
export function trackPerformanceBudgetExceeded(budget: string, actual: number, threshold: number) {
  analytics.track(EVENT_TYPES.PERFORMANCE_BUDGET_EXCEEDED, {
    budget,
    actual,
    threshold,
    exceededBy: actual - threshold
  })
}

