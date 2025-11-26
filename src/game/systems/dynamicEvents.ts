/**
 * Dynamic Events System (Client-side)
 * Random world events, encounters, and special spawns
 * 
 * NOTE: This system is currently not integrated into the game.
 * The server has a DynamicEventSystem but it's not connected to NexusRoom.
 * This client-side system could be used for:
 * - Client-side event rendering and UI
 * - Event notifications and visual feedback
 * - Offline mode event simulation
 * 
 * To integrate:
 * 1. Import and call dynamicEventSystem.start() in Game.tsx
 * 2. Connect to server event messages (if server system is integrated)
 * 3. Display event UI using dynamicEventSystem.getActiveEvents()
 * 4. Handle event completion and rewards
 */

export interface DynamicEvent {
  id: string
  type: 'treasure_hunt' | 'enemy_swarm' | 'resource_boost' | 'boss_spawn' | 'weather_change' | 'npc_quest'
  name: string
  description: string
  biome?: string
  position?: { x: number; y: number; z: number }
  duration: number // milliseconds
  startTime: number
  endTime: number
  active: boolean
  participants: string[] // player IDs
  rewards?: { itemId: string; quantity: number; chance: number }[]
}

export interface RandomEncounter {
  id: string
  type: 'treasure' | 'enemy_group' | 'resource_node' | 'npc'
  position: { x: number; y: number; z: number }
  biome: string
  level: number
  spawnTime: number
  despawnTime: number
  loot?: { itemId: string; quantity: number }[]
}

class DynamicEventSystem {
  private activeEvents: Map<string, DynamicEvent> = new Map()
  private randomEncounters: Map<string, RandomEncounter> = new Map()
  private eventTimer: NodeJS.Timeout | null = null

  /**
   * Start dynamic event system
   */
  start(): void {
    // Spawn events every 5-10 minutes
    this.eventTimer = setInterval(() => {
      this.spawnRandomEvent()
      this.spawnRandomEncounter()
    }, 300000 + Math.random() * 300000) // 5-10 minutes
  }

  /**
   * Stop dynamic event system
   */
  stop(): void {
    if (this.eventTimer) {
      clearInterval(this.eventTimer)
      this.eventTimer = null
    }
  }

  /**
   * Spawn a random dynamic event
   */
  private spawnRandomEvent(): void {
    const eventTypes: DynamicEvent['type'][] = [
      'treasure_hunt',
      'enemy_swarm',
      'resource_boost',
      'boss_spawn',
      'weather_change'
    ]

    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const duration = 300000 + Math.random() * 300000 // 5-10 minutes

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

    // Auto-remove after duration
    setTimeout(() => {
      this.activeEvents.delete(event.id)
    }, duration)
  }

  /**
   * Spawn a random encounter
   */
  private spawnRandomEncounter(): void {
    const encounterTypes: RandomEncounter['type'][] = [
      'treasure',
      'enemy_group',
      'resource_node',
      'npc'
    ]

    const type = encounterTypes[Math.floor(Math.random() * encounterTypes.length)]
    const despawnTime = 600000 // 10 minutes

    const encounter: RandomEncounter = {
      id: `encounter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      position: {
        x: (Math.random() - 0.5) * 1000,
        y: 0,
        z: (Math.random() - 0.5) * 1000
      },
      biome: 'nexus_city', // Default, would be determined by position
      level: Math.floor(Math.random() * 50) + 1,
      spawnTime: Date.now(),
      despawnTime: Date.now() + despawnTime,
      loot: this.getEncounterLoot(type)
    }

    this.randomEncounters.set(encounter.id, encounter)

    // Auto-remove after despawn time
    setTimeout(() => {
      this.randomEncounters.delete(encounter.id)
    }, despawnTime)
  }

  /**
   * Get event name by type
   */
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

  /**
   * Get event description by type
   */
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

  /**
   * Get event rewards by type
   */
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

  /**
   * Get encounter loot by type
   */
  private getEncounterLoot(type: RandomEncounter['type']): RandomEncounter['loot'] {
    const loot: Record<RandomEncounter['type'], RandomEncounter['loot']> = {
      treasure: [
        { itemId: 'gold_coin', quantity: 50 },
        { itemId: 'rare_item', quantity: 1 }
      ],
      enemy_group: [
        { itemId: 'combat_loot', quantity: 3 }
      ],
      resource_node: [
        { itemId: 'resource', quantity: 10 }
      ],
      npc: []
    }
    return loot[type] || []
  }

  /**
   * Get active events
   */
  getActiveEvents(): DynamicEvent[] {
    return Array.from(this.activeEvents.values()).filter(e => e.active && Date.now() < e.endTime)
  }

  /**
   * Get active encounters
   */
  getActiveEncounters(): RandomEncounter[] {
    return Array.from(this.randomEncounters.values()).filter(e => Date.now() < e.despawnTime)
  }

  /**
   * Join event
   */
  joinEvent(eventId: string, playerId: string): boolean {
    const event = this.activeEvents.get(eventId)
    if (!event || !event.active) return false

    if (!event.participants.includes(playerId)) {
      event.participants.push(playerId)
    }
    return true
  }

  /**
   * Complete event (distribute rewards)
   */
  completeEvent(eventId: string): DynamicEvent['rewards'] {
    const event = this.activeEvents.get(eventId)
    if (!event) return []

    event.active = false
    return event.rewards || []
  }
}

export const dynamicEventSystem = new DynamicEventSystem()

