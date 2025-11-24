import { Client, Room } from 'colyseus.js'
import { useGameStore } from '../store/useGameStore'
import { getItem } from '../data/items'

// Type definitions for room state
interface PlayerSchema {
  id: string
  name: string
  race: string
  x: number
  y: number
  z: number
  rotation: number
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  level: number
  guildId?: string
  guildTag?: string
}

interface EnemySchema {
  id: string
  type: string
  x: number
  y: number
  z: number
  rotation: number
  health: number
  maxHealth: number
  level: number
  ownerId?: string
}

interface LootDropSchema {
  id: string
  itemId: string
  x: number
  y: number
  z: number
  ownerId?: string
  expiresAt: number
}

interface NexusRoomState {
  players: Map<string, PlayerSchema>
  enemies: Map<string, EnemySchema>
  resourceNodes: any
  lootDrops: Map<string, LootDropSchema>
  spellProjectiles: any
}

let client: Client | null = null
let room: Room | null = null
let isConnecting = false

export function initializeClient(serverUrl: string = 'ws://localhost:2567') {
  client = new Client(serverUrl)
  return client
}

export async function joinRoom(playerName: string, race: string, isReconnectAttempt = false, firebaseToken?: string) {
  // If already connected and not a reconnect attempt, don't reconnect
  if (room && room.connection.isOpen && !isReconnectAttempt) {
    console.log('Already connected to room:', room.sessionId)
    return room
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting && !isReconnectAttempt) {
    console.log('Connection already in progress, waiting...')
    // Wait for existing connection to complete
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (room && room.connection.isOpen) {
      return room
    }
  }

  // Clean up existing room if disconnected or during reconnection
  if (room) {
    // During reconnection, always close the old room
    if (isReconnectAttempt) {
      try {
        room.leave()
      } catch (e) {
        // Room already closed, ignore
      }
      room = null
    } else if (!room.connection.isOpen) {
      // Room is closed, clean it up
      try {
        room.leave()
      } catch (e) {
        // Room already closed, ignore
      }
      room = null
    } else {
      // Room is still open and not a reconnect attempt, return it
      return room
    }
  }

  isConnecting = true

  if (!client) {
    client = initializeClient()
  }

  try {
    // Get Firebase token if not provided
    let idToken: string | undefined = firebaseToken
    if (!idToken) {
      const { getIdToken } = await import('../../firebase/auth')
      idToken = await getIdToken() || undefined
    }

    room = await client.joinOrCreate<NexusRoomState>('nexus', {
      name: playerName,
      race,
      firebaseToken: idToken || undefined // Send Firebase token for verification
    })

    console.log('Joined room:', room.sessionId)

    // Register message handlers IMMEDIATELY to prevent "not registered" warnings
    // These must be registered before any messages can arrive
    room.onMessage('stateDelta', (data: { deltas: any[] }) => {
      // Apply delta updates to game state
      // This is handled by the onAdd/onRemove/onChange listeners in setupRoomListeners
      // but we register the handler early to prevent warnings
      if (data.deltas && data.deltas.length > 0) {
        // Delta updates are already applied through schema listeners
        // This handler just prevents the "not registered" warning
      }
    })

    // Wait for state to be initialized before setting up listeners
    await waitForStateInitialization(room)

    // Set up room event listeners
    await setupRoomListeners(room)

    // Handle disconnection with reconnection logic
    room.onLeave(async (code) => {
      console.log('Left room, code:', code)
      useGameStore.getState().setConnected(false)
      
      // Clear room reference immediately to prevent race conditions
      const oldRoom = room
      room = null
      isConnecting = false
      listenersSetup = false // Reset listeners flag on leave
      
      // Only attempt reconnection if not intentionally left (code 1000 = normal closure)
      if (code !== 1000) {
        const { reconnectionManager } = await import('./reconnection')
        const { joinRoom } = await import('./colyseus')
        const playerName = useGameStore.getState().player?.name || 'Player'
        const race = useGameStore.getState().player?.race || 'human'
        
        reconnectionManager.startReconnection(
          async () => {
            try {
              // Get Firebase token for reconnection
              const { getIdToken } = await import('../../firebase/auth')
              const firebaseToken = await getIdToken()
              
              // Pass isReconnectAttempt flag to bypass "already connected" check
              // Reset listeners flag before reconnecting
              listenersSetup = false
              const newRoom = await joinRoom(playerName, race, true, firebaseToken || undefined)
              return newRoom
            } catch (error) {
              console.error('Reconnection failed:', error)
              return null
            }
          },
          (reconnectedRoom) => {
            console.log('Reconnected successfully!')
            room = reconnectedRoom
            useGameStore.getState().setConnected(true)
          },
          () => {
            console.error('Max reconnection attempts reached')
            useGameStore.getState().addChatMessage({
              id: `reconnect_failed_${Date.now()}`,
              playerId: 'system',
              playerName: 'System',
              message: 'Failed to reconnect. Please refresh the page.',
              timestamp: Date.now(),
              type: 'system',
              color: '#ff0000'
            })
          }
        )
      }
      
      // Clean up old room listeners if needed
      if (oldRoom) {
        try {
          oldRoom.removeAllListeners()
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    })

    // Handle errors
    room.onError((code, message) => {
      console.error('Room error:', code, message)
      useGameStore.getState().setConnected(false)
    })

    useGameStore.getState().setConnected(true)
    isConnecting = false
    
    // Start latency monitoring
    const { reconnectionManager } = await import('./reconnection')
    reconnectionManager.startLatencyMonitoring(room)

    return room
  } catch (error) {
    console.error('Failed to join room:', error)
    useGameStore.getState().setConnected(false)
    room = null
    isConnecting = false
    listenersSetup = false // Reset listeners flag on error
    throw error
  }
}

export function leaveRoom() {
  if (room) {
    try {
      room.leave() // Normal closure
    } catch (e) {
      // Room already closed, ignore
    }
    room = null
  }
  isConnecting = false
  listenersSetup = false // Reset listeners flag on leave
  useGameStore.getState().setConnected(false)
}

// Track if listeners have been set up to prevent duplicate registrations
let listenersSetup = false

/**
 * Wait for room state to be fully initialized
 * Checks that state properties are MapSchema instances with onAdd methods
 */
function waitForStateInitialization(room: Room): Promise<void> {
  return new Promise((resolve) => {
    // Helper to check if a property is a valid MapSchema
    const isMapSchema = (obj: any): boolean => {
      return obj && typeof obj === 'object' && typeof obj.onAdd === 'function'
    }

    // If state is already initialized with MapSchema instances, resolve immediately
    if (room.state && 
        isMapSchema(room.state.players) && 
        isMapSchema(room.state.enemies) && 
        isMapSchema(room.state.lootDrops)) {
      resolve()
      return
    }

    // Listen for state change event (more reliable than polling)
    let stateChangeHandler: (() => void) | null = null
    let timeoutId: number | null = null
    let checkIntervalId: number | null = null
    
    const cleanup = () => {
      if (stateChangeHandler) {
        room.off('statechange', stateChangeHandler)
        stateChangeHandler = null
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (checkIntervalId !== null) {
        clearInterval(checkIntervalId)
        checkIntervalId = null
      }
    }

    const checkState = () => {
      // Check if room is still connected
      if (!room.connection.isOpen) {
        cleanup()
        resolve() // Resolve anyway, connection will be handled elsewhere
        return
      }

      if (room.state && 
          isMapSchema(room.state.players) && 
          isMapSchema(room.state.enemies) && 
          isMapSchema(room.state.lootDrops)) {
        cleanup()
        resolve()
      }
    }

    // Set up state change listener
    stateChangeHandler = () => {
      checkState()
    }
    room.on('statechange', stateChangeHandler)

    // Also poll periodically as a fallback (every 50ms)
    checkIntervalId = window.setInterval(checkState, 50)

    // Set timeout (2 seconds max wait)
    timeoutId = window.setTimeout(() => {
      cleanup()
      if (room.state && 
          (isMapSchema(room.state.players) || 
           isMapSchema(room.state.enemies) || 
           isMapSchema(room.state.lootDrops))) {
        // At least some state is initialized, proceed
        console.warn('State initialization timeout - Some MapSchema instances may not be ready, proceeding anyway')
        resolve()
      } else {
        // No state initialized, but resolve anyway to prevent hanging
        console.warn('State initialization timeout - No MapSchema instances ready, proceeding anyway')
        resolve()
      }
    }, 2000)

    // Initial check
    checkState()
  })
}

async function setupRoomListeners(room: Room) {
  // Prevent duplicate listener setup during reconnection
  if (listenersSetup) {
    console.log('Listeners already setup, skipping duplicate registration')
    return
  }

  // Validate state exists before proceeding
  if (!room.state) {
    console.error('Room state not initialized, cannot setup listeners')
    return
  }

  // Register message handlers FIRST to prevent "not registered" warnings
  // These must be registered before any messages can arrive
  // Note: stateDelta handler is already registered in joinRoom() before this function is called
  
  // Handle position corrections from server (anti-cheat)
  room.onMessage('positionCorrection', (data: { x: number; y: number; z: number; rotation: number }) => {
    // Server rejected movement - reconcile position
    import('./syncSystem').then(({ reconcilePosition }) => {
      reconcilePosition({ x: data.x, y: data.y, z: data.z }, data.rotation)
    })
  })

  // Listen for loot pickup confirmation
  room.onMessage('lootPickedUp', (data) => {
    if (data.playerId === room?.sessionId) {
      // You picked up the loot - item already added by server
      useGameStore.getState().addItem(data.itemId, 1)
    }
    // Remove from world
    useGameStore.getState().removeLootDrop(data.lootId)
  })

  // Listen for chat messages
  room.onMessage('chat', (message) => {
    useGameStore.getState().addChatMessage({
      id: `msg_${message.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: message.playerId,
      playerName: message.playerName,
      message: message.message,
      timestamp: message.timestamp,
      type: 'global',
      color: '#00ffff'
    })
  })

  // Listen for quest updates
  room.onMessage('questUpdate', (data: { activeQuests: any[] }) => {
    useGameStore.getState().setActiveQuests(data.activeQuests)
  })

  room.onMessage('questAccepted', (_data: { questId: string }) => {
    // Quest was accepted, refresh quest list
    const { player } = useGameStore.getState()
    if (player) {
      // Request updated quest list
    }
  })

  room.onMessage('questCompleted', (_data: { questId: string }) => {
    // Quest was completed, show notification
    useGameStore.getState().addChatMessage({
      id: `quest_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `Quest completed!`,
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
  })

  room.onMessage('questError', (data: { message: string }) => {
    console.error('Quest error:', data.message)
  })

  room.onMessage('availableQuests', (data: { quests: any[] }) => {
    useGameStore.getState().setAvailableQuests(data.quests)
  })

  // Listen for battle pass updates
  room.onMessage('battlePassUpdate', (data: { progress: any; season: any }) => {
    useGameStore.getState().setBattlePassProgress(data.progress)
    useGameStore.getState().setBattlePassSeason(data.season)
  })

  room.onMessage('battlePassRewardClaimed', (data: { tier: number; track: string }) => {
    // Show notification
    useGameStore.getState().addChatMessage({
      id: `battlepass_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `Battle pass reward claimed! Tier ${data.tier} (${data.track})`,
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
  })

  room.onMessage('battlePassPremiumUnlocked', () => {
    useGameStore.getState().addChatMessage({
      id: `battlepass_premium_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: 'Premium battle pass unlocked!',
      timestamp: Date.now(),
      type: 'system',
      color: '#ffd700'
    })
  })

  room.onMessage('battlePassError', (data: { message: string }) => {
    console.error('Battle pass error:', data.message)
  })

  // Listen for trade updates
  room.onMessage('tradeInitiated', (data: { session: any; isPlayer1: boolean }) => {
    useGameStore.getState().setCurrentTrade(data.session)
    useGameStore.getState().toggleTrade()
  })

  room.onMessage('tradeUpdated', (data: { session: any }) => {
    useGameStore.getState().setCurrentTrade(data.session)
  })

  room.onMessage('tradeCompleted', (_data: { session: any }) => {
    useGameStore.getState().addChatMessage({
      id: `trade_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: 'Trade completed successfully!',
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
    useGameStore.getState().setCurrentTrade(null)
    useGameStore.getState().toggleTrade()
  })

  room.onMessage('tradeCancelled', (_data: { sessionId: string }) => {
    useGameStore.getState().setCurrentTrade(null)
    useGameStore.getState().toggleTrade()
  })

  room.onMessage('tradeError', (data: { message: string }) => {
    console.error('Trade error:', data.message)
    useGameStore.getState().addChatMessage({
      id: `trade_error_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `Trade error: ${data.message}`,
      timestamp: Date.now(),
      type: 'system',
      color: '#ff0000'
    })
  })

  // Listen for achievement updates
  room.onMessage('achievementProgress', (data: { achievements: any[]; progress: any[] }) => {
    useGameStore.getState().setAchievements(data.achievements)
    useGameStore.getState().setAchievementProgress(data.progress)
  })

  room.onMessage('achievementUnlocked', (data: { achievement: any }) => {
    useGameStore.getState().addChatMessage({
      id: `achievement_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `🏆 Achievement Unlocked: ${data.achievement.name}!`,
      timestamp: Date.now(),
      type: 'system',
      color: '#ffd700'
    })
    
    // Update progress
    const currentProgress = useGameStore.getState().achievementProgress
    const updated = currentProgress.map(p => 
      p.achievementId === data.achievement.id
        ? { ...p, unlocked: true, unlockedAt: Date.now(), progress: 1 }
        : p
    )
    useGameStore.getState().setAchievementProgress(updated)
  })

  // Listen for world boss spawn
  room.onMessage('worldBossSpawned', (data) => {
    useGameStore.getState().addChatMessage({
      id: `boss_${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      message: data.message,
      timestamp: Date.now(),
      type: 'system',
      color: '#ff00ff'
    })
  })

  // Listen for damage numbers
  room.onMessage('damageNumber', async (data: { enemyId: string; damage: number; isCrit: boolean; position: { x: number; y: number; z: number } }) => {
    // Get damage number from pool
    const { damageNumberPool } = await import('../utils/damageNumberPool')
    const damageNumber = damageNumberPool.get()
    
    damageNumber.id = `damage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    damageNumber.damage = data.damage
    damageNumber.position = data.position
    damageNumber.isCrit = data.isCrit
    damageNumber.createdAt = Date.now()
    damageNumber.opacity = 1
    damageNumber.yOffset = 0
    
    // Add to game store
    useGameStore.getState().addDamageNumber(damageNumber)
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      useGameStore.getState().removeDamageNumber(damageNumber.id)
      damageNumberPool.release(damageNumber)
    }, 2000)
  })

  // Listen for kills
  room.onMessage('kill', (data) => {
    useGameStore.getState().addChatMessage({
      id: `kill_${Date.now()}`,
      playerId: data.killerId,
      playerName: data.killerName,
      message: `defeated ${data.enemyType}`,
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
  })

  // Listen for combo updates
  room.onMessage('combo', (data) => {
    if (data.playerId === room?.sessionId) {
      // Your combo!
      useGameStore.getState().addChatMessage({
        id: `combo_${Date.now()}`,
        playerId: 'system',
        playerName: 'System',
        message: `🔥 ${data.kills}x COMBO! ${data.multiplier.toFixed(1)}x multiplier! 🔥`,
        timestamp: Date.now(),
        type: 'system',
        color: '#ff00ff'
      })
    }
  })

  // Listen for guild events
  room.onMessage('guildCreated', (data) => {
    const { player } = useGameStore.getState()
    if (player) {
      player.guildId = data.guildId
      // Guild tag will be updated by server state sync
    }
  })

  room.onMessage('guildJoined', (data) => {
    const { player } = useGameStore.getState()
    if (player) {
      player.guildId = data.guildId
    }
  })

  room.onMessage('guildChat', (data) => {
    // Handle guild chat messages
    useGameStore.getState().addChatMessage({
      id: `guild_${data.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: data.playerId,
      playerName: data.playerName,
      message: data.message,
      timestamp: data.timestamp,
      type: 'guild',
      color: '#9d00ff'
    })
  })

  room.onMessage('whisper', (data) => {
    useGameStore.getState().addChatMessage({
      id: `whisper_${data.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: data.fromId,
      playerName: data.fromName,
      message: data.message,
      timestamp: data.timestamp,
      type: 'whisper',
      color: '#00ff00'
    })
  })

  room.onMessage('emote', (data) => {
    // Display emote notification
    useGameStore.getState().addChatMessage({
      id: `emote_${data.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: data.playerId,
      playerName: data.playerName,
      message: `*${data.playerName} ${data.emote}s*`,
      timestamp: data.timestamp,
      type: 'system',
      color: '#ffff00'
    })
  })

  // Validate state properties exist and are MapSchema instances before accessing them
  // Do this BEFORE setting listenersSetup = true to ensure we don't mark as setup if validation fails
  const isMapSchema = (obj: any): boolean => {
    return obj && typeof obj === 'object' && typeof obj.onAdd === 'function'
  }

  if (!room.state.players || !isMapSchema(room.state.players)) {
    console.error('room.state.players is not initialized or not a MapSchema', room.state.players)
    return
  }

  if (!room.state.enemies || !isMapSchema(room.state.enemies)) {
    console.error('room.state.enemies is not initialized or not a MapSchema', room.state.enemies)
    return
  }

  if (!room.state.lootDrops || !isMapSchema(room.state.lootDrops)) {
    console.error('room.state.lootDrops is not initialized or not a MapSchema', room.state.lootDrops)
    return
  }

  // Now set up state listeners AFTER message handlers are registered and validation passes
  listenersSetup = true
  
  // Listen for state changes
  room.onStateChange((state) => {
    syncGameState(state)
  })

  // Listen for player updates
  // Double-check onAdd exists before calling (defensive programming)
  if (typeof room.state.players.onAdd === 'function') {
    room.state.players.onAdd((player: PlayerSchema, sessionId: string) => {
      // Prevent duplicate additions - check if player already exists
      const { otherPlayers } = useGameStore.getState()
      
      // Don't add ourselves or if player already exists
      if (sessionId === room?.sessionId || otherPlayers.has(sessionId)) {
        return
      }
      
      // Other player joined
      useGameStore.getState().addOtherPlayer({
        id: sessionId,
        name: player.name,
        race: player.race as any,
        level: player.level,
        xp: 0,
        xpToNext: 100,
        credits: 0,
        position: { x: player.x, y: player.y, z: player.z },
        rotation: player.rotation,
        health: player.health,
        maxHealth: player.maxHealth,
        mana: player.mana,
        maxMana: player.maxMana,
        guildId: player.guildId || undefined,
        guildTag: player.guildTag || undefined
      })
    })
  } else {
    console.error('room.state.players.onAdd is not a function')
  }

  if (typeof room.state.players.onRemove === 'function') {
    room.state.players.onRemove((_player: PlayerSchema, sessionId: string) => {
      if (sessionId !== room?.sessionId) {
        useGameStore.getState().removeOtherPlayer(sessionId)
      }
    })
  }

  if (typeof room.state.players.onChange === 'function') {
    room.state.players.onChange((player: PlayerSchema, sessionId: string) => {
      // Guard against null/undefined player
      if (!player) return
      
      if (sessionId === room?.sessionId) {
        // Update own player's guild info
        const { setPlayer } = useGameStore.getState()
        const currentPlayer = useGameStore.getState().player
        if (currentPlayer) {
          setPlayer({
            ...currentPlayer,
            guildId: player.guildId || undefined,
            guildTag: player.guildTag || undefined
          })
        }
      } else {
        useGameStore.getState().updateOtherPlayer(sessionId, {
          position: { x: player.x, y: player.y, z: player.z },
          rotation: player.rotation,
          health: player.health,
          mana: player.mana,
          guildId: player.guildId || undefined,
          guildTag: player.guildTag || undefined
        })
      }
    })
  }

  // Listen for enemy updates (with defensive check)
  if (room.state.enemies && typeof room.state.enemies.onAdd === 'function') {
    room.state.enemies.onAdd((enemy: EnemySchema) => {
      useGameStore.getState().addEnemy({
        id: enemy.id,
        type: enemy.type,
        position: { x: enemy.x, y: enemy.y, z: enemy.z },
        rotation: enemy.rotation,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        level: enemy.level,
        ownerId: enemy.ownerId || undefined
      })
    })

    if (typeof room.state.enemies.onRemove === 'function') {
      room.state.enemies.onRemove((enemy: EnemySchema) => {
        useGameStore.getState().removeEnemy(enemy.id)
      })
    }

    if (typeof room.state.enemies.onChange === 'function') {
      room.state.enemies.onChange((enemy: EnemySchema) => {
        useGameStore.getState().updateEnemy(enemy.id, {
          position: { x: enemy.x, y: enemy.y, z: enemy.z },
          rotation: enemy.rotation,
          health: enemy.health
        })
      })
    }
  }

  // Listen for loot drops (with defensive check)
  if (room.state.lootDrops && typeof room.state.lootDrops.onAdd === 'function') {
    room.state.lootDrops.onAdd((loot: LootDropSchema) => {
      const item = getItem(loot.itemId)
      if (item) {
        useGameStore.getState().addLootDrop({
          id: loot.id,
          item,
          position: { x: loot.x, y: loot.y, z: loot.z },
          ownerId: loot.ownerId || undefined,
          expiresAt: loot.expiresAt
        })
      }
    })

    if (typeof room.state.lootDrops.onRemove === 'function') {
      room.state.lootDrops.onRemove((loot: LootDropSchema) => {
        useGameStore.getState().removeLootDrop(loot.id)
      })
    }
  }
}

function syncGameState(_state: NexusRoomState) {
  // Sync enemies, resource nodes, loot drops, etc.
  // This is handled by the onAdd/onRemove/onChange listeners above
}

export function sendMovement(x: number, y: number, z: number, rotation: number) {
  if (room) {
    room.send('move', { x, y, z, rotation })
  }
}

export function sendSpellCast(spellId: string, position: { x: number; y: number; z: number }, rotation: number) {
  if (room) {
    room.send('castSpell', { spellId, position, rotation })
  }
}

export function sendChatMessage(message: string) {
  if (room) {
    room.send('chat', { text: message })
  }
}

export function sendLootPickup(lootId: string) {
  if (room) {
    room.send('pickupLoot', { lootId })
  }
}

export function sendGuildCreate(name: string, tag: string) {
  if (room) {
    room.send('createGuild', { name, tag })
  }
}

export function sendGuildJoin(guildId: string) {
  if (room) {
    room.send('joinGuild', { guildId })
  }
}

export function sendGuildLeave() {
  if (room) {
    room.send('leaveGuild', {})
  }
}

export function sendGuildChat(message: string) {
  if (room) {
    room.send('guildChat', { text: message })
  }
}

export function sendWhisper(targetId: string, message: string) {
  if (room) {
    room.send('whisper', { targetId, text: message })
  }
}

export function sendEmote(emote: string) {
  if (room) {
    room.send('emote', { emote })
  }
}

export function getRoom(): Room | null {
  return room
}


