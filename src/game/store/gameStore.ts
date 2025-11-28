/**
 * Game Store - Centralized state management for the game
 * 
 * Uses Zustand for efficient state management with:
 * - Selective subscriptions to reduce re-renders
 * - Immutable state updates
 * - State update batching
 * 
 * This store manages:
 * - Player state (position, health, mana, XP, credits)
 * - Inventory and items
 * - Spells and equipment
 * - Game world entities (enemies, loot, resource nodes)
 * - Other players (multiplayer)
 * - Chat messages
 * - UI state (modals, HUD visibility)
 * - Network connection status
 * - Quest, battle pass, trading, achievement systems
 * - Social features (friends, guilds)
 * - Housing system
 * - Performance metrics
 * 
 * @example
 * ```ts
 * // Get player state
 * const player = useGameStore(state => state.player)
 * 
 * // Update player position
 * useGameStore.getState().updatePlayerPosition({ x: 10, y: 0, z: 5 })
 * 
 * // Add item to inventory
 * useGameStore.getState().addItem('sword', 1)
 * ```
 */

import { create } from 'zustand'
import { Player, InventoryItem, Spell, ChatMessage, Enemy, ResourceNode, LootDrop, PlayerSkill, NPC } from '../types'
import { PowerUpEntity, ActivePowerUp } from '../../../shared/src/types/powerUps'
import { getItem } from '../data/items'
import { getSpell } from '../data/spells'
import type { QualitySettings } from '../utils/qualitySettings'
import { getQualityManager } from '../utils/qualitySettings'
import type { Dungeon, DungeonProgress } from '../../../shared/src/types/dungeons'
import { createHealingNumber, createDamageNumber, createManaNumber, createXPNumber, createLevelUpNumber } from '../utils/floatingNumbers'
import { getCooldownManager } from '../systems/cooldownSystem'
import { disposeEnemyResources, disposeLootDropResources, disposeNPCResources } from '../utils/entityResourceDisposal'
// batchUpdate is available but not used in this file

/**
 * Complete game state interface
 */
interface GameState {
  // Authentication
  firebaseUid: string | null
  setFirebaseUid: (uid: string) => void
  
  // Player state
  player: Player | null
  setPlayer: (player: Player) => void
  updatePlayerPosition: (position: { x: number; y: number; z: number }) => void
  updatePlayerRotation: (rotation: number) => void
  updatePlayerHealth: (health: number) => void
  updatePlayerMana: (mana: number) => void
  addXP: (amount: number) => void
  addCredits: (amount: number) => void
  
  // Inventory
  inventory: InventoryItem[]
  addItem: (itemId: string, quantity: number) => void
  removeItem: (itemId: string, quantity: number) => void
  getInventoryItem: (itemId: string) => InventoryItem | undefined
  
  // Spells
  equippedSpells: string[] // Spell IDs in hotbar slots
  setEquippedSpell: (slot: number, spellId: string) => void
  getEquippedSpell: (slot: number) => Spell | undefined
  
  // Game world
  enemies: Map<string, Enemy>
  addEnemy: (enemy: Enemy) => void
  removeEnemy: (id: string) => void
  updateEnemy: (id: string, updates: Partial<Enemy>) => void
  
  resourceNodes: Map<string, ResourceNode>
  addResourceNode: (node: ResourceNode) => void
  removeResourceNode: (id: string) => void
  
  lootDrops: Map<string, LootDrop>
  addLootDrop: (loot: LootDrop) => void
  removeLootDrop: (id: string) => void
  
  // Power-ups
  powerUps: Map<string, PowerUpEntity>
  addPowerUp: (powerUp: PowerUpEntity) => void
  removePowerUp: (id: string) => void
  updatePowerUp: (id: string, updates: Partial<PowerUpEntity>) => void
  activePowerUps: Map<string, ActivePowerUp>
  applyPowerUp: (powerUp: ActivePowerUp) => void
  removeActivePowerUp: (id: string) => void
  updateActivePowerUp: (id: string, updates: Partial<ActivePowerUp>) => void
  
  // NPCs
  npcs: Map<string, NPC>
  addNPC: (npc: NPC) => void
  removeNPC: (id: string) => void
  updateNPC: (id: string, updates: Partial<NPC>) => void
  interactingWithNPC: string | null
  setInteractingWithNPC: (npcId: string | null) => void
  
  // Other players (multiplayer)
  otherPlayers: Map<string, Player>
  addOtherPlayer: (player: Player) => void
  removeOtherPlayer: (id: string) => void
  updateOtherPlayer: (id: string, updates: Partial<Player>) => void
  
  // Chat
  chatMessages: ChatMessage[]
  addChatMessage: (message: ChatMessage) => void
  clearChat: () => void
  
  // UI state
  isInventoryOpen: boolean
  toggleInventory: () => void
  isCraftingOpen: boolean
  toggleCrafting: () => void
  isMarketOpen: boolean
  toggleMarket: () => void
  isSpellbookOpen: boolean
  toggleSpellbook: () => void
  isChatOpen: boolean
  toggleChat: () => void
  isGuildOpen: boolean
  toggleGuild: () => void
  isQuestOpen: boolean
  toggleQuest: () => void
  isBattlePassOpen: boolean
  toggleBattlePass: () => void
  isShopOpen: boolean
  toggleShop: () => void
  isSettingsOpen: boolean
  toggleSettings: () => void
  isTutorialOpen: boolean
  toggleTutorial: () => void
  hasCompletedTutorial: boolean
  setHasCompletedTutorial: (completed: boolean) => void
  isMinimapOpen: boolean
  toggleMinimap: () => void
  isHousingOpen: boolean
  toggleHousing: () => void
  
  // Game state
  currentZone: string
  setCurrentZone: (zoneId: string) => void
  isConnected: boolean
  setConnected: (connected: boolean) => void
  
  // Spell casting queue
  spellCastQueue: Array<{ spellId: string; timestamp: number }>
  queueSpellCast: (spellId: string) => void
  clearSpellCastQueue: () => void
  
  // Quest system
  activeQuests: Array<{
    questId: string
    status: 'active' | 'completed' | 'failed'
    objectives: Array<{
      id: string
      type: string
      target: string
      quantity: number
      current: number
    }>
    startedAt: number
    expiresAt?: number
  }>
  availableQuests: Array<{
    id: string
    name: string
    description: string
    category: string
    level: number
    rewards: Array<{ type: string; amount: number }>
  }>
  setActiveQuests: (quests: Array<{ questId: string; status: string; objectives: Array<{ id: string; current: number; required: number }> }>) => void
  setAvailableQuests: (quests: Array<{ id: string; name: string; description: string; category: string; level: number; prerequisites: string[]; objectives: Array<{ id: string; type: string; target: string; required: number }>; rewards: Array<{ type: string; amount: number }>; repeatable: boolean; timeLimit?: number }>) => void
  updateQuestProgress: (questId: string, objectiveId: string, progress: number) => void
  
  // Battle pass system
  battlePassProgress: {
    season: number
    currentTier: number
    currentXP: number
    premiumUnlocked: boolean
    claimedTiers: number[]
  } | null
  battlePassSeason: {
    id: string
    name: string
    season: number
    startDate: number
    endDate: number
    tiers: Array<{ tier: number; freeReward?: { type: string; amount: number }; premiumReward?: { type: string; amount: number } }>
  } | null
  setBattlePassProgress: (progress: { season: number; currentTier: number; currentXP: number; premiumUnlocked: boolean; claimedTiers: number[] }) => void
  setBattlePassSeason: (season: { id: number; name: string; startDate: number; endDate: number }) => void
  
  // Trading system
  currentTrade: { sessionId: string; otherPlayerId: string; otherPlayerName: string; myItems: Array<{ itemId: string; quantity: number }>; otherItems: Array<{ itemId: string; quantity: number }>; myCredits: number; otherCredits: number; myConfirmed: boolean; otherConfirmed: boolean } | null
  isTradeOpen: boolean
  setCurrentTrade: (trade: { sessionId: string; otherPlayerId: string; otherPlayerName: string; myItems: Array<{ itemId: string; quantity: number }>; otherItems: Array<{ itemId: string; quantity: number }>; myCredits: number; otherCredits: number; myConfirmed: boolean; otherConfirmed: boolean } | null) => void
  toggleTrade: () => void
  
  // Achievement system
  achievements: Array<{ id: string; name: string; description: string; progress: number; maxProgress: number; completed: boolean; completedAt?: number; reward?: { type: string; amount: number } }>
  achievementProgress: Array<{ id: string; progress: number; maxProgress: number; completed: boolean }>
  isAchievementOpen: boolean
  setAchievements: (achievements: Array<{ id: string; name: string; description: string; progress: number; maxProgress: number; completed: boolean; completedAt?: number; reward?: { type: string; amount: number } }>) => void
  setAchievementProgress: (progress: Array<{ id: string; progress: number; maxProgress: number; completed: boolean }>) => void
  toggleAchievement: () => void
  
  // Skills system
  playerSkills: Map<string, PlayerSkill>
  skillPoints: number
  isSkillsOpen: boolean
  setPlayerSkills: (skills: Map<string, PlayerSkill>) => void
  addSkillExperience: (skillId: string, amount: number) => void
  upgradeSkill: (skillId: string) => void
  toggleSkills: () => void
  setSkillPoints: (points: number) => void
  
  // Performance monitoring
  fps: number
  setFPS: (fps: number) => void
  networkLatency: number
  setNetworkLatency: (latency: number) => void
  packetLoss: number
  setPacketLoss: (loss: number) => void
  
  // Camera mode - default to third-person so player is visible
  cameraMode: 'first-person' | 'third-person'
  setCameraMode: (mode: 'first-person' | 'third-person') => void
  toggleCameraMode: () => void
  
  // Movement state (to prevent server overwrites during active movement)
  isPlayerMoving: boolean
  setIsPlayerMoving: (moving: boolean) => void
  isClimbingBuilding: boolean
  setIsClimbingBuilding: (climbing: boolean) => void
  isJumping: boolean
  setIsJumping: (jumping: boolean) => void
  isRunning: boolean
  setIsRunning: (running: boolean) => void
  isCrouching: boolean
  setIsCrouching: (crouching: boolean) => void
  isWallRunning: boolean
  setIsWallRunning: (wallRunning: boolean) => void
  
  // Stamina system
  stamina: number
  maxStamina: number
  setStamina: (stamina: number) => void
  consumeStamina: (amount: number) => void
  rechargeStamina: (amount: number) => void
  
  // Grapple system
  canGrapple: boolean
  setCanGrapple: (canGrapple: boolean) => void
  grappledBuilding: { id: string | null, position: { x: number, y: number, z: number } } | null
  setGrappledBuilding: (building: { id: string | null, position: { x: number, y: number, z: number } } | null) => void
  grapplePullVelocity: { x: number; y: number; z: number } | null
  setGrapplePullVelocity: (velocity: { x: number; y: number; z: number } | null) => void
  
  // Cooldown system
  startCooldown: (actionId: string, duration: number) => void
  isOnCooldown: (actionId: string) => boolean
  getRemainingCooldown: (actionId: string) => number
  getCooldownProgress: (actionId: string, totalDuration: number) => number
  momentumOnRelease: { x: number; y: number; z: number } | null
  setMomentumOnRelease: (momentum: { x: number; y: number; z: number } | null) => void
  
  // Wall-run chain system
  wallRunChain: number
  setWallRunChain: (chain: number) => void
  
  // Air dash system
  airDashCooldown: number
  setAirDashCooldown: (cooldown: number) => void
  canAirDash: boolean
  setCanAirDash: (canDash: boolean) => void

  // Settings
  qualitySettings: QualitySettings
  setQualitySettings: (settings: QualitySettings) => void

  // Combat Feedback
  screenShakeIntensity: number
  setScreenShakeIntensity: (intensity: number) => void

  // Social Features
  friends: Array<{ id: string; name: string; level: number; isOnline: boolean; lastSeen: number; status?: string }>
  friendRequests: Array<{ id: string; fromPlayerId: string; fromPlayerName: string; toPlayerId: string; timestamp: number; status: string }>
  setFriends: (friends: Array<{ id: string; name: string; level: number; isOnline: boolean; lastSeen: number; status?: string }>) => void
  setFriendRequests: (requests: Array<{ id: string; fromPlayerId: string; fromPlayerName: string; toPlayerId: string; timestamp: number; status: string }>) => void
  isSocialOpen: boolean
  toggleSocial: () => void

  // Housing
  housing: any | null
  setHousing: (housing: any | null) => void
  
  // Damage numbers (legacy - kept for backward compatibility)
  damageNumbers: Map<string, {
    id: string
    damage: number
    position: { x: number; y: number; z: number }
    isCrit: boolean
    createdAt: number
    opacity: number
    yOffset: number
  }>
  addDamageNumber: (damageNumber: {
    id: string
    damage: number
    position: { x: number; y: number; z: number }
    isCrit: boolean
    createdAt: number
    opacity: number
    yOffset: number
  }) => void
  removeDamageNumber: (id: string) => void
  updateDamageNumber: (id: string, updates: Partial<{
    opacity: number
    yOffset: number
  }>) => void
  
  // Active power-ups - add missing method
  addActivePowerUp: (powerUp: ActivePowerUp) => void
  
  // World Boss System
  activeBosses: Map<string, {
    id: string
    bossId: string
    type: string
    level: number
    health: number
    maxHealth: number
    position: { x: number; y: number; z: number }
    rotation: number
    phase: number
    maxPhase: number
    participants: string[]
  }>
  setActiveBoss: (bossId: string, boss: any) => void
  removeActiveBoss: (bossId: string) => void
  updateBoss: (bossId: string, updates: Partial<any>) => void
  
  // Dynamic Events System
  activeEvents: Array<{
    id: string
    type: string
    name: string
    description: string
    position?: { x: number; y: number; z: number }
    startTime: number
    endTime: number
    active: boolean
  }>
  setActiveEvents: (events: any[]) => void
  addActiveEvent: (event: any) => void
  removeActiveEvent: (eventId: string) => void
  
  // Dungeon System
  isDungeonMapOpen: boolean
  toggleDungeonMap: () => void
  currentDungeon: Dungeon | null
  setCurrentDungeon: (dungeon: Dungeon | null) => void
  dungeonProgress: Map<string, DungeonProgress>
  setDungeonProgress: (dungeonId: string, progress: DungeonProgress) => void
  
  // Floating numbers (enhanced system for all types)
  floatingNumbers: Map<string, {
    id: string
    value: number | string
    position: { x: number; y: number; z: number }
    type: 'damage' | 'healing' | 'status' | 'xp' | 'level-up' | 'mana' | 'buff' | 'debuff' | 'combo' | 'critical'
    isCrit?: boolean
    createdAt: number
    opacity: number
    yOffset: number
  }>
  addFloatingNumber: (floatingNumber: {
    id: string
    value: number | string
    position: { x: number; y: number; z: number }
    type: 'damage' | 'healing' | 'status' | 'xp' | 'level-up' | 'mana' | 'buff' | 'debuff' | 'combo' | 'critical'
    isCrit?: boolean
    createdAt: number
    opacity: number
    yOffset: number
  }) => void
  removeFloatingNumber: (id: string) => void
  updateFloatingNumber: (id: string, updates: Partial<{
    opacity: number
    yOffset: number
  }>) => void
}

export const useGameStore = create<GameState>((set, get) => ({
  // Authentication
  firebaseUid: null,
  setFirebaseUid: (uid) => set({ firebaseUid: uid }),
  
  // Player state
  player: null,
  setPlayer: (player) => set({ player }),
  
  updatePlayerPosition: (position) => {
    const { player } = get()
    if (!player) {
      if (import.meta.env.DEV) {
        console.error('❌ updatePlayerPosition called but player is null!')
      }
      return
    }
    
    // Always update position for smooth movement
    // The threshold was causing stuttering/rubberbanding
    // React will handle re-render optimization if values are the same
    const updatedPlayer = { 
      ...player, 
      position: { 
        x: position.x, 
        y: position.y, 
        z: position.z 
      } 
    }
    set({ player: updatedPlayer })
  },
  
  updatePlayerRotation: (rotation) => {
    const { player } = get()
    if (player) {
      set({ player: { ...player, rotation } })
    }
  },
  
  updatePlayerHealth: (health) => {
    const { player } = get()
    if (player) {
      const oldHealth = player.health
      const newHealth = Math.max(0, Math.min(health, player.maxHealth))
      const healthChange = newHealth - oldHealth
      
      set({ player: { ...player, health: newHealth } })
      
      // Show floating numbers and combat log for health changes
      if (healthChange !== 0 && player.position) {
        import('../utils/combatLog').then(({ logHealing, logDamageTaken }) => {
          if (healthChange > 0) {
            // Healing
            createHealingNumber(
              healthChange,
              { x: player.position.x, y: player.position.y + 1.5, z: player.position.z }
            )
            logHealing(healthChange)
          } else if (healthChange < 0) {
            // Damage taken
            createDamageNumber(
              Math.abs(healthChange),
              { x: player.position.x, y: player.position.y + 1.5, z: player.position.z },
              false
            )
            logDamageTaken(Math.abs(healthChange), 'Unknown')
          }
        })
      }
    }
  },
  
  updatePlayerMana: (mana) => {
    const { player } = get()
    if (player) {
      const oldMana = player.mana
      const newMana = Math.max(0, Math.min(mana, player.maxMana))
      const manaChange = newMana - oldMana
      
      set({ player: { ...player, mana: newMana } })
      
      // Show floating numbers for significant mana changes
      if (Math.abs(manaChange) > 5 && player.position) {
        createManaNumber(
          Math.abs(manaChange),
          { x: player.position.x, y: player.position.y + 1.2, z: player.position.z },
          manaChange > 0
        )
      }
    }
  },
  
  addXP: (amount) => {
    const { player } = get()
    if (!player) return
    
    let newXP = player.xp + amount
    let newLevel = player.level
    let xpToNext = player.xpToNext
    const leveledUp = newLevel > player.level
    
    // Level up logic
    while (newXP >= xpToNext) {
      newXP -= xpToNext
      newLevel++
      xpToNext = Math.floor(xpToNext * 1.5) // Exponential XP requirement
    }
    
    set({
      player: {
        ...player,
        xp: newXP,
        level: newLevel,
        xpToNext
      }
    })
    
    // Show floating numbers and combat log
    if (player.position) {
      import('../utils/combatLog').then(({ logXP, logLevelUp }) => {
        // Show XP gain
        createXPNumber(
          amount,
          { x: player.position.x, y: player.position.y + 1.8, z: player.position.z }
        )
        logXP(amount)
        
        // Show level up if applicable
        if (leveledUp) {
          createLevelUpNumber(
            newLevel,
            { x: player.position.x, y: player.position.y + 2.5, z: player.position.z }
          )
          logLevelUp(newLevel)
        }
      })
    }
  },
  
  addCredits: (amount) => {
    const { player } = get()
    if (player) {
      set({ player: { ...player, credits: player.credits + amount } })
    }
  },
  
  // Inventory
  inventory: [],
  
  addItem: (itemId, quantity) => {
    const item = getItem(itemId)
    if (!item) return
    
    const { inventory } = get()
    const existingIndex = inventory.findIndex(
      invItem => invItem.item.id === itemId
    )
    
    if (existingIndex >= 0) {
      // Item exists, update quantity if stackable
      if (item.stackable) {
        const existing = inventory[existingIndex]
        const newQuantity = existing.quantity + quantity
        const maxStack = item.maxStack || 999
        
        if (newQuantity <= maxStack) {
          const newInventory = [...inventory]
          newInventory[existingIndex] = {
            ...existing,
            quantity: newQuantity
          }
          set({ inventory: newInventory })
        } else {
          // Split into multiple stacks
          const newInventory = [...inventory]
          newInventory[existingIndex] = {
            ...existing,
            quantity: maxStack
          }
          const remaining = newQuantity - maxStack
          newInventory.push({
            item,
            quantity: remaining
          })
          set({ inventory: newInventory })
        }
      } else {
        // Not stackable, add as new item
        set({ inventory: [...inventory, { item, quantity: 1 }] })
      }
    } else {
      // New item
      set({ inventory: [...inventory, { item, quantity }] })
    }
  },
  
  removeItem: (itemId, quantity) => {
    const { inventory } = get()
    const newInventory = [...inventory]
    let remaining = quantity
    
    for (let i = newInventory.length - 1; i >= 0 && remaining > 0; i--) {
      const invItem = newInventory[i]
      if (invItem.item.id === itemId) {
        if (invItem.quantity <= remaining) {
          remaining -= invItem.quantity
          newInventory.splice(i, 1)
        } else {
          invItem.quantity -= remaining
          remaining = 0
        }
      }
    }
    
    set({ inventory: newInventory })
  },
  
  getInventoryItem: (itemId) => {
    const { inventory } = get()
    return inventory.find(invItem => invItem.item.id === itemId)
  },
  
  // Spells
  equippedSpells: ['quantum_bolt', 'plasma_burst', 'void_strike', 'heal_circuit', 'quantum_slash'],
  
  setEquippedSpell: (slot, spellId) => {
    const { equippedSpells } = get()
    const newSpells = [...equippedSpells]
    newSpells[slot] = spellId
    set({ equippedSpells: newSpells })
  },
  
  getEquippedSpell: (slot) => {
    const { equippedSpells } = get()
    const spellId = equippedSpells[slot]
    return spellId ? getSpell(spellId) : undefined
  },
  
  // Game world
  enemies: new Map(),
  
  addEnemy: (enemy) => {
    const { enemies } = get()
    const newEnemies = new Map(enemies)
    newEnemies.set(enemy.id, enemy)
    set({ enemies: newEnemies })
  },
  
  removeEnemy: (id) => {
    const { enemies } = get()
    const newEnemies = new Map(enemies)
    newEnemies.delete(id)
    
    // Dispose of enemy's Three.js resources
    disposeEnemyResources(id)
    
    set({ enemies: newEnemies })
  },
  
  updateEnemy: (id, updates) => {
    const { enemies } = get()
    const enemy = enemies.get(id)
    if (enemy) {
      const newEnemies = new Map(enemies)
      newEnemies.set(id, { ...enemy, ...updates })
      set({ enemies: newEnemies })
    }
  },
  
  resourceNodes: new Map(),
  
  addResourceNode: (node) => {
    const { resourceNodes } = get()
    const newNodes = new Map(resourceNodes)
    newNodes.set(node.id, node)
    set({ resourceNodes: newNodes })
  },
  
  removeResourceNode: (id) => {
    const { resourceNodes } = get()
    const newNodes = new Map(resourceNodes)
    newNodes.delete(id)
    set({ resourceNodes: newNodes })
  },
  
  lootDrops: new Map(),
  
  addLootDrop: (loot) => {
    const { lootDrops } = get()
    const newDrops = new Map(lootDrops)
    newDrops.set(loot.id, loot)
    set({ lootDrops: newDrops })
  },
  
  removeLootDrop: (id) => {
    const { lootDrops } = get()
    const newDrops = new Map(lootDrops)
    newDrops.delete(id)
    
    // Dispose of loot drop's Three.js resources
    disposeLootDropResources(id)
    
    set({ lootDrops: newDrops })
  },
  
  // Power-ups
  powerUps: new Map(),
  
  addPowerUp: (powerUp) => {
    const { powerUps } = get()
    const newPowerUps = new Map(powerUps)
    newPowerUps.set(powerUp.id, powerUp)
    set({ powerUps: newPowerUps })
  },
  
  removePowerUp: (id) => {
    const { powerUps } = get()
    const newPowerUps = new Map(powerUps)
    newPowerUps.delete(id)
    set({ powerUps: newPowerUps })
  },
  
  updatePowerUp: (id, updates) => {
    const { powerUps } = get()
    const powerUp = powerUps.get(id)
    if (powerUp) {
      const newPowerUps = new Map(powerUps)
      newPowerUps.set(id, { ...powerUp, ...updates })
      set({ powerUps: newPowerUps })
    }
  },
  
  activePowerUps: new Map(),
  
  applyPowerUp: (powerUp) => {
    const { activePowerUps } = get()
    const newActivePowerUps = new Map(activePowerUps)
    newActivePowerUps.set(powerUp.id, powerUp)
    set({ activePowerUps: newActivePowerUps })
  },
  
  addActivePowerUp: (powerUp) => {
    const { activePowerUps } = get()
    const newActivePowerUps = new Map(activePowerUps)
    newActivePowerUps.set(powerUp.id, powerUp)
    set({ activePowerUps: newActivePowerUps })
  },
  
  removeActivePowerUp: (id) => {
    const { activePowerUps } = get()
    const newActivePowerUps = new Map(activePowerUps)
    newActivePowerUps.delete(id)
    set({ activePowerUps: newActivePowerUps })
  },
  
  updateActivePowerUp: (id, updates) => {
    const { activePowerUps } = get()
    const powerUp = activePowerUps.get(id)
    if (powerUp) {
      const newActivePowerUps = new Map(activePowerUps)
      newActivePowerUps.set(id, { ...powerUp, ...updates })
      set({ activePowerUps: newActivePowerUps })
    }
  },
  
  // NPCs
  npcs: new Map(),
  
  addNPC: (npc) => {
    const { npcs } = get()
    const newNPCs = new Map(npcs)
    newNPCs.set(npc.id, npc)
    set({ npcs: newNPCs })
  },
  
  removeNPC: (id) => {
    const { npcs } = get()
    const newNPCs = new Map(npcs)
    newNPCs.delete(id)
    
    // Dispose of NPC's Three.js resources
    disposeNPCResources(id)
    
    set({ npcs: newNPCs })
  },
  
  updateNPC: (id, updates) => {
    const { npcs } = get()
    const npc = npcs.get(id)
    if (npc) {
      const newNPCs = new Map(npcs)
      newNPCs.set(id, { ...npc, ...updates })
      set({ npcs: newNPCs })
    }
  },
  
  interactingWithNPC: null,
  setInteractingWithNPC: (npcId) => set({ interactingWithNPC: npcId }),
  
  // Other players
  otherPlayers: new Map(),
  
  addOtherPlayer: (player) => {
    const { otherPlayers } = get()
    const newPlayers = new Map(otherPlayers)
    newPlayers.set(player.id, player)
    set({ otherPlayers: newPlayers })
  },
  
  removeOtherPlayer: (id) => {
    const { otherPlayers } = get()
    const newPlayers = new Map(otherPlayers)
    newPlayers.delete(id)
    set({ otherPlayers: newPlayers })
  },
  
  updateOtherPlayer: (id, updates) => {
    const { otherPlayers } = get()
    const player = otherPlayers.get(id)
    if (player) {
      const newPlayers = new Map(otherPlayers)
      newPlayers.set(id, { ...player, ...updates })
      set({ otherPlayers: newPlayers })
    }
  },
  
  // Chat
  chatMessages: [],
  
  addChatMessage: (message) => {
    const { chatMessages } = get()
    const newMessages = [...chatMessages, message]
    // Keep only last 100 messages
    if (newMessages.length > 100) {
      newMessages.shift()
    }
    set({ chatMessages: newMessages })
  },
  
  clearChat: () => set({ chatMessages: [] }),
  
  // UI state
  isInventoryOpen: false,
  toggleInventory: () => set((state) => ({ isInventoryOpen: !state.isInventoryOpen })),
  
  isCraftingOpen: false,
  toggleCrafting: () => set((state) => ({ isCraftingOpen: !state.isCraftingOpen })),
  
  isMarketOpen: false,
  toggleMarket: () => set((state) => ({ isMarketOpen: !state.isMarketOpen })),
  
  isSpellbookOpen: false,
  toggleSpellbook: () => set((state) => ({ isSpellbookOpen: !state.isSpellbookOpen })),
  
  isChatOpen: false,
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

  isGuildOpen: false,
  toggleGuild: () => set((state) => ({ isGuildOpen: !state.isGuildOpen })),

  isQuestOpen: false,
  toggleQuest: () => set((state) => ({ isQuestOpen: !state.isQuestOpen })),

  isBattlePassOpen: false,
  toggleBattlePass: () => set((state) => ({ isBattlePassOpen: !state.isBattlePassOpen })),

  isShopOpen: false,
  toggleShop: () => set((state) => ({ isShopOpen: !state.isShopOpen })),
  isSettingsOpen: false,
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  isTutorialOpen: false,
  toggleTutorial: () => set((state) => ({ isTutorialOpen: !state.isTutorialOpen })),
  hasCompletedTutorial: false,
  setHasCompletedTutorial: (completed) => {
    set({ hasCompletedTutorial: completed })
    localStorage.setItem('hasCompletedTutorial', String(completed))
  },
  isMinimapOpen: false,
  toggleMinimap: () => set((state) => ({ isMinimapOpen: !state.isMinimapOpen })),
  isHousingOpen: false,
  toggleHousing: () => set((state) => ({ isHousingOpen: !state.isHousingOpen })),
  
  // Game state
  currentZone: 'nexus_city',
  setCurrentZone: (zoneId) => {
    set({ currentZone: zoneId })
    // Also update player zone property if player exists
    const { player } = get()
    if (player) {
      set({ player: { ...player, zone: zoneId } })
    }
  },
  
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),
  
  // Spell casting queue
  spellCastQueue: [],
  queueSpellCast: (spellId) => {
    const { spellCastQueue } = get()
    set({ spellCastQueue: [...spellCastQueue, { spellId, timestamp: Date.now() }] })
  },
  clearSpellCastQueue: () => set({ spellCastQueue: [] }),
  
  // Quest system
  activeQuests: [],
  availableQuests: [],
  setActiveQuests: (quests) => {
    // Transform quests to match the expected type
    const transformedQuests = quests.map(q => ({
      questId: q.questId,
      status: q.status as 'active' | 'completed' | 'failed',
      objectives: q.objectives.map(obj => ({
        id: obj.id,
        type: 'unknown',
        target: 'unknown',
        quantity: obj.required,
        current: obj.current
      })),
      startedAt: Date.now(),
      expiresAt: undefined
    }))
    set({ activeQuests: transformedQuests })
  },
  setAvailableQuests: (quests) => set({ availableQuests: quests }),
  updateQuestProgress: (questId, objectiveId, progress) => {
    const { activeQuests } = get()
    const updated = activeQuests.map(quest => {
      if (quest.questId === questId) {
        const objectives = quest.objectives.map(obj => {
          if (obj.id === objectiveId) {
            return { ...obj, current: Math.min(progress, obj.quantity) }
          }
          return obj
        })
        return { ...quest, objectives }
      }
      return quest
    })
    set({ activeQuests: updated })
  },
  
  // Battle pass system
  battlePassProgress: null,
  battlePassSeason: null,
  setBattlePassProgress: (progress) => set({ battlePassProgress: progress }),
  setBattlePassSeason: (season) => {
    // Transform season to match expected type
    const transformedSeason = {
      id: String(season.id),
      name: season.name,
      season: season.id, // Use id as season number if not provided
      startDate: season.startDate,
      endDate: season.endDate,
      tiers: [] // Will be populated by server
    }
    set({ battlePassSeason: transformedSeason })
  },
  
  // Trading system
  currentTrade: null,
  isTradeOpen: false,
  setCurrentTrade: (trade) => set({ currentTrade: trade }),
  toggleTrade: () => set((state) => ({ isTradeOpen: !state.isTradeOpen })),
  
  // Achievement system
  achievements: [],
  achievementProgress: [],
  isAchievementOpen: false,
  setAchievements: (achievements) => set({ achievements }),
  setAchievementProgress: (progress) => set({ achievementProgress: progress }),
  toggleAchievement: () => set((state) => ({ isAchievementOpen: !state.isAchievementOpen })),
  
  // World Boss System
  activeBosses: new Map(),
  setActiveBoss: (bossId, boss) => {
    const { activeBosses } = get()
    const updated = new Map(activeBosses)
    updated.set(bossId, boss)
    set({ activeBosses: updated })
  },
  removeActiveBoss: (bossId) => {
    const { activeBosses } = get()
    const updated = new Map(activeBosses)
    updated.delete(bossId)
    set({ activeBosses: updated })
  },
  updateBoss: (bossId, updates) => {
    const { activeBosses } = get()
    const boss = activeBosses.get(bossId)
    if (boss) {
      const updated = new Map(activeBosses)
      updated.set(bossId, { ...boss, ...updates })
      set({ activeBosses: updated })
    }
  },
  
  // Dynamic Events System
  activeEvents: [],
  setActiveEvents: (events) => set({ activeEvents: events }),
  addActiveEvent: (event) => {
    const { activeEvents } = get()
    set({ activeEvents: [...activeEvents, event] })
  },
  removeActiveEvent: (eventId) => {
    const { activeEvents } = get()
    set({ activeEvents: activeEvents.filter(e => e.id !== eventId) })
  },
  
  // Dungeon System
  isDungeonMapOpen: false,
  toggleDungeonMap: () => set((state) => ({ isDungeonMapOpen: !state.isDungeonMapOpen })),
  currentDungeon: null,
  setCurrentDungeon: (dungeon) => set({ currentDungeon: dungeon }),
  dungeonProgress: new Map(),
  setDungeonProgress: (dungeonId, progress) => set((state) => ({
    dungeonProgress: new Map(state.dungeonProgress).set(dungeonId, progress)
  })),
  
  // Skills system
  playerSkills: new Map(),
  skillPoints: 0,
  isSkillsOpen: false,
  setPlayerSkills: (skills) => set({ playerSkills: skills }),
  addSkillExperience: (skillId, amount) => {
    const { playerSkills, player } = get()
    if (!player) return
    
    const skill = playerSkills.get(skillId) || {
      skillId,
      level: 0,
      experience: 0,
      experienceToNext: 100,
      unlocked: false
    }
    
    let newExp = skill.experience + amount
    let newLevel = skill.level
    let expToNext = skill.experienceToNext
    
    // Level up logic
    while (newExp >= expToNext && newLevel < 50) {
      newExp -= expToNext
      newLevel++
      expToNext = Math.floor(expToNext * 1.2) // Exponential XP requirement
    }
    
    const updatedSkills = new Map(playerSkills)
    updatedSkills.set(skillId, {
      ...skill,
      level: newLevel,
      experience: newExp,
      experienceToNext: expToNext,
      unlocked: newLevel > 0 || skill.unlocked
    })
    
    set({ playerSkills: updatedSkills })
  },
  upgradeSkill: (skillId) => {
    const { playerSkills, skillPoints, player } = get()
    if (!player || skillPoints <= 0) return
    
    const skill = playerSkills.get(skillId)
    if (!skill) return
    
    // Check if can upgrade (not at max level)
    // This would need skill definitions to check max level
    const updatedSkills = new Map(playerSkills)
    const updatedSkill = {
      ...skill,
      level: skill.level + 1
    }
    updatedSkills.set(skillId, updatedSkill)
    
    set({ 
      playerSkills: updatedSkills,
      skillPoints: skillPoints - 1
    })
  },
  toggleSkills: () => set((state) => ({ isSkillsOpen: !state.isSkillsOpen })),
  setSkillPoints: (points) => set({ skillPoints: points }),
  
  // Performance monitoring
  fps: 60,
  setFPS: (fps) => set({ fps }),
  networkLatency: 0,
  setNetworkLatency: (latency) => set({ networkLatency: latency }),
  packetLoss: 0,
  setPacketLoss: (loss) => set({ packetLoss: loss }),
  
  // Camera mode - default to first-person for cyberpunk city experience
  cameraMode: 'first-person' as 'first-person' | 'third-person',
  setCameraMode: (mode) => set({ cameraMode: mode }),
  toggleCameraMode: () => {
    const current = useGameStore.getState().cameraMode
    const newMode = current === 'first-person' ? 'third-person' : 'first-person'
    set({ cameraMode: newMode })
    console.log('🔹 Camera mode toggled:', newMode)
  },
  
  // Movement state
  isPlayerMoving: false,
  setIsPlayerMoving: (moving) => set({ isPlayerMoving: moving }),
  isClimbingBuilding: false,
  setIsClimbingBuilding: (climbing) => set({ isClimbingBuilding: climbing }),
  isJumping: false,
  setIsJumping: (jumping) => set({ isJumping: jumping }),
  isRunning: false,
  setIsRunning: (running) => set({ isRunning: running }),
  isCrouching: false,
  setIsCrouching: (crouching) => set({ isCrouching: crouching }),
  isWallRunning: false,
  setIsWallRunning: (wallRunning) => set({ isWallRunning: wallRunning }),
  
  // Stamina system
  stamina: 100,
  maxStamina: 100,
  setStamina: (stamina: number) => set({ stamina: Math.max(0, Math.min(stamina, get().maxStamina)) }),
  consumeStamina: (amount: number) => {
    const current = get().stamina
    set({ stamina: Math.max(0, current - amount) })
  },
  rechargeStamina: (amount: number) => {
    const current = get().stamina
    const max = get().maxStamina
    set({ stamina: Math.min(max, current + amount) })
  },
  
  // Grapple system
  canGrapple: false,
  setCanGrapple: (canGrapple) => set({ canGrapple }),
  grappledBuilding: null,
  setGrappledBuilding: (building) => set({ grappledBuilding: building }),
  grapplePullVelocity: null,
  setGrapplePullVelocity: (velocity) => set({ grapplePullVelocity: velocity }),
  
  // Cooldown system
  startCooldown: (actionId: string, duration: number) => {
    getCooldownManager().startCooldown(actionId, duration)
  },
  isOnCooldown: (actionId: string) => {
    return getCooldownManager().isOnCooldown(actionId)
  },
  getRemainingCooldown: (actionId: string) => {
    return getCooldownManager().getRemainingCooldown(actionId)
  },
  getCooldownProgress: (actionId: string, totalDuration: number) => {
    return getCooldownManager().getCooldownProgress(actionId, totalDuration)
  },
  momentumOnRelease: null,
  setMomentumOnRelease: (momentum) => set({ momentumOnRelease: momentum }),
  
  // Wall-run chain system
  wallRunChain: 0,
  setWallRunChain: (chain) => set({ wallRunChain: chain }),
  
  // Air dash system
  airDashCooldown: 0,
  setAirDashCooldown: (cooldown) => set({ airDashCooldown: cooldown }),
  canAirDash: true,
  setCanAirDash: (canDash) => set({ canAirDash: canDash }),

  // Settings
  qualitySettings: getQualityManager().getSettings(),
  setQualitySettings: (settings: QualitySettings) => set({ qualitySettings: settings }),

  // Combat Feedback
  screenShakeIntensity: 0,
  setScreenShakeIntensity: (intensity) => set({ screenShakeIntensity: intensity }),

  // Social Features
  friends: [],
  friendRequests: [],
  setFriends: (friends) => set({ friends }),
  setFriendRequests: (requests) => set({ friendRequests: requests }),
  isSocialOpen: false,
  toggleSocial: () => set((state) => ({ isSocialOpen: !state.isSocialOpen })),

  // Housing
  housing: null,
  setHousing: (housing) => set({ housing }),
  
  // Floating numbers (enhanced system)
  floatingNumbers: new Map(),
  
  addFloatingNumber: (floatingNumber) => {
    const { floatingNumbers } = get()
    const newNumbers = new Map(floatingNumbers)
    newNumbers.set(floatingNumber.id, floatingNumber)
    set({ floatingNumbers: newNumbers })
  },
  
  removeFloatingNumber: (id) => {
    const { floatingNumbers } = get()
    const newNumbers = new Map(floatingNumbers)
    newNumbers.delete(id)
    set({ floatingNumbers: newNumbers })
  },
  
  updateFloatingNumber: (id, updates) => {
    const { floatingNumbers } = get()
    const floatingNumber = floatingNumbers.get(id)
    if (floatingNumber) {
      const newNumbers = new Map(floatingNumbers)
      newNumbers.set(id, { ...floatingNumber, ...updates })
      set({ floatingNumbers: newNumbers })
    }
  },
  
  // Damage numbers (legacy - kept for backward compatibility)
  damageNumbers: new Map(),
  
  addDamageNumber: (damageNumber) => {
    const { damageNumbers } = get()
    const newNumbers = new Map(damageNumbers)
    newNumbers.set(damageNumber.id, damageNumber)
    set({ damageNumbers: newNumbers })
  },
  
  removeDamageNumber: (id) => {
    const { damageNumbers } = get()
    const newNumbers = new Map(damageNumbers)
    newNumbers.delete(id)
    set({ damageNumbers: newNumbers })
  },
  
  updateDamageNumber: (id, updates) => {
    const { damageNumbers } = get()
    const damageNumber = damageNumbers.get(id)
    if (damageNumber) {
      const newNumbers = new Map(damageNumbers)
      newNumbers.set(id, { ...damageNumber, ...updates })
      set({ damageNumbers: newNumbers })
    }
  }
}))

