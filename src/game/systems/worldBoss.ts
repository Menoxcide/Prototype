/**
 * World Boss System (Client-side)
 * Manages world boss spawns, mechanics, and multi-player encounters
 * 
 * NOTE: This system is currently not integrated into the game.
 * The server handles boss spawning and sends 'worldBossSpawned' messages.
 * This client-side system could be used for:
 * - Tracking boss state and abilities
 * - UI/visual feedback for boss mechanics
 * - Client-side prediction
 * 
 * To integrate:
 * 1. Import and initialize in Game.tsx or EnhancedScene.tsx
 * 2. Connect to 'worldBossSpawned' message handler in colyseus.ts
 * 3. Use worldBossSystem.updateBoss() in game loop
 * 4. Display boss UI using worldBossSystem.getActiveBosses()
 */

import { Enemy } from '../types'
import { getBossMonsters } from '../data/monsters'

export interface WorldBoss extends Enemy {
  bossId: string
  spawnTime: number
  lastAbilityTime: number
  abilityCooldowns: Map<string, number>
  phase: number
  maxPhase: number
  participants: string[] // player IDs who have dealt damage
  totalDamage: Map<string, number> // playerId -> damage dealt
}

export interface BossAbility {
  id: string
  name: string
  cooldown: number
  damage: number
  range: number
  effect: 'damage' | 'heal' | 'buff' | 'debuff' | 'summon'
  description: string
}

class WorldBossSystem {
  private activeBosses: Map<string, WorldBoss> = new Map()
  private bossSpawnTimer: NodeJS.Timeout | null = null
  private bossAbilities: Map<string, BossAbility[]> = new Map()

  constructor() {
    this.initializeBossAbilities()
  }

  /**
   * Initialize boss abilities
   */
  private initializeBossAbilities(): void {
    // Volcano Guardian abilities
    this.bossAbilities.set('volcano_guardian', [
      {
        id: 'fire_breath',
        name: 'Fire Breath',
        cooldown: 10000,
        damage: 50,
        range: 15,
        effect: 'damage',
        description: 'Breathes fire in a cone, dealing massive damage'
      },
      {
        id: 'lava_wave',
        name: 'Lava Wave',
        cooldown: 15000,
        damage: 75,
        range: 20,
        effect: 'damage',
        description: 'Creates a wave of lava that travels forward'
      }
    ])

    // Forest Dragon abilities
    this.bossAbilities.set('forest_dragon', [
      {
        id: 'nature_strike',
        name: 'Nature Strike',
        cooldown: 8000,
        damage: 60,
        range: 12,
        effect: 'damage',
        description: 'Strikes with nature magic'
      },
      {
        id: 'healing_aura',
        name: 'Healing Aura',
        cooldown: 20000,
        damage: 0,
        range: 0,
        effect: 'heal',
        description: 'Heals the dragon over time'
      }
    ])

    // Neon Guardian abilities
    this.bossAbilities.set('neon_guardian', [
      {
        id: 'neon_blast',
        name: 'Neon Blast',
        cooldown: 12000,
        damage: 80,
        range: 18,
        effect: 'damage',
        description: 'Fires a powerful neon energy blast'
      },
      {
        id: 'energy_shield',
        name: 'Energy Shield',
        cooldown: 25000,
        damage: 0,
        range: 0,
        effect: 'buff',
        description: 'Creates a shield that reduces incoming damage'
      }
    ])

    // Cosmic Guardian abilities
    this.bossAbilities.set('cosmic_guardian', [
      {
        id: 'cosmic_blast',
        name: 'Cosmic Blast',
        cooldown: 10000,
        damage: 100,
        range: 25,
        effect: 'damage',
        description: 'Fires a devastating cosmic energy blast'
      },
      {
        id: 'star_storm',
        name: 'Star Storm',
        cooldown: 20000,
        damage: 60,
        range: 30,
        effect: 'damage',
        description: 'Summons a storm of falling stars'
      },
      {
        id: 'planet_summon',
        name: 'Planet Summon',
        cooldown: 30000,
        damage: 0,
        range: 0,
        effect: 'summon',
        description: 'Summons planets that orbit and attack players'
      }
    ])
  }

  /**
   * Start world boss system
   */
  start(): void {
    // Spawn world boss every 30-60 minutes
    this.bossSpawnTimer = setInterval(() => {
      this.spawnWorldBoss()
    }, 1800000 + Math.random() * 1800000) // 30-60 minutes
  }

  /**
   * Stop world boss system
   */
  stop(): void {
    if (this.bossSpawnTimer) {
      clearInterval(this.bossSpawnTimer)
      this.bossSpawnTimer = null
    }
  }

  /**
   * Spawn a random world boss
   */
  spawnWorldBoss(): void {
    const bosses = getBossMonsters()
    if (bosses.length === 0) return

    const bossData = bosses[Math.floor(Math.random() * bosses.length)]
    const position = this.getRandomBossSpawnPosition()

    const boss: WorldBoss = {
      id: `world_boss_${Date.now()}`,
      bossId: bossData.id,
      type: 'boss',
      level: bossData.level,
      health: bossData.maxHealth,
      maxHealth: bossData.maxHealth,
      position,
      rotation: Math.random() * Math.PI * 2,
      // speed: bossData.speed, // Speed not in Enemy interface, handled separately
      spawnTime: Date.now(),
      lastAbilityTime: Date.now(),
      abilityCooldowns: new Map(),
      phase: 1,
      maxPhase: Math.ceil(bossData.maxHealth / (bossData.maxHealth / 3)), // 3 phases
      participants: [],
      totalDamage: new Map()
    }

    this.activeBosses.set(boss.id, boss)

    // Broadcast boss spawn to all players
    this.broadcastBossSpawn(boss)

    // Auto-despawn after 1 hour if not killed
    setTimeout(() => {
      if (this.activeBosses.has(boss.id)) {
        this.activeBosses.delete(boss.id)
        this.broadcastBossDespawn(boss.id)
      }
    }, 3600000) // 1 hour
  }

  /**
   * Get random boss spawn position
   */
  private getRandomBossSpawnPosition(): { x: number; y: number; z: number } {
    // Spawn in center area with some variation
    return {
      x: (Math.random() - 0.5) * 200,
      y: 0,
      z: (Math.random() - 0.5) * 200
    }
  }

  /**
   * Update boss (called every game loop)
   */
  updateBoss(bossId: string, deltaTime: number): void {
    const boss = this.activeBosses.get(bossId)
    if (!boss) return

    // Update ability cooldowns
    boss.abilityCooldowns.forEach((cooldown, abilityId) => {
      const newCooldown = cooldown - deltaTime
      if (newCooldown <= 0) {
        boss.abilityCooldowns.delete(abilityId)
      } else {
        boss.abilityCooldowns.set(abilityId, newCooldown)
      }
    })

    // Check for phase transitions
    const healthPercent = boss.health / boss.maxHealth
    const newPhase = Math.ceil((1 - healthPercent) * boss.maxPhase) + 1
    if (newPhase > boss.phase && newPhase <= boss.maxPhase) {
      boss.phase = newPhase
      this.onPhaseTransition(boss, newPhase)
    }

    // Use abilities
    const abilities = this.bossAbilities.get(boss.bossId) || []
    const now = Date.now()
    if (now - boss.lastAbilityTime > 5000) { // Use ability every 5+ seconds
      const availableAbilities = abilities.filter(ability => {
        const cooldown = boss.abilityCooldowns.get(ability.id) || 0
        return cooldown <= 0
      })

      if (availableAbilities.length > 0) {
        const ability = availableAbilities[Math.floor(Math.random() * availableAbilities.length)]
        this.useBossAbility(boss, ability)
        boss.abilityCooldowns.set(ability.id, ability.cooldown)
        boss.lastAbilityTime = now
      }
    }
  }

  /**
   * Use boss ability
   */
  private useBossAbility(boss: WorldBoss, ability: BossAbility): void {
    // Broadcast ability use to all players
    this.broadcastBossAbility(boss.id, ability)

    // Apply ability effects (would be handled by server)
    switch (ability.effect) {
      case 'damage':
        // Damage all players in range
        break
      case 'heal':
        // Heal boss
        boss.health = Math.min(boss.maxHealth, boss.health + ability.damage)
        break
      case 'buff':
        // Apply buff to boss
        break
      case 'debuff':
        // Apply debuff to players
        break
      case 'summon':
        // Summon minions
        break
    }
  }

  /**
   * Handle phase transition
   */
  private onPhaseTransition(boss: WorldBoss, phase: number): void {
    // Broadcast phase transition
    this.broadcastBossPhaseTransition(boss.id, phase)

    // Boss gets stronger in later phases
    if (phase > 1) {
      // Increase damage, speed, or add new abilities
    }
  }

  /**
   * Register damage dealt to boss
   */
  registerDamage(bossId: string, playerId: string, damage: number): void {
    const boss = this.activeBosses.get(bossId)
    if (!boss) return

    boss.health = Math.max(0, boss.health - damage)

    if (!boss.participants.includes(playerId)) {
      boss.participants.push(playerId)
    }

    const currentDamage = boss.totalDamage.get(playerId) || 0
    boss.totalDamage.set(playerId, currentDamage + damage)

    // Check if boss is defeated
    if (boss.health <= 0) {
      this.onBossDefeated(boss)
    }
  }

  /**
   * Handle boss defeat
   */
  private onBossDefeated(boss: WorldBoss): void {
    // Distribute rewards based on damage dealt
    const rewards = this.calculateRewards(boss)

    // Broadcast boss defeat
    this.broadcastBossDefeat(boss.id, rewards)

    // Remove boss
    this.activeBosses.delete(boss.id)
  }

  /**
   * Calculate rewards based on participation
   */
  private calculateRewards(boss: WorldBoss): Map<string, { credits: number; xp: number; items: { itemId: string; quantity: number }[] }> {
    const rewards = new Map<string, { credits: number; xp: number; items: { itemId: string; quantity: number }[] }>()
    const totalDamage = Array.from(boss.totalDamage.values()).reduce((sum, dmg) => sum + dmg, 0)

    boss.participants.forEach(playerId => {
      const damageDealt = boss.totalDamage.get(playerId) || 0
      const participationPercent = totalDamage > 0 ? damageDealt / totalDamage : 1 / boss.participants.length

      rewards.set(playerId, {
        credits: Math.floor(200 * participationPercent),
        xp: Math.floor(500 * participationPercent),
        items: [
          { itemId: 'boss_loot', quantity: Math.floor(3 * participationPercent) + 1 }
        ]
      })
    })

    return rewards
  }

  /**
   * Get active bosses
   */
  getActiveBosses(): WorldBoss[] {
    return Array.from(this.activeBosses.values())
  }

  /**
   * Broadcast methods (would integrate with server messaging)
   */
  private broadcastBossSpawn(boss: WorldBoss): void {
    // Would send message to all clients
    console.log(`World Boss Spawned: ${boss.bossId} at ${boss.position.x}, ${boss.position.z}`)
  }

  private broadcastBossDespawn(bossId: string): void {
    console.log(`World Boss Despawned: ${bossId}`)
  }

  private broadcastBossAbility(bossId: string, ability: BossAbility): void {
    console.log(`Boss ${bossId} used ${ability.name}`)
  }

  private broadcastBossPhaseTransition(bossId: string, phase: number): void {
    console.log(`Boss ${bossId} entered phase ${phase}`)
  }

  private broadcastBossDefeat(bossId: string, _rewards: Map<string, any>): void {
    console.log(`Boss ${bossId} defeated! Rewards distributed.`)
  }
}

export const worldBossSystem = new WorldBossSystem()

