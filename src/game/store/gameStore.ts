import { create } from 'zustand'
import { Player, InventoryItem, Spell, ChatMessage, Enemy, ResourceNode, LootDrop, PlayerSkill } from '../types'
import { getItem } from '../data/items'
import { getSpell } from '../data/spells'

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
    rewards: any[]
  }>
  setActiveQuests: (quests: any[]) => void
  setAvailableQuests: (quests: any[]) => void
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
    tiers: any[]
  } | null
  setBattlePassProgress: (progress: any) => void
  setBattlePassSeason: (season: any) => void
  
  // Trading system
  currentTrade: any | null
  isTradeOpen: boolean
  setCurrentTrade: (trade: any | null) => void
  toggleTrade: () => void
  
  // Achievement system
  achievements: any[]
  achievementProgress: any[]
  isAchievementOpen: boolean
  setAchievements: (achievements: any[]) => void
  setAchievementProgress: (progress: any[]) => void
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
  
  // Camera mode
  cameraMode: 'first-person' | 'third-person'
  setCameraMode: (mode: 'first-person' | 'third-person') => void
  toggleCameraMode: () => void
  
  // Movement state (to prevent server overwrites during active movement)
  isPlayerMoving: boolean
  setIsPlayerMoving: (moving: boolean) => void
  
  // Damage numbers
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
    if (player) {
      // Always update position - remove threshold check that might block updates
      const currentPos = player.position
      const changed = Math.abs(currentPos.x - position.x) > 0.001 || 
                      Math.abs(currentPos.y - position.y) > 0.001 || 
                      Math.abs(currentPos.z - position.z) > 0.001
      
      if (changed) {
        // Create new player object with new position to ensure reactivity
        const updatedPlayer = { 
          ...player, 
          position: { 
            x: position.x, 
            y: position.y, 
            z: position.z 
          } 
        }
        set({ player: updatedPlayer })
        
        // Debug: Log every position update in development (for debugging)
        if (import.meta.env.DEV) {
          const delta = {
            x: position.x - currentPos.x,
            y: position.y - currentPos.y,
            z: position.z - currentPos.z
          }
          const distance = Math.sqrt(delta.x * delta.x + delta.z * delta.z)
          
          // Only log if movement is significant (reduces spam)
          if (distance > 0.05) {
            console.log('📍 Position updated:', { 
              from: { x: currentPos.x.toFixed(2), y: currentPos.y.toFixed(2), z: currentPos.z.toFixed(2) }, 
              to: { x: position.x.toFixed(2), y: position.y.toFixed(2), z: position.z.toFixed(2) },
              delta: { x: delta.x.toFixed(3), y: delta.y.toFixed(3), z: delta.z.toFixed(3) },
              distance: distance.toFixed(3)
            })
          }
        }
      } else if (import.meta.env.DEV) {
        // Log when position update is blocked (for debugging)
        console.warn('⚠️ Position update blocked (no change):', {
          current: { x: currentPos.x, y: currentPos.y, z: currentPos.z },
          requested: { x: position.x, y: position.y, z: position.z }
        })
      }
    } else {
      if (import.meta.env.DEV) {
        console.error('❌ updatePlayerPosition called but player is null!')
      }
    }
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
      set({ player: { ...player, health: Math.max(0, Math.min(health, player.maxHealth)) } })
    }
  },
  
  updatePlayerMana: (mana) => {
    const { player } = get()
    if (player) {
      set({ player: { ...player, mana: Math.max(0, Math.min(mana, player.maxMana)) } })
    }
  },
  
  addXP: (amount) => {
    const { player } = get()
    if (!player) return
    
    let newXP = player.xp + amount
    let newLevel = player.level
    let xpToNext = player.xpToNext
    
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
    set({ lootDrops: newDrops })
  },
  
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
  
  // Game state
  currentZone: 'nexus_city',
  setCurrentZone: (zoneId) => set({ currentZone: zoneId }),
  
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
  setActiveQuests: (quests) => set({ activeQuests: quests }),
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
  setBattlePassSeason: (season) => set({ battlePassSeason: season }),
  
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
  
  // Camera mode
  cameraMode: 'third-person' as 'first-person' | 'third-person',
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
  
  // Damage numbers
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

