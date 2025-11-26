/**
 * Dynamic Events System (Server-side)
 * Random world events, encounters, and special spawns
 * 
 * NOTE: This system is currently not integrated into NexusRoom.
 * To integrate:
 * 1. Import DynamicEventSystem in NexusRoom.ts
 * 2. Initialize in onCreate(): this.dynamicEventSystem = new DynamicEventSystem()
 * 3. Start in onCreate(): this.dynamicEventSystem.start()
 * 4. Stop in onDispose(): this.dynamicEventSystem.stop()
 * 5. Broadcast events to clients via room.broadcast()
 */

export interface DynamicEvent {
  id: string
  type: 'treasure_hunt' | 'enemy_swarm' | 'resource_boost' | 'boss_spawn' | 'weather_change' | 'npc_quest'
  name: string
  description: string
  biome?: string
  position?: { x: number; y: number; z: number }
  duration: number
  startTime: number
  endTime: number
  active: boolean
  participants: string[]
  rewards?: { itemId: string; quantity: number; chance: number }[]
}

export class DynamicEventSystem {
  private activeEvents: Map<string, DynamicEvent> = new Map()
  private eventTimer: NodeJS.Timeout | null = null
  private broadcastCallback?: (event: DynamicEvent) => void
  private broadcastCompletedCallback?: (eventId: string, rewards: any[]) => void

  /**
   * Set callback for broadcasting events to clients
   */
  setBroadcastCallbacks(
    onEventSpawned: (event: DynamicEvent) => void,
    onEventCompleted: (eventId: string, rewards: any[]) => void
  ): void {
    this.broadcastCallback = onEventSpawned
    this.broadcastCompletedCallback = onEventCompleted
  }

  start(): void {
    this.eventTimer = setInterval(() => {
      this.spawnRandomEvent()
    }, 300000 + Math.random() * 300000) // 5-10 minutes
  }

  stop(): void {
    if (this.eventTimer) {
      clearInterval(this.eventTimer)
      this.eventTimer = null
    }
  }

  private spawnRandomEvent(): void {
    const eventTypes: DynamicEvent['type'][] = [
      'treasure_hunt',
      'enemy_swarm',
      'resource_boost',
      'boss_spawn'
    ]

    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const duration = 300000 + Math.random() * 300000

    const event: DynamicEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      name: this.getEventName(type),
      description: this.getEventDescription(type),
      duration,
      startTime: Date.now(),
      endTime: Date.now() + duration,
      active: true,
      participants: [],
      rewards: this.getEventRewards(type)
    }

    this.activeEvents.set(event.id, event)
    
    // Broadcast event to clients
    if (this.broadcastCallback) {
      this.broadcastCallback(event)
    }

    // Auto-complete after duration
    setTimeout(() => {
      const completedEvent = this.activeEvents.get(event.id)
      if (completedEvent) {
        const rewards = this.completeEvent(event.id)
        if (this.broadcastCompletedCallback) {
          this.broadcastCompletedCallback(event.id, rewards)
        }
        this.activeEvents.delete(event.id)
      }
    }, duration)
  }

  private getEventName(type: DynamicEvent['type']): string {
    const names: Record<DynamicEvent['type'], string> = {
      treasure_hunt: 'Treasure Hunt',
      enemy_swarm: 'Enemy Swarm',
      resource_boost: 'Resource Boost',
      boss_spawn: 'World Boss Spawned',
      weather_change: 'Weather Change',
      npc_quest: 'Special NPC Quest'
    }
    return names[type] || 'Dynamic Event'
  }

  private getEventDescription(type: DynamicEvent['type']): string {
    const descriptions: Record<DynamicEvent['type'], string> = {
      treasure_hunt: 'A treasure chest has appeared somewhere in the world!',
      enemy_swarm: 'A swarm of enemies has appeared!',
      resource_boost: 'Resources are spawning at double rate!',
      boss_spawn: 'A powerful world boss has appeared!',
      weather_change: 'The weather has changed dramatically!',
      npc_quest: 'A special NPC has appeared with a unique quest!'
    }
    return descriptions[type] || 'A dynamic event is happening!'
  }

  private getEventRewards(type: DynamicEvent['type']): DynamicEvent['rewards'] {
    const rewards: Record<DynamicEvent['type'], DynamicEvent['rewards']> = {
      treasure_hunt: [
        { itemId: 'gold_coin', quantity: 100, chance: 1.0 },
        { itemId: 'rare_gem', quantity: 1, chance: 0.3 }
      ],
      enemy_swarm: [
        { itemId: 'xp_boost', quantity: 1, chance: 0.5 },
        { itemId: 'combat_loot', quantity: 5, chance: 0.8 }
      ],
      resource_boost: [
        { itemId: 'resource_bundle', quantity: 10, chance: 1.0 }
      ],
      boss_spawn: [
        { itemId: 'boss_loot', quantity: 1, chance: 1.0 },
        { itemId: 'legendary_item', quantity: 1, chance: 0.1 }
      ],
      weather_change: [],
      npc_quest: [
        { itemId: 'quest_reward', quantity: 1, chance: 1.0 }
      ]
    }
    return rewards[type] || []
  }

  getActiveEvents(): DynamicEvent[] {
    return Array.from(this.activeEvents.values()).filter(e => e.active && Date.now() < e.endTime)
  }

  joinEvent(eventId: string, playerId: string): boolean {
    const event = this.activeEvents.get(eventId)
    if (!event || !event.active) return false

    if (!event.participants.includes(playerId)) {
      event.participants.push(playerId)
    }
    return true
  }

  completeEvent(eventId: string): DynamicEvent['rewards'] {
    const event = this.activeEvents.get(eventId)
    if (!event) return []

    event.active = false
    return event.rewards || []
  }
}

