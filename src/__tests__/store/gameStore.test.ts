/**
 * Unit tests for GameStore (Zustand store)
 */

import { useGameStore } from '../../game/store/gameStore'
import { Player, Enemy, LootDrop } from '../../game/types'

describe('GameStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.setState({
      player: null,
      enemies: new Map(),
      lootDrops: new Map(),
      inventory: [],
      chatMessages: [],
      isConnected: false
    })
  })

  describe('Authentication', () => {
    test('should set Firebase UID', () => {
      const { setFirebaseUid } = useGameStore.getState()
      setFirebaseUid('test-uid-123')
      
      expect(useGameStore.getState().firebaseUid).toBe('test-uid-123')
    })
  })

  describe('Player State', () => {
    const mockPlayer: Player = {
      id: 'player-1',
      name: 'TestPlayer',
      race: 'human',
      level: 1,
      xp: 0,
      xpToNext: 100,
      credits: 0,
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      inventory: [],
      equippedSpells: []
    }

    test('should set player', () => {
      const { setPlayer } = useGameStore.getState()
      setPlayer(mockPlayer)
      
      expect(useGameStore.getState().player).toEqual(mockPlayer)
    })

    test('should update player position', () => {
      const { setPlayer, updatePlayerPosition } = useGameStore.getState()
      setPlayer(mockPlayer)
      
      updatePlayerPosition({ x: 10, y: 1, z: 5 })
      
      const player = useGameStore.getState().player
      expect(player?.position).toEqual({ x: 10, y: 1, z: 5 })
    })

    test('should update player rotation', () => {
      const { setPlayer, updatePlayerRotation } = useGameStore.getState()
      setPlayer(mockPlayer)
      
      updatePlayerRotation(Math.PI / 2)
      
      const player = useGameStore.getState().player
      expect(player?.rotation).toBe(Math.PI / 2)
    })

    test('should update player health', () => {
      const { setPlayer, updatePlayerHealth } = useGameStore.getState()
      setPlayer(mockPlayer)
      
      updatePlayerHealth(75)
      
      const player = useGameStore.getState().player
      expect(player?.health).toBe(75)
    })

    test('should update player mana', () => {
      const { setPlayer, updatePlayerMana } = useGameStore.getState()
      setPlayer(mockPlayer)
      
      updatePlayerMana(50)
      
      const player = useGameStore.getState().player
      expect(player?.mana).toBe(50)
    })

    test('should add XP', () => {
      const { setPlayer, addXP } = useGameStore.getState()
      setPlayer(mockPlayer)
      
      addXP(50)
      
      const player = useGameStore.getState().player
      expect(player?.xp).toBe(50)
    })

    test('should add credits', () => {
      const { setPlayer, addCredits } = useGameStore.getState()
      setPlayer(mockPlayer)
      
      addCredits(100)
      
      const player = useGameStore.getState().player
      expect(player?.credits).toBe(100)
    })
  })

  describe('Inventory', () => {
    test('should add item to inventory', () => {
      const { addItem } = useGameStore.getState()
      
      addItem('sword', 1)
      
      const inventory = useGameStore.getState().inventory
      expect(inventory.length).toBe(1)
      expect(inventory[0].itemId).toBe('sword')
      expect(inventory[0].quantity).toBe(1)
    })

    test('should increment quantity for existing item', () => {
      const { addItem } = useGameStore.getState()
      
      addItem('sword', 1)
      addItem('sword', 2)
      
      const inventory = useGameStore.getState().inventory
      expect(inventory.length).toBe(1)
      expect(inventory[0].quantity).toBe(3)
    })

    test('should remove item from inventory', () => {
      const { addItem, removeItem } = useGameStore.getState()
      
      addItem('sword', 5)
      removeItem('sword', 2)
      
      const inventory = useGameStore.getState().inventory
      expect(inventory[0].quantity).toBe(3)
    })

    test('should remove item completely when quantity reaches zero', () => {
      const { addItem, removeItem } = useGameStore.getState()
      
      addItem('sword', 2)
      removeItem('sword', 2)
      
      const inventory = useGameStore.getState().inventory
      expect(inventory.length).toBe(0)
    })

    test('should get inventory item', () => {
      const { addItem, getInventoryItem } = useGameStore.getState()
      
      addItem('sword', 3)
      const item = getInventoryItem('sword')
      
      expect(item).toBeDefined()
      expect(item?.itemId).toBe('sword')
      expect(item?.quantity).toBe(3)
    })
  })

  describe('Enemies', () => {
    const mockEnemy: Enemy = {
      id: 'enemy-1',
      type: 'cyber_drone',
      position: { x: 10, y: 0, z: 10 },
      rotation: 0,
      health: 100,
      maxHealth: 100,
      level: 1
    }

    test('should add enemy', () => {
      const { addEnemy } = useGameStore.getState()
      
      addEnemy(mockEnemy)
      
      const enemies = useGameStore.getState().enemies
      expect(enemies.has('enemy-1')).toBe(true)
      expect(enemies.get('enemy-1')).toEqual(mockEnemy)
    })

    test('should remove enemy', () => {
      const { addEnemy, removeEnemy } = useGameStore.getState()
      
      addEnemy(mockEnemy)
      removeEnemy('enemy-1')
      
      const enemies = useGameStore.getState().enemies
      expect(enemies.has('enemy-1')).toBe(false)
    })

    test('should update enemy', () => {
      const { addEnemy, updateEnemy } = useGameStore.getState()
      
      addEnemy(mockEnemy)
      updateEnemy('enemy-1', { health: 50 })
      
      const enemies = useGameStore.getState().enemies
      expect(enemies.get('enemy-1')?.health).toBe(50)
    })
  })

  describe('Loot Drops', () => {
    const mockLoot: LootDrop = {
      id: 'loot-1',
      itemId: 'sword',
      position: { x: 5, y: 0, z: 5 },
      ownerId: 'player-1'
    }

    test('should add loot drop', () => {
      const { addLootDrop } = useGameStore.getState()
      
      addLootDrop(mockLoot)
      
      const lootDrops = useGameStore.getState().lootDrops
      expect(lootDrops.has('loot-1')).toBe(true)
      expect(lootDrops.get('loot-1')).toEqual(mockLoot)
    })

    test('should remove loot drop', () => {
      const { addLootDrop, removeLootDrop } = useGameStore.getState()
      
      addLootDrop(mockLoot)
      removeLootDrop('loot-1')
      
      const lootDrops = useGameStore.getState().lootDrops
      expect(lootDrops.has('loot-1')).toBe(false)
    })
  })

  describe('Chat', () => {
    test('should add chat message', () => {
      const { addChatMessage } = useGameStore.getState()
      
      addChatMessage({
        id: 'msg-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        text: 'Hello!',
        timestamp: Date.now()
      })
      
      const messages = useGameStore.getState().chatMessages
      expect(messages.length).toBe(1)
      expect(messages[0].text).toBe('Hello!')
    })

    test('should clear chat', () => {
      const { addChatMessage, clearChat } = useGameStore.getState()
      
      addChatMessage({
        id: 'msg-1',
        playerId: 'player-1',
        playerName: 'TestPlayer',
        text: 'Hello!',
        timestamp: Date.now()
      })
      clearChat()
      
      const messages = useGameStore.getState().chatMessages
      expect(messages.length).toBe(0)
    })
  })

  describe('Network Connection', () => {
    test('should set connection status', () => {
      const { setConnectionStatus } = useGameStore.getState()
      
      setConnectionStatus(true)
      expect(useGameStore.getState().isConnected).toBe(true)
      
      setConnectionStatus(false)
      expect(useGameStore.getState().isConnected).toBe(false)
    })
  })
})

