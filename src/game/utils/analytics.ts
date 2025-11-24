// Analytics and telemetry for game events
// Can be integrated with services like Google Analytics, Mixpanel, etc.

export interface GameEvent {
  type: string
  data?: Record<string, any>
  timestamp: number
}

class Analytics {
  private events: GameEvent[] = []
  private enabled = true

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

    // In production, send to analytics service
    if (import.meta.env.PROD) {
      // TODO: Send to analytics service
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

