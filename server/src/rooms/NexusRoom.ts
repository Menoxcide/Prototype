import { Room, type Client } from '@colyseus/core'
import { NexusRoomState, PlayerSchema, EnemySchema, ResourceNodeSchema, LootDropSchema, SpellProjectileSchema, GuildSchema } from './schema'
import { GAME_CONFIG } from '../../shared/config'
import { createSpatialHashGrid, SpatialHashGrid } from '../utils/spatialHashGrid'
import { createDeltaCompressor, DeltaCompressor } from '../utils/deltaCompressor'
import { DatabaseService } from '../services/DatabaseService'
import { PlayerDataRepository } from '../services/PlayerDataRepository'
import { QuestSystemImpl, QuestSystem } from '../systems/QuestSystem'
import { BattlePassSystemImpl, BattlePassSystem } from '../systems/BattlePassSystem'
import { DungeonSystemImpl, DungeonSystem } from '../systems/DungeonSystem'
import { DungeonGeneratorImpl } from '../systems/DungeonGenerator'
import { TradingSystemImpl, TradingSystem } from '../systems/TradingSystem'
import { AchievementSystemImpl, AchievementSystem } from '../systems/AchievementSystem'
import { SecurityServiceImpl, SecurityService } from '../services/SecurityService'
import { MonitoringServiceImpl, MonitoringService } from '../services/MonitoringService'
import { rateLimiter, RATE_LIMITS } from '../utils/rateLimiter'
import { redisService } from '../services/RedisService'
import { HousingSystemImpl, HousingSystem } from '../systems/HousingSystem'
import { SocialSystemImpl, SocialSystem } from '../systems/SocialSystem'

interface EnemyEntity {
  id: string
  position: { x: number; y: number; z: number }
}

interface ProjectileEntity {
  id: string
  position: { x: number; y: number; z: number }
}

// Message types for onMessage handler
type ClientMessage =
  | { type: 'move'; x: number; y: number; z: number; rotation: number }
  | { type: 'castSpell'; spellId: string; position: { x: number; y: number; z: number }; rotation: number }
  | { type: 'chat'; text: string }
  | { type: 'pickupLoot'; lootId: string }
  | { type: 'createGuild'; name: string; tag: string }
  | { type: 'joinGuild'; guildId: string }
  | { type: 'leaveGuild' }
  | { type: 'guildChat'; text: string }
  | { type: 'whisper'; targetId: string; text: string }
  | { type: 'emote'; emote: string }
  | { type: 'acceptQuest'; questId: string }
  | { type: 'completeQuest'; questId: string }
  | { type: 'claimBattlePassReward'; tier: number; track: 'free' | 'premium' }
  | { type: 'unlockBattlePassPremium' }
  | { type: 'requestBattlePassProgress' }
  | { type: 'createDungeon'; difficulty: number; level: number }
  | { type: 'enterDungeon'; dungeonId: string }
  | { type: 'exitDungeon'; dungeonId: string }
  | { type: 'requestDungeonProgress'; dungeonId: string }
  | { type: 'initiateTrade'; targetPlayerId: string }
  | { type: 'addTradeItem'; sessionId: string; itemId: string; quantity: number }
  | { type: 'removeTradeItem'; sessionId: string; itemId: string }
  | { type: 'setTradeCredits'; sessionId: string; credits: number }
  | { type: 'confirmTrade'; sessionId: string }
  | { type: 'cancelTrade'; sessionId: string }
  | { type: 'requestAchievementProgress' }

export class NexusRoom extends Room<NexusRoomState> {
  maxClients = 1000
  enemySpawnTimer: NodeJS.Timeout | null = null
  gameLoopTimer: NodeJS.Timeout | null = null
  worldBossTimer: NodeJS.Timeout | null = null
  enemySpawnPositions = new Map<string, { x: number; y: number; z: number }>()
  playerCombos = new Map<string, { kills: number; startTime: number; multiplier: number }>()
  
  // Spatial hash grids for optimized collision detection
  enemySpatialGrid: SpatialHashGrid<EnemyEntity> = createSpatialHashGrid(10)
  projectileSpatialGrid: SpatialHashGrid<ProjectileEntity> = createSpatialHashGrid(10)
  
  // Delta compression for state updates
  deltaCompressor: DeltaCompressor = createDeltaCompressor()
  previousStateSnapshot: any = null
  
  // Update batching
  updateBatchTimer: NodeJS.Timeout | null = null
  pendingEntityUpdates: Map<string, any> = new Map()
  lastBatchTime: number = Date.now()
  
  // Entity cleanup
  cleanupTimer: NodeJS.Timeout | null = null
  memoryThreshold: number = 500 * 1024 * 1024 // 500MB
  
  // Database service
  databaseService: DatabaseService | null = null
  playerDataRepository: PlayerDataRepository | null = null
  autoSaveTimer: NodeJS.Timeout | null = null
  
  // Quest system
  questSystem: QuestSystem | null = null
  dailyQuestResetTimer: NodeJS.Timeout | null = null
  weeklyQuestResetTimer: NodeJS.Timeout | null = null
  
  // Battle pass system
  battlePassSystem: BattlePassSystem | null = null
  
  // Dungeon system
  dungeonSystem: DungeonSystem | null = null
  
  // Trading system
  tradingSystem: TradingSystem | null = null
  
  // Achievement system
  achievementSystem: AchievementSystem | null = null
  
  // Housing system
  housingSystem: HousingSystem | null = null
  
  // Social system
  socialSystem: SocialSystem | null = null
  
  // Security service
  securityService: SecurityService = new SecurityServiceImpl()
  
  // Monitoring service (use provided or create new)
  monitoringService!: MonitoringService
  
  // Performance tracking
  private gameLoopStartTime: number = 0
  private lastTickTime: number = Date.now()
  private tickTimeHistory: number[] = []
  
  // Track Firebase UID to sessionId mapping to prevent duplicate sessions
  private playerIdToSessionId = new Map<string, string>()

  onCreate(options: any) {
    this.setState(new NexusRoomState())
    
    // Use provided monitoring service or create new one
    this.monitoringService = options.monitoringService || new MonitoringServiceImpl()
    
    // Set up Redis pub/sub for cross-instance communication (if Redis is available)
    if (process.env.REDIS_URL) {
      this.setupRedisSync()
    }

    // Initialize database service (if provided)
    if (options.databaseService) {
      this.databaseService = options.databaseService
      this.playerDataRepository = new PlayerDataRepository(this.databaseService!)
      
      // Initialize quest system
      this.questSystem = new QuestSystemImpl(this.databaseService, this.playerDataRepository)
      
      // Initialize battle pass system
      this.battlePassSystem = new BattlePassSystemImpl(this.databaseService, this.playerDataRepository)
      
      // Initialize dungeon system
      const dungeonGenerator = new DungeonGeneratorImpl()
      this.dungeonSystem = new DungeonSystemImpl(dungeonGenerator, this.databaseService, this.playerDataRepository)
      
      // Start auto-save timer (every 60 seconds)
      this.autoSaveTimer = setInterval(() => {
        this.autoSavePlayerData()
      }, 60000) // 60 seconds
    } else {
      // Initialize quest system without database (in-memory only)
      this.questSystem = new QuestSystemImpl(null, null)
      // Initialize battle pass system without database (in-memory only)
      this.battlePassSystem = new BattlePassSystemImpl(null, null)
      // Initialize dungeon system without database (in-memory only)
      const dungeonGenerator = new DungeonGeneratorImpl()
      this.dungeonSystem = new DungeonSystemImpl(dungeonGenerator, null, null)
      // Initialize trading system without database (in-memory only)
      this.tradingSystem = new TradingSystemImpl(
        null,
        null,
        (player1Id: string, player2Id: string) => this.validateTradeProximity(player1Id, player2Id),
        (playerId: string) => this.getPlayerInventory(playerId),
        (playerId: string, itemId: string, quantity: number) => this.validateItemOwnership(playerId, itemId, quantity)
      )
      // Initialize achievement system without database (in-memory only)
      this.achievementSystem = new AchievementSystemImpl(null, null)
      
      // Initialize housing system without database (in-memory only)
      this.housingSystem = new HousingSystemImpl(null, null)
      
      // Initialize social system without database (in-memory only)
      this.socialSystem = new SocialSystemImpl(null, null)
    }

    // Spawn initial enemies
    this.spawnInitialEnemies()

    // Spawn initial resource nodes
    this.spawnInitialResources()

    // Start enemy spawn timer (only spawn if there are players)
    this.enemySpawnTimer = setInterval(() => {
      if (this.clients.length > 0 && this.state.enemies.size < 50) {
        this.spawnEnemy()
      }
    }, GAME_CONFIG.enemySpawnRate)

    // Start game loop (60 FPS for game logic)
    this.gameLoopTimer = setInterval(() => {
      this.gameLoop()
      this.updateEnemyAI()
    }, 16) // ~60 FPS

    // Start update batching (10Hz for network updates)
    this.updateBatchTimer = setInterval(() => {
      this.batchEntityUpdates()
    }, 100) // 10Hz

    // Start entity cleanup (every 30 seconds)
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntities()
      this.checkMemoryUsage()
    }, 30000) // 30 seconds

    // Schedule daily quest reset (at midnight)
    this.scheduleDailyQuestReset()

    // Schedule weekly quest reset (on Monday at midnight)
    this.scheduleWeeklyQuestReset()

    // Schedule world boss
    this.scheduleWorldBoss()

    // Initialize previous state snapshot for delta compression
    this.previousStateSnapshot = this.serializeState()

    // Register message handlers using Colyseus standard pattern
    this.onMessage('move', (client, message: { x: number; y: number; z: number; rotation: number }) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      
      // Validate movement with security service
      const from = { x: player.x, y: player.y, z: player.z }
      const to = { x: message.x, y: message.y, z: message.z }
      const timestamp = Date.now()
      
      if (!this.securityService.validateMovement(client.sessionId, from, to, timestamp)) {
        // Movement rejected - send correction to client
        client.send('positionCorrection', {
          x: player.x,
          y: player.y,
          z: player.z,
          rotation: player.rotation
        })
        return
      }
      
      // Check for cheating patterns
      const suspicionLevel = this.securityService.detectCheating(client.sessionId, {
        type: 'move',
        playerId: client.sessionId,
        timestamp,
        data: { from, to }
      })
      
      if (suspicionLevel === 'critical') {
        // Kick player for critical violations
        client.leave(1000, 'Suspicious activity detected')
        return
      }
      
      // Server-authoritative position update
      player.x = message.x
      player.y = message.y
      player.z = message.z
      player.rotation = message.rotation
    })

    this.onMessage('castSpell', (client, message: { spellId: string; position: { x: number; y: number; z: number }; rotation: number }) => {
      // Rate limit spell casting
      const limitResult = rateLimiter.checkLimit(client.sessionId, 'spellCast', RATE_LIMITS.SPELL_CAST)
      if (!limitResult.allowed) {
        client.send('rateLimitExceeded', {
          action: 'castSpell',
          resetTime: limitResult.resetTime
        })
        return
      }
      
      this.handleSpellCast(client.sessionId, message.spellId, message.position, message.rotation)
    })

    this.onMessage('chat', (client, message: { text: string }) => {
      // Rate limit chat
      const limitResult = rateLimiter.checkLimit(client.sessionId, 'chat', RATE_LIMITS.CHAT)
      if (!limitResult.allowed) {
        client.send('rateLimitExceeded', {
          action: 'chat',
          resetTime: limitResult.resetTime
        })
        return
      }
      
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      
      this.broadcast('chat', {
        playerId: client.sessionId,
        playerName: player.name,
        message: message.text,
        timestamp: Date.now()
      })
    })

    this.onMessage('pickupLoot', (client, message: { lootId: string }) => {
      this.handleLootPickup(client.sessionId, message.lootId)
    })

    this.onMessage('createGuild', (client, message: { name: string; tag: string }) => {
      // Rate limit guild creation
      const limitResult = rateLimiter.checkLimit(client.sessionId, 'guildCreate', RATE_LIMITS.GUILD_CREATE)
      if (!limitResult.allowed) {
        client.send('rateLimitExceeded', {
          action: 'createGuild',
          resetTime: limitResult.resetTime
        })
        return
      }
      
      this.handleCreateGuild(client.sessionId, message.name, message.tag)
    })

    this.onMessage('joinGuild', (client, message: { guildId: string }) => {
      this.handleJoinGuild(client.sessionId, message.guildId)
    })

    this.onMessage('leaveGuild', (client) => {
      this.handleLeaveGuild(client.sessionId)
    })

    this.onMessage('guildChat', (client, message: { text: string }) => {
      // Rate limit guild chat
      const limitResult = rateLimiter.checkLimit(client.sessionId, 'guildChat', RATE_LIMITS.GUILD_CHAT)
      if (!limitResult.allowed) {
        client.send('rateLimitExceeded', {
          action: 'guildChat',
          resetTime: limitResult.resetTime
        })
        return
      }
      
      this.handleGuildChat(client.sessionId, message.text)
    })

    this.onMessage('whisper', (client, message: { targetId: string; text: string }) => {
      // Rate limit whispers
      const limitResult = rateLimiter.checkLimit(client.sessionId, 'whisper', RATE_LIMITS.WHISPER)
      if (!limitResult.allowed) {
        client.send('rateLimitExceeded', {
          action: 'whisper',
          resetTime: limitResult.resetTime
        })
        return
      }
      
      this.handleWhisper(client.sessionId, message.targetId, message.text)
    })

    this.onMessage('emote', (client, message: { emote: string }) => {
      this.handleEmote(client.sessionId, message.emote)
    })

    this.onMessage('acceptQuest', (client, message: { questId: string }) => {
      // Rate limit quest acceptance
      const limitResult = rateLimiter.checkLimit(client.sessionId, 'questAccept', RATE_LIMITS.QUEST_ACCEPT)
      if (!limitResult.allowed) {
        client.send('rateLimitExceeded', {
          action: 'acceptQuest',
          resetTime: limitResult.resetTime
        })
        return
      }
      
      this.handleAcceptQuest(client.sessionId, message.questId)
    })

    this.onMessage('completeQuest', (client, message: { questId: string }) => {
      this.handleCompleteQuest(client.sessionId, message.questId)
    })

    this.onMessage('claimBattlePassReward', (client, message: { tier: number; track: 'free' | 'premium' }) => {
      this.handleClaimBattlePassReward(client.sessionId, message.tier, message.track)
    })

    this.onMessage('unlockBattlePassPremium', (client) => {
      this.handleUnlockBattlePassPremium(client.sessionId)
    })

    this.onMessage('requestBattlePassProgress', (client) => {
      this.handleRequestBattlePassProgress(client.sessionId)
    })

    this.onMessage('createDungeon', (client, message: { difficulty: number; level: number }) => {
      this.handleCreateDungeon(client.sessionId, message.difficulty, message.level)
    })

    this.onMessage('enterDungeon', (client, message: { dungeonId: string }) => {
      this.handleEnterDungeon(client.sessionId, message.dungeonId)
    })

    this.onMessage('exitDungeon', (client, message: { dungeonId: string }) => {
      this.handleExitDungeon(client.sessionId, message.dungeonId)
    })

    this.onMessage('requestDungeonProgress', (client, message: { dungeonId: string }) => {
      this.handleRequestDungeonProgress(client.sessionId, message.dungeonId)
    })

    this.onMessage('initiateTrade', (client, message: { targetPlayerId: string }) => {
      // Rate limit trade initiation
      const limitResult = rateLimiter.checkLimit(client.sessionId, 'trade', RATE_LIMITS.TRADE)
      if (!limitResult.allowed) {
        client.send('rateLimitExceeded', {
          action: 'initiateTrade',
          resetTime: limitResult.resetTime
        })
        return
      }
      
      this.handleInitiateTrade(client.sessionId, message.targetPlayerId)
    })

    this.onMessage('addTradeItem', (client, message: { sessionId: string; itemId: string; quantity: number }) => {
      this.handleAddTradeItem(client.sessionId, message.sessionId, message.itemId, message.quantity)
    })

    this.onMessage('removeTradeItem', (client, message: { sessionId: string; itemId: string }) => {
      this.handleRemoveTradeItem(client.sessionId, message.sessionId, message.itemId)
    })

    this.onMessage('setTradeCredits', (client, message: { sessionId: string; credits: number }) => {
      this.handleSetTradeCredits(client.sessionId, message.sessionId, message.credits)
    })

    this.onMessage('confirmTrade', (client, message: { sessionId: string }) => {
      this.handleConfirmTrade(client.sessionId, message.sessionId)
    })

    this.onMessage('cancelTrade', (client, message: { sessionId: string }) => {
      this.handleCancelTrade(client.sessionId, message.sessionId)
    })

    this.onMessage('requestAchievementProgress', (client) => {
      this.handleRequestAchievementProgress(client.sessionId)
    })

    // Log room creation
    this.monitoringService.logEvent('info', 'NexusRoom created', {
      maxClients: this.maxClients
    })
    
    console.log('NexusRoom created')
  }

  async onJoin(client: Client, options: any) {
    // Verify Firebase token if provided
    let firebaseUid: string | null = null
    if (options.firebaseToken) {
      const { verifyIdToken } = await import('../services/FirebaseAdmin')
      const verified = await verifyIdToken(options.firebaseToken)
      if (verified) {
        firebaseUid = verified.uid
        console.log(`Firebase-authenticated user joined: ${verified.uid}`)
      } else {
        // Token verification failed - reject connection
        client.leave(4001, 'Invalid authentication token')
        return
      }
    } else {
      // No token provided - only allow if Firebase is not configured
      const { isFirebaseAdminInitialized } = await import('../services/FirebaseAdmin')
      if (isFirebaseAdminInitialized()) {
        client.leave(4002, 'Authentication required')
        return
      }
      // Fallback: use sessionId if Firebase is not configured
      firebaseUid = client.sessionId
      console.warn(`Firebase not configured - using sessionId as player ID: ${client.sessionId}`)
    }

    // Use Firebase UID as player ID for persistence
    const playerId = firebaseUid!
    
    // Check if this player already has an active session
    const existingSessionId = this.playerIdToSessionId.get(playerId)
    if (existingSessionId && existingSessionId !== client.sessionId) {
      // Find and disconnect the old session
      const oldClient = this.clients.find(c => c.sessionId === existingSessionId)
      if (oldClient) {
        console.log(`Disconnecting old session ${existingSessionId} for player ${playerId} (new session: ${client.sessionId})`)
        oldClient.leave(1000, 'New connection from same player')
        // Remove old session mapping
        this.playerIdToSessionId.delete(playerId)
        // Remove old player from state
        this.state.players.delete(existingSessionId)
      }
    }
    
    // Map playerId to sessionId
    this.playerIdToSessionId.set(playerId, client.sessionId)
    
    // Only log if there are few clients to avoid spam
    if (this.clients.length <= 10) {
      console.log(`Client ${client.sessionId} joined as player ${playerId} (${this.clients.length} total)`)
    }
    
    // Log player join
    this.monitoringService.logEvent('info', 'Player joined', {
      playerId,
      sessionId: client.sessionId,
      totalPlayers: this.clients.length
    })

    // Try to load player data from database using Firebase UID
    let playerData = null
    if (this.playerDataRepository) {
      try {
        playerData = await this.playerDataRepository.loadPlayerData(playerId)
      } catch (error) {
        console.error(`Failed to load player data for ${playerId}:`, error)
        this.monitoringService.logEvent('error', 'Failed to load player data', {
          playerId,
          sessionId: client.sessionId,
          error: error instanceof Error ? error.message : String(error)
        })
        this.monitoringService.recordMetric('server.database_errors', 1, {
          operation: 'loadPlayerData',
          room: 'nexus'
        })
      }
    }

    // Create player from database or client data
    const player = new PlayerSchema()
    player.id = playerId // Use Firebase UID instead of sessionId
    
    if (playerData) {
      // Load from database
      player.name = playerData.name
      player.race = playerData.race as any
      player.x = playerData.position.x
      player.y = playerData.position.y
      player.z = playerData.position.z
      player.rotation = playerData.rotation
      player.health = playerData.health
      player.maxHealth = playerData.maxHealth
      player.mana = playerData.mana
      player.maxMana = playerData.maxMana
      player.level = playerData.level
      player.guildId = playerData.guildId || ''
      player.guildTag = playerData.guildTag || ''
    } else {
      // Create new player - check if name is already taken
      const requestedName = options.name || `Player_${playerId.substring(0, 6)}`
      
      // Validate name uniqueness
      if (this.playerDataRepository) {
        const nameExists = await this.playerDataRepository.playerNameExists(requestedName)
        if (nameExists) {
          // Name is taken, reject the connection
          client.leave(4003, `Character name "${requestedName}" is already taken`)
          return
        }
      }

      player.name = requestedName
      player.race = options.race || 'human'
      player.x = (Math.random() - 0.5) * 10
      player.y = 1 // Y=1 to stand on ground (ground is at Y=0)
      player.z = (Math.random() - 0.5) * 10
      player.rotation = 0
      player.health = 100
      player.maxHealth = 100
      player.mana = 100
      player.maxMana = 100
      player.level = 1

      // Save new player to database using Firebase UID
      if (this.playerDataRepository) {
        try {
          await this.playerDataRepository.createPlayerData(
            playerId,
            player.name,
            player.race
          )
          console.log(`Created new player: ${player.name} (${playerId})`)
        } catch (error: unknown) {
          console.error(`Failed to create player data for ${playerId}:`, error)
          // If it's a duplicate name error, disconnect the client
          if (error instanceof Error && (error.message.includes('unique') || error.message.includes('duplicate'))) {
            client.leave(4003, `Character name "${player.name}" is already taken`)
            return
          }
          
          this.monitoringService.logEvent('error', 'Failed to create player data', {
            playerId,
            sessionId: client.sessionId,
            error: error instanceof Error ? error.message : String(error)
          })
          this.monitoringService.recordMetric('server.database_errors', 1, {
            operation: 'createPlayerData',
            room: 'nexus'
          })
        }
      }
    }

    // Store mapping between sessionId and playerId for later lookups
    // Use sessionId as the key in the state (Colyseus requirement) but store playerId in the player object
    this.state.players.set(client.sessionId, player)
  }

  async onLeave(client: Client, consented: boolean) {
    // Only log if there are few clients to avoid spam
    if (this.clients.length <= 10) {
      console.log(`Client ${client.sessionId} left (${this.clients.length - 1} remaining)`)
    }
    
    // Get player to find their playerId (Firebase UID)
    const player = this.state.players.get(client.sessionId)
    const playerId = player?.id || client.sessionId
    
    // Remove mapping if it exists
    const mappedSessionId = this.playerIdToSessionId.get(playerId)
    if (mappedSessionId === client.sessionId) {
      this.playerIdToSessionId.delete(playerId)
    }
    
    // Log player leave
    this.monitoringService.logEvent('info', 'Player left', {
      playerId,
      sessionId: client.sessionId,
      consented,
      remainingPlayers: this.clients.length - 1
    })
    
    // Save player data before leaving
    if (player && this.playerDataRepository) {
      try {
        await this.playerDataRepository.savePlayerData(playerId, {
          name: player.name,
          race: player.race,
          level: player.level,
          xp: 0, // TODO: Get from player state
          xpToNext: 100,
          credits: 0, // TODO: Get from player state
          position: { x: player.x, y: player.y, z: player.z },
          rotation: player.rotation,
          health: player.health,
          maxHealth: player.maxHealth,
          mana: player.mana,
          maxMana: player.maxMana,
          inventory: [], // TODO: Get from player state
          equippedSpells: [],
          guildId: player.guildId,
          guildTag: player.guildTag,
          achievements: [],
          quests: [],
          battlePass: {
            season: 1,
            currentTier: 0,
            currentXP: 0,
            premiumUnlocked: false,
            claimedTiers: []
          }
        })
        console.log(`Saved player data for ${playerId}`)
      } catch (error) {
        console.error(`Failed to save player data for ${playerId}:`, error)
        this.monitoringService.logEvent('error', 'Failed to save player data', {
          playerId,
          sessionId: client.sessionId,
          error: error instanceof Error ? error.message : String(error)
        })
        this.monitoringService.recordMetric('server.database_errors', 1, {
          operation: 'savePlayerData',
          room: 'nexus'
        })
      }
    }
    
    this.state.players.delete(client.sessionId)
    
    // Clean up security service data
    if (this.securityService instanceof SecurityServiceImpl) {
      (this.securityService as SecurityServiceImpl).resetPlayer(client.sessionId)
    }
  }

  handleSpellCast(playerId: string, spellId: string, position: { x: number; y: number; z: number }, rotation: number) {
    const player = this.state.players.get(playerId)
    if (!player) return

    // Validate mana cost (simplified - should check actual spell data)
    const manaCost = 20 // TODO: Get from spell data
    const cooldownTime = 1000 // TODO: Get from spell data
    
    // Validate spell cast with security service
    if (!this.securityService.validateSpellCast(playerId, spellId, manaCost, cooldownTime)) {
      // Spell cast rejected
      const client = this.getClientBySessionId(playerId)
      if (client) {
        client.send('spellCastRejected', { spellId, reason: 'Cooldown or validation failed' })
      }
      return
    }
    
    if (player.mana < manaCost) {
      const client = this.getClientBySessionId(playerId)
      if (client) {
        client.send('spellCastRejected', { spellId, reason: 'Insufficient mana' })
      }
      return
    }

    // Consume mana
    player.mana -= manaCost
    
    // Check for cheating patterns
    const suspicionLevel = this.securityService.detectCheating(playerId, {
      type: 'spellCast',
      playerId,
      timestamp: Date.now(),
      data: { spellId, position, rotation }
    })
    
    if (suspicionLevel === 'critical') {
      const client = this.getClientBySessionId(playerId)
      if (client) {
        client.leave(1000, 'Suspicious activity detected')
      }
      return
    }

    // Create projectile
    const projectile = new SpellProjectileSchema()
    projectile.id = `proj_${Date.now()}_${Math.random()}`
    projectile.spellId = spellId
    projectile.casterId = playerId
    projectile.x = position.x
    projectile.y = position.y
    projectile.z = position.z
    projectile.directionX = Math.sin(rotation)
    projectile.directionY = 0
    projectile.directionZ = Math.cos(rotation)
    projectile.speed = 10
    projectile.lifetime = 2000

    this.state.spellProjectiles.set(projectile.id, projectile)

    // Broadcast spell cast
    this.broadcast('spellCast', {
      projectileId: projectile.id,
      spellId,
      casterId: playerId,
      position,
      rotation
    })
  }

  async handleLootPickup(playerId: string, lootId: string) {
    const loot = this.state.lootDrops.get(lootId)
    if (!loot) return

    // Check if player is close enough
    const player = this.state.players.get(playerId)
    if (!player) return

    const distance = Math.sqrt(
      Math.pow(player.x - loot.x, 2) +
      Math.pow(player.y - loot.y, 2) +
      Math.pow(player.z - loot.z, 2)
    )

    if (distance > 2) return // Too far

    // Check ownership (first come, first served)
    if (loot.ownerId && loot.ownerId !== playerId) return

    // Set ownership immediately to prevent double pickup
    loot.ownerId = playerId

    // Handle quest progress (item collected)
    if (this.questSystem) {
      this.questSystem.handleGameEvent(playerId, 'collect', loot.itemId, 1)
    }
    
    // Handle battle pass XP (item collected)
    if (this.battlePassSystem) {
      this.battlePassSystem.addExperience(playerId, 5)
    }
    
    // Handle achievement progress (item collected)
    if (this.achievementSystem) {
      const result = await (this.achievementSystem as any).handleGameEvent(playerId, {
        type: 'collect',
        playerId,
        targetId: loot.itemId,
        quantity: 1
      })
      if (result?.unlocked) {
        const client = this.getClientBySessionId(playerId)
        if (client && result.achievement) {
          client.send('achievementUnlocked', { achievement: result.achievement })
        }
      }
    }

    // Remove loot immediately
    this.state.lootDrops.delete(lootId)

    // Broadcast pickup
    this.broadcast('lootPickedUp', {
      lootId,
      playerId,
      itemId: loot.itemId
    })

    // Send confirmation to player
    const client = this.getClientBySessionId(playerId)
    if (client) {
      client.send('lootPickupConfirmed', {
        lootId,
        itemId: loot.itemId
      })
    }
  }

  spawnInitialEnemies() {
    // Spawn fewer initial enemies to prevent performance issues
    // More enemies will spawn as players join
    const initialCount = Math.min(5, Math.max(1, Math.floor(this.clients.length / 2)))
    for (let i = 0; i < initialCount; i++) {
      this.spawnEnemy()
    }
  }

  spawnEnemy() {
    if (this.state.enemies.size >= 50) return // Max enemies

    const angle = Math.random() * Math.PI * 2
    const distance = 15 + Math.random() * 15

    const enemy = new EnemySchema()
    enemy.id = `enemy_${Date.now()}_${Math.random()}`
    enemy.type = 'cyber_drone'
    enemy.x = Math.cos(angle) * distance
    enemy.y = 0
    enemy.z = Math.sin(angle) * distance
    enemy.rotation = 0
    enemy.health = 100
    enemy.maxHealth = 100
    enemy.level = 1
    enemy.ownerId = ''

    // Store spawn position for leash
    this.enemySpawnPositions.set(enemy.id, {
      x: enemy.x,
      y: enemy.y,
      z: enemy.z
    })

    this.state.enemies.set(enemy.id, enemy)
    
    // Add to spatial grid
    this.enemySpatialGrid.insert(
      { id: enemy.id, position: { x: enemy.x, y: enemy.y, z: enemy.z } },
      { x: enemy.x, y: enemy.y, z: enemy.z }
    )
  }

  spawnInitialResources() {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      const distance = 20 + Math.random() * 10

      const node = new ResourceNodeSchema()
      node.id = `resource_${Date.now()}_${i}`
      node.type = 'quantum_crystal'
      node.x = Math.cos(angle) * distance
      node.y = 0
      node.z = Math.sin(angle) * distance
      node.lastHarvested = 0
      node.respawnTime = GAME_CONFIG.resourceRespawnTime

      this.state.resourceNodes.set(node.id, node)
    }
  }

  async gameLoop() {
    const loopStartTime = Date.now()
    const deltaTime = 16 // ~16ms for 60 FPS
    
    // Track server tick time
    const tickTime = loopStartTime - this.lastTickTime
    this.lastTickTime = loopStartTime
    this.tickTimeHistory.push(tickTime)
    if (this.tickTimeHistory.length > 100) {
      this.tickTimeHistory.shift()
    }
    
    // Record performance metrics
    this.monitoringService.recordMetric('server.tick_time', tickTime, {
      room: 'nexus'
    })
    this.monitoringService.recordMetric('server.player_count', this.clients.length, {
      room: 'nexus'
    })
    this.monitoringService.recordMetric('server.enemy_count', this.state.enemies.size, {
      room: 'nexus'
    })
    this.monitoringService.recordMetric('server.projectile_count', this.state.spellProjectiles.size, {
      room: 'nexus'
    })

    // Update spatial grids
    this.state.enemies.forEach((enemy, enemyId) => {
      this.enemySpatialGrid.insert(
        { id: enemyId, position: { x: enemy.x, y: enemy.y, z: enemy.z } },
        { x: enemy.x, y: enemy.y, z: enemy.z }
      )
    })

    // Update spell projectiles
    for (const [id, projectile] of this.state.spellProjectiles) {
      const moveDistance = projectile.speed * (deltaTime / 1000)
      projectile.x += projectile.directionX * moveDistance
      projectile.y += projectile.directionY * moveDistance
      projectile.z += projectile.directionZ * moveDistance
      projectile.lifetime -= deltaTime

      if (projectile.lifetime <= 0) {
        this.projectileSpatialGrid.remove({ id, position: { x: projectile.x, y: projectile.y, z: projectile.z } })
        this.state.spellProjectiles.delete(id)
        return
      }

      // Update projectile in spatial grid
      this.projectileSpatialGrid.insert(
        { id, position: { x: projectile.x, y: projectile.y, z: projectile.z } },
        { x: projectile.x, y: projectile.y, z: projectile.z }
      )

      // Use spatial grid for optimized collision detection
      const nearbyEnemies = this.enemySpatialGrid.query(
        { x: projectile.x, y: projectile.y, z: projectile.z },
        2 // Check radius of 2 units
      )

      for (const enemyEntity of nearbyEnemies) {
        const enemy = this.state.enemies.get(enemyEntity.id)
        if (!enemy) continue

        const enemyId = enemyEntity.id
        const dx = projectile.x - enemy.x
        const dy = projectile.y - enemy.y
        const dz = projectile.z - enemy.z
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (distance < 1) {
          // Hit! Server-authoritative damage calculation
          const baseDamage = 50 // TODO: Get from spell data
          
          // Check for combo multiplier
          const combo = this.playerCombos.get(projectile.casterId)
          const comboMultiplier = combo && combo.kills >= 3 ? combo.multiplier : 1
          
          // Critical hit chance (10%)
          const isCrit = Math.random() < 0.1
          let finalDamage = baseDamage * comboMultiplier
          if (isCrit) finalDamage *= 2
          
          const damageAmount = Math.floor(finalDamage)
          
          // Validate damage with security service
          if (!this.securityService.validateDamage(projectile.casterId, damageAmount, enemyId, projectile.spellId)) {
            // Damage rejected - log and skip
            console.warn(`[SECURITY] Invalid damage rejected: ${damageAmount} from ${projectile.casterId} to ${enemyId}`)
            return
          }
          
          enemy.health -= damageAmount
          
          // Queue update for batching instead of immediate broadcast
          this.queueEntityUpdate(enemyId, 'enemy', {
            health: enemy.health,
            x: enemy.x,
            y: enemy.y,
            z: enemy.z
          })
          
          // Broadcast damage number (high priority, send immediately)
          this.broadcast('damageNumber', {
            enemyId,
            damage: Math.floor(finalDamage),
            isCrit,
            position: { x: enemy.x, y: enemy.y + 1, z: enemy.z }
          })
          
          if (enemy.health <= 0) {
            // Enemy killed - update combo
            this.updatePlayerCombo(projectile.casterId)
            
            // Handle quest progress (enemy killed)
            if (this.questSystem) {
              this.questSystem.handleGameEvent(projectile.casterId, 'kill', enemy.type, 1)
            }
            
            // Handle battle pass XP (enemy killed)
            if (this.battlePassSystem) {
              // Award battle pass XP for kills
              this.battlePassSystem.addExperience(projectile.casterId, 10)
            }
            
            // Handle achievement progress (enemy killed)
            if (this.achievementSystem) {
              const result = await (this.achievementSystem as any).handleGameEvent(projectile.casterId, {
                type: 'kill',
                playerId: projectile.casterId,
                targetId: enemy.type,
                quantity: 1
              })
              if (result?.unlocked) {
                const client = this.getClientBySessionId(projectile.casterId)
                if (client && result.achievement) {
                  client.send('achievementUnlocked', { achievement: result.achievement })
                }
              }
            }
            
            // Drop loot
            this.dropLoot(enemy.x, enemy.y, enemy.z, 'cyber_scrap')
            
            // Remove spawn position
            this.enemySpawnPositions.delete(enemyId)
            this.enemySpatialGrid.remove({ id: enemyId, position: { x: enemy.x, y: enemy.y, z: enemy.z } })
            this.state.enemies.delete(enemyId)
            
            // Broadcast kill (high priority, send immediately)
            const caster = this.state.players.get(projectile.casterId)
            if (caster) {
              this.broadcast('kill', {
                killerId: projectile.casterId,
                killerName: caster.name,
                enemyType: enemy.type
              })
            }
          }
          this.projectileSpatialGrid.remove({ id, position: { x: projectile.x, y: projectile.y, z: projectile.z } })
          this.state.spellProjectiles.delete(id)
        }
      }
    }

    // Clean up expired loot (also handled by cleanupExpiredEntities, but keep for immediate cleanup)
    this.state.lootDrops.forEach((loot, id) => {
      if (Date.now() > loot.expiresAt) {
        this.state.lootDrops.delete(id)
      }
    })
    
    // Broadcast state delta periodically (every 5 game loops = ~300ms)
    if (Date.now() - this.lastBatchTime > 300) {
      this.broadcastStateDelta()
    }
  }

  dropLoot(x: number, y: number, z: number, itemId: string) {
    const loot = new LootDropSchema()
    loot.id = `loot_${Date.now()}_${Math.random()}`
    loot.itemId = itemId
    loot.x = x
    loot.y = y
    loot.z = z
    loot.ownerId = ''
    loot.expiresAt = Date.now() + GAME_CONFIG.lootExpireTime

    this.state.lootDrops.set(loot.id, loot)
  }

  scheduleWorldBoss() {
    // Schedule world boss to spawn in 4 hours
    this.state.worldBossSpawnTime = Date.now() + GAME_CONFIG.worldBossSpawnInterval

    this.worldBossTimer = setTimeout(() => {
      this.spawnWorldBoss()
    }, GAME_CONFIG.worldBossSpawnInterval)
  }

  updatePlayerCombo(playerId: string) {
    const now = Date.now()
    const combo = this.playerCombos.get(playerId)
    
    if (!combo) {
      this.playerCombos.set(playerId, {
        kills: 1,
        startTime: now,
        multiplier: 1
      })
      return
    }

    const timeSinceStart = now - combo.startTime
    const COMBO_WINDOW = 8000 // 8 seconds

    if (timeSinceStart > COMBO_WINDOW) {
      // Combo expired, start new one
      this.playerCombos.set(playerId, {
        kills: 1,
        startTime: now,
        multiplier: 1
      })
      return
    }

    const newKills = combo.kills + 1
    const multiplier = newKills >= 3 ? 1 + (newKills - 2) * 0.1 : 1

    this.playerCombos.set(playerId, {
      kills: newKills,
      startTime: combo.startTime,
      multiplier: Math.min(multiplier, 3) // Cap at 3x
    })

    // Broadcast combo update
    if (newKills >= 3) {
      this.broadcast('combo', {
        playerId,
        kills: newKills,
        multiplier
      })
    }
  }

  spawnWorldBoss() {
    this.state.worldBossActive = true
    
    // Create world boss enemy
    const boss = new EnemySchema()
    boss.id = 'world_boss_quantum_titan'
    boss.type = 'quantum_titan'
    boss.x = 0
    boss.y = 0
    boss.z = 0
    boss.rotation = 0
    boss.health = 10000
    boss.maxHealth = 10000
    boss.level = 50
    boss.ownerId = ''

    this.state.enemies.set(boss.id, boss)

    this.broadcast('worldBossSpawned', {
      message: '⚡ Quantum Titan has appeared in the center! ⚡',
      position: { x: 0, y: 0, z: 0 },
      bossId: boss.id
    })
  }

  updateEnemyAI() {
    // Simple AI: enemies move towards nearest player
    // Use spatial grid for optimized player queries
    this.state.enemies.forEach((enemy, enemyId) => {
      const spawnPos = this.enemySpawnPositions.get(enemyId)
      if (!spawnPos) return

      // Find nearest player using spatial grid
      let nearestPlayer: PlayerSchema | undefined = undefined
      let nearestDistance = Infinity

      // Query nearby players using spatial grid (if we had player grid)
      // For now, use optimized distance check
      this.state.players.forEach((player) => {
        const dx = player.x - enemy.x
        const dz = player.z - enemy.z
        const distanceSq = dx * dx + dz * dz
        const distance = Math.sqrt(distanceSq)

        if (distance < nearestDistance && distance < 10) { // Aggro range
          nearestDistance = distance
          nearestPlayer = player
        }
      })

      if (nearestPlayer) {
        // Move towards player
        const dx = (nearestPlayer as PlayerSchema).x - enemy.x
        const dz = (nearestPlayer as PlayerSchema).z - enemy.z
        const distance = Math.sqrt(dx * dx + dz * dz)

        if (distance > 1) {
          const speed = 0.05
          enemy.x += (dx / distance) * speed
          enemy.z += (dz / distance) * speed
          enemy.rotation = Math.atan2(dx, dz)
        }

        // Check leash - return to spawn if too far
        const leashDx = enemy.x - spawnPos.x
        const leashDz = enemy.z - spawnPos.z
        const leashDistance = Math.sqrt(leashDx * leashDx + leashDz * leashDz)

        if (leashDistance > 20) {
          // Return to spawn
          const returnSpeed = 0.03
          enemy.x += (spawnPos.x - enemy.x) * returnSpeed
          enemy.z += (spawnPos.z - enemy.z) * returnSpeed
        }
      } else {
        // No player in range, return to spawn
        const returnSpeed = 0.02
        enemy.x += (spawnPos.x - enemy.x) * returnSpeed
        enemy.z += (spawnPos.z - enemy.z) * returnSpeed
      }
    })
  }

  handleCreateGuild(playerId: string, name: string, tag: string) {
    const player = this.state.players.get(playerId)
    if (!player) return

    // Validate guild name and tag
    if (!name || name.length < 3 || name.length > 20) return
    if (!tag || tag.length < 2 || tag.length > 4) return

    // Check if player is already in a guild
    if (player.guildId) return

    // Check if tag is already taken
    let tagTaken = false
    this.state.guilds.forEach((guild) => {
      if (guild.tag.toLowerCase() === tag.toLowerCase()) {
        tagTaken = true
      }
    })
    if (tagTaken) {
      const client = this.getClientBySessionId(playerId)
      if (client) {
        client.send('guildError', { message: 'Guild tag already taken' })
      }
      return
    }

    // Create guild
    const guild = new GuildSchema()
    guild.id = `guild_${Date.now()}_${Math.random()}`
    guild.name = name
    guild.tag = tag.toUpperCase()
    guild.leaderId = playerId
    guild.memberIds.push(playerId)
    guild.createdAt = Date.now()

    this.state.guilds.set(guild.id, guild)

    // Add player to guild
    player.guildId = guild.id
    player.guildTag = guild.tag
    player.guildName = guild.name

    // Broadcast guild creation
    this.broadcast('guildCreated', {
      guildId: guild.id,
      guildName: guild.name,
      guildTag: guild.tag,
      leaderName: player.name
    })

    const client = this.getClientBySessionId(playerId)
    if (client) {
      client.send('guildCreated', { guildId: guild.id, guildName: guild.name, guildTag: guild.tag })
    }
  }

  async handleJoinGuild(playerId: string, guildId: string) {
    const player = this.state.players.get(playerId)
    const guild = this.state.guilds.get(guildId)
    if (!player || !guild) return

    // Check if player is already in a guild
    if (player.guildId) return

    // Add player to guild
    guild.memberIds.push(playerId)
    player.guildId = guild.id
    
      // Handle achievement progress (guild joined)
      if (this.achievementSystem) {
        const result = await (this.achievementSystem as any).handleGameEvent(playerId, {
          type: 'join_guild',
          playerId,
          quantity: 1
        })
        if (result?.unlocked) {
          const client = this.getClientBySessionId(playerId)
          if (client && result.achievement) {
            client.send('achievementUnlocked', { achievement: result.achievement })
          }
        }
      }
    player.guildTag = guild.tag
    player.guildName = guild.name

    // Notify guild members
    guild.memberIds.forEach((memberId) => {
      if (memberId !== playerId) {
        const memberClient = this.getClientBySessionId(memberId)
        if (memberClient) {
          memberClient.send('guildMemberJoined', {
            playerId,
            playerName: player.name
          })
        }
      }
    })

    const client = this.getClientBySessionId(playerId)
    if (client) {
      client.send('guildJoined', { guildId: guild.id, guildName: guild.name, guildTag: guild.tag })
    }
  }

  handleLeaveGuild(playerId: string) {
    const player = this.state.players.get(playerId)
    if (!player || !player.guildId) return

    const guild = this.state.guilds.get(player.guildId)
    if (!guild) return

    // Remove player from guild
    const index = guild.memberIds.indexOf(playerId)
    if (index > -1) {
      guild.memberIds.splice(index, 1)
    }

    // If player was leader, transfer leadership or disband
    if (guild.leaderId === playerId) {
      if (guild.memberIds.length > 0) {
        // Transfer to first member
        const newLeaderId = guild.memberIds[0]
        if (newLeaderId) {
          guild.leaderId = newLeaderId
        }
      } else {
        // Disband guild
        this.state.guilds.delete(guild.id)
      }
    }

    // Remove player from guild
    player.guildId = ''
    player.guildTag = ''
    player.guildName = ''

    // Notify guild members
    guild.memberIds.forEach((memberId) => {
      const memberClient = this.getClientBySessionId(memberId)
      if (memberClient) {
        memberClient.send('guildMemberLeft', {
          playerId,
          playerName: player.name
        })
      }
    })
  }

  handleGuildChat(playerId: string, text: string) {
    const player = this.state.players.get(playerId)
    if (!player || !player.guildId) return

    const guild = this.state.guilds.get(player.guildId)
    if (!guild) return

    // Send to all guild members
    guild.memberIds.forEach((memberId) => {
      const memberClient = this.getClientBySessionId(memberId)
      if (memberClient) {
        memberClient.send('guildChat', {
          playerId,
          playerName: player.name,
          message: text,
          timestamp: Date.now()
        })
      }
    })
  }

  handleWhisper(fromId: string, toId: string, text: string) {
    const fromPlayer = this.state.players.get(fromId)
    const toPlayer = this.state.players.get(toId)
    if (!fromPlayer || !toPlayer) return

    // Send whisper to target
    const toClient = this.getClientBySessionId(toId)
    if (toClient) {
      toClient.send('whisper', {
        fromId,
        fromName: fromPlayer.name,
        message: text,
        timestamp: Date.now()
      })
    }

    // Confirm to sender
    const fromClient = this.getClientBySessionId(fromId)
    if (fromClient) {
      fromClient.send('whisperSent', {
        toId,
        toName: toPlayer.name
      })
    }
  }

  handleEmote(playerId: string, emote: string) {
    const player = this.state.players.get(playerId)
    if (!player) return

    const validEmotes = ['wave', 'dance', 'flex', 'bow', 'laugh']
    if (!validEmotes.includes(emote)) return

    // Broadcast emote to nearby players (within 20 units)
    this.state.players.forEach((otherPlayer, otherId) => {
      if (otherId === playerId) return

      const distance = Math.sqrt(
        Math.pow(player.x - otherPlayer.x, 2) +
        Math.pow(player.z - otherPlayer.z, 2)
      )

      if (distance <= 20) {
        const otherClient = this.getClientBySessionId(otherId)
        if (otherClient) {
          otherClient.send('emote', {
            playerId,
            playerName: player.name,
            emote,
            timestamp: Date.now()
          })
        }
      }
    })
  }

  private getClientBySessionId(sessionId: string): Client | null {
    return this.clients.find(c => c.sessionId === sessionId) || null
  }

  async handleAcceptQuest(playerId: string, questId: string) {
    // Track quest acceptance
    this.monitoringService.recordMetric('game.quest_accepted', 1, {
      questId,
      playerId
    })
    if (!this.questSystem) {
      const client = this.getClientBySessionId(playerId)
      if (client) {
        client.send('questError', { message: 'Quest system not available' })
      }
      return
    }

    const player = this.state.players.get(playerId)
    if (!player) return

    const success = await this.questSystem.acceptQuest(playerId, questId)
    
    const client = this.getClientBySessionId(playerId)
    if (!client) return
    
    if (success) {
      // Send quest accepted confirmation
      client.send('questAccepted', { questId })
      
      // Send updated quest list
      const activeQuests = await this.questSystem.getActiveQuests(playerId)
      client.send('questUpdate', { activeQuests })
    } else {
      client.send('questError', { message: 'Failed to accept quest' })
    }
  }

  async handleCompleteQuest(playerId: string, questId: string) {
    if (!this.questSystem) return

    const isComplete = await this.questSystem.checkQuestCompletion(playerId, questId)
    if (isComplete) {
      await this.questSystem.completeQuest(playerId, questId)
      
      // Track quest completion
      this.monitoringService.recordMetric('game.quest_completed', 1, {
        questId,
        playerId
      })
      
      const client = this.getClientBySessionId(playerId)
      if (!client) return
      
      // Send completion notification
      client.send('questCompleted', { questId })
      
      // Send updated quest list
      const activeQuests = await this.questSystem.getActiveQuests(playerId)
      client.send('questUpdate', { activeQuests })
      
      // Handle achievement progress (quest completed)
      if (this.achievementSystem) {
        const result = await (this.achievementSystem as any).handleGameEvent(playerId, {
          type: 'complete_quest',
          playerId,
          targetId: questId,
          quantity: 1
        })
        if (result?.unlocked) {
          const client = this.getClientBySessionId(playerId)
          if (client && result.achievement) {
            client.send('achievementUnlocked', { achievement: result.achievement })
          }
        }
      }
    }
  }

  async handleRequestAvailableQuests(playerId: string, level: number) {
    if (!this.questSystem) return

    const availableQuests = await this.questSystem.getAvailableQuests(playerId, level)
    const client = this.getClientBySessionId(playerId)
    if (client) {
      client.send('availableQuests', { quests: availableQuests })
    }
  }

  async handleClaimBattlePassReward(playerId: string, tier: number, track: 'free' | 'premium') {
    if (!this.battlePassSystem) {
      const client = this.getClientBySessionId(playerId)
      if (client) {
        client.send('battlePassError', { message: 'Battle pass system not available' })
      }
      return
    }

    const success = await this.battlePassSystem.claimReward(playerId, tier, track)
    
    const client = this.getClientBySessionId(playerId)
    if (!client) return

    if (success) {
      // Track battle pass reward claim
      this.monitoringService.recordMetric('game.battle_pass_reward_claimed', 1, {
        tier: tier.toString(),
        track,
        playerId
      })
      
      // Send updated progress
      const progress = await this.battlePassSystem.getProgress(playerId)
      const season = this.battlePassSystem.getCurrentSeason()
      
      client.send('battlePassRewardClaimed', { tier, track })
      client.send('battlePassUpdate', { progress, season })
    } else {
      client.send('battlePassError', { message: 'Failed to claim reward' })
    }
  }

  async handleUnlockBattlePassPremium(playerId: string) {
    if (!this.battlePassSystem) return

    await this.battlePassSystem.unlockPremium(playerId)
    
    const client = this.getClientBySessionId(playerId)
    if (!client) return

    const progress = await this.battlePassSystem.getProgress(playerId)
    const season = this.battlePassSystem.getCurrentSeason()
    
    client.send('battlePassPremiumUnlocked', {})
    client.send('battlePassUpdate', { progress, season })
  }

  async handleRequestBattlePassProgress(playerId: string) {
    if (!this.battlePassSystem) return

    const progress = await this.battlePassSystem.getProgress(playerId)
    const season = this.battlePassSystem.getCurrentSeason()
    
    const client = this.getClientBySessionId(playerId)
    if (client) {
      client.send('battlePassUpdate', { progress, season })
    }
  }

  /**
   * Schedule daily quest reset at midnight
   */
  scheduleDailyQuestReset(): void {
    const now = new Date()
    const midnight = new Date()
    midnight.setHours(24, 0, 0, 0) // Next midnight
    
    const msUntilMidnight = midnight.getTime() - now.getTime()
    
    this.dailyQuestResetTimer = setTimeout(() => {
      if (this.questSystem) {
        (this.questSystem as any).resetDailyQuests()
      }
      
      // Schedule next reset (24 hours later)
      this.dailyQuestResetTimer = setInterval(() => {
        if (this.questSystem) {
          (this.questSystem as any).resetDailyQuests()
        }
      }, 24 * 60 * 60 * 1000) // 24 hours
    }, msUntilMidnight)
  }

  /**
   * Schedule weekly quest reset on Monday at midnight
   */
  scheduleWeeklyQuestReset(): void {
    const now = new Date()
    const nextMonday = new Date()
    
    // Calculate days until next Monday
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7
    nextMonday.setDate(now.getDate() + daysUntilMonday)
    nextMonday.setHours(0, 0, 0, 0)
    
    const msUntilMonday = nextMonday.getTime() - now.getTime()
    
    this.weeklyQuestResetTimer = setTimeout(() => {
      if (this.questSystem) {
        (this.questSystem as any).resetWeeklyQuests()
      }
      
      // Schedule next reset (7 days later)
      this.weeklyQuestResetTimer = setInterval(() => {
        if (this.questSystem) {
          (this.questSystem as any).resetWeeklyQuests()
        }
      }, 7 * 24 * 60 * 60 * 1000) // 7 days
    }, msUntilMonday)
  }

  /**
   * Queue an entity update for batching
   */
  queueEntityUpdate(entityId: string, entityType: string, update: any): void {
    const key = `${entityType}_${entityId}`
    const existing = this.pendingEntityUpdates.get(key)
    if (existing) {
      // Merge updates
      this.pendingEntityUpdates.set(key, { ...existing, ...update })
    } else {
      this.pendingEntityUpdates.set(key, { entityId, entityType, ...update })
    }
  }

  /**
   * Batch and send entity updates
   */
  batchEntityUpdates(): void {
    if (this.pendingEntityUpdates.size === 0) return

    const updates: any[] = []
    this.pendingEntityUpdates.forEach((update) => {
      updates.push(update)
    })

    // Broadcast batched updates
    this.broadcast('entityUpdates', { updates })

    // Clear pending updates
    this.pendingEntityUpdates.clear()
    this.lastBatchTime = Date.now()
  }

  /**
   * Clean up expired entities
   */
  cleanupExpiredEntities(): void {
    const now = Date.now()

    // Clean up expired loot
    this.state.lootDrops.forEach((loot, id) => {
      if (now > loot.expiresAt) {
        this.state.lootDrops.delete(id)
      }
    })

    // Clean up expired projectiles (should be handled in gameLoop, but double-check)
    this.state.spellProjectiles.forEach((projectile, id) => {
      if (projectile.lifetime <= 0) {
        this.projectileSpatialGrid.remove({ id, position: { x: projectile.x, y: projectile.y, z: projectile.z } })
        this.state.spellProjectiles.delete(id)
      }
    })
  }

  /**
   * Set up Redis synchronization for cross-instance communication
   */
  private async setupRedisSync(): Promise<void> {
    try {
      const roomChannel = `room:${this.roomId}`
      
      // Subscribe to room events
      await redisService.subscribe(roomChannel, (message) => {
        try {
          const data = JSON.parse(message)
          this.handleRedisMessage(data)
        } catch (error) {
          console.error('Failed to parse Redis message:', error)
        }
      })
      
      // Publish room state updates periodically
      setInterval(() => {
        if (this.clients.length > 0) {
          redisService.publish(roomChannel, JSON.stringify({
            type: 'state_update',
            roomId: this.roomId,
            playerCount: this.clients.length,
            timestamp: Date.now()
          })).catch(() => {
            // Redis not available, ignore silently
          })
        }
      }, 5000) // Every 5 seconds
    } catch (error) {
      // Redis not available, continue without it
      console.warn('Redis sync not available:', error)
    }
  }
  
  /**
   * Handle messages from Redis
   */
  private handleRedisMessage(data: any): void {
    // Handle cross-instance messages
    // This can be extended for load balancing, state sync, etc.
    if (data.type === 'state_update') {
      // Could sync state between instances here
    }
  }

  /**
   * Check memory usage and perform cleanup if needed
   */
  checkMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      const heapUsedMB = usage.heapUsed / 1024 / 1024

      if (heapUsedMB > this.memoryThreshold / 1024 / 1024) {
        console.warn(`High memory usage detected: ${heapUsedMB.toFixed(2)}MB`)
        
        // Aggressive cleanup
        this.cleanupExpiredEntities()
        
        // Clear old combo data
        const now = Date.now()
        this.playerCombos.forEach((combo, playerId) => {
          if (now - combo.startTime > 30000) { // 30 seconds
            this.playerCombos.delete(playerId)
          }
        })
      }
    }
  }

  /**
   * Serialize current state for delta compression
   */
  serializeState(): any {
    return {
      players: Array.from(this.state.players.entries()).map(([id, player]) => ({
        id,
        x: player.x,
        y: player.y,
        z: player.z,
        rotation: player.rotation,
        health: player.health,
        maxHealth: player.maxHealth,
        mana: player.mana,
        maxMana: player.maxMana
      })),
      enemies: Array.from(this.state.enemies.entries()).map(([id, enemy]) => ({
        id,
        x: enemy.x,
        y: enemy.y,
        z: enemy.z,
        health: enemy.health,
        maxHealth: enemy.maxHealth
      })),
      lootDrops: Array.from(this.state.lootDrops.entries()).map(([id, loot]) => ({
        id,
        x: loot.x,
        y: loot.y,
        z: loot.z,
        itemId: loot.itemId
      }))
    }
  }

  /**
   * Broadcast state delta using delta compression
   */
  broadcastStateDelta(): void {
    const currentState = this.serializeState()
    const deltas = this.deltaCompressor.compress(currentState, this.previousStateSnapshot)
    
    if (deltas && deltas.length > 0) {
      this.broadcast('stateDelta', { deltas })
      this.previousStateSnapshot = currentState
    }
    
    this.lastBatchTime = Date.now()
  }

  /**
   * Auto-save all player data periodically
   */
  async autoSavePlayerData(): Promise<void> {
    if (!this.playerDataRepository) return

    const savePromises: Promise<void>[] = []
    
    this.state.players.forEach((player, playerId) => {
      const promise = this.playerDataRepository!.savePlayerData(playerId, {
        name: player.name,
        race: player.race,
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
        inventory: [],
        equippedSpells: [],
        guildId: player.guildId,
        guildTag: player.guildTag,
        achievements: [],
        quests: [],
        battlePass: {
          season: 1,
          currentTier: 0,
          currentXP: 0,
          premiumUnlocked: false,
          claimedTiers: []
        }
      }).catch(error => {
        console.error(`Failed to auto-save player data for ${playerId}:`, error)
      })
      
      savePromises.push(promise)
    })

    await Promise.all(savePromises)
    console.log(`Auto-saved data for ${savePromises.length} players`)
  }

  // Dungeon handlers
  async handleCreateDungeon(playerId: string, difficulty: number, level: number) {
    if (!this.dungeonSystem) {
      const client = this.getClientBySessionId(playerId)
      if (client) {
        client.send('dungeonError', { message: 'Dungeon system not available' })
      }
      return
    }

    const seed = Date.now() + Math.random() * 1000000
    const dungeon = this.dungeonSystem.createDungeon(seed, difficulty, level)
    const client = this.getClientBySessionId(playerId)
    if (client && dungeon) {
      client.send('dungeonCreated', { dungeon })
    }
  }

  async handleEnterDungeon(playerId: string, dungeonId: string) {
    if (!this.dungeonSystem) return

    const success = await this.dungeonSystem.enterDungeon(playerId, dungeonId)
    const client = this.getClientBySessionId(playerId)
    if (client) {
      if (success) {
        client.send('dungeonEntered', { dungeonId })
      } else {
        client.send('dungeonError', { message: 'Failed to enter dungeon' })
      }
    }
  }

  async handleExitDungeon(playerId: string, dungeonId: string) {
    if (!this.dungeonSystem) return

    await this.dungeonSystem.exitDungeon(playerId, dungeonId)
    const client = this.getClientBySessionId(playerId)
    if (client) {
      client.send('dungeonExited', { dungeonId })
    }
  }

  async handleRequestDungeonProgress(playerId: string, dungeonId: string) {
    if (!this.dungeonSystem) return

    const progress = await this.dungeonSystem.getDungeonProgress(playerId, dungeonId)
    const client = this.getClientBySessionId(playerId)
    if (client) {
      client.send('dungeonProgress', { dungeonId, progress })
    }
  }

  // Trading handlers
  async handleInitiateTrade(playerId: string, targetPlayerId: string) {
    if (!this.tradingSystem) {
      const client = this.getClientBySessionId(playerId)
      if (client) {
        client.send('tradeError', { message: 'Trading system not available' })
      }
      return
    }

    const session = await this.tradingSystem.initiateTrade(playerId, targetPlayerId)
    if (session) {
      const client1 = this.getClientBySessionId(playerId)
      const client2 = this.getClientBySessionId(targetPlayerId)
      if (client1) {
        client1.send('tradeInitiated', { session, isPlayer1: true })
      }
      if (client2) {
        client2.send('tradeInitiated', { session, isPlayer1: false })
      }
    } else {
      const client = this.getClientBySessionId(playerId)
      if (client) {
        client.send('tradeError', { message: 'Failed to initiate trade' })
      }
    }
  }

  async handleAddTradeItem(playerId: string, sessionId: string, itemId: string, quantity: number) {
    if (!this.tradingSystem) return

    const success = await this.tradingSystem.addItem(sessionId, playerId, itemId, quantity)
    if (success) {
      const session = this.tradingSystem.getTradeSession(sessionId)
      if (session) {
        const client1 = this.getClientBySessionId(session.player1Id)
        const client2 = this.getClientBySessionId(session.player2Id)
        if (client1) client1.send('tradeUpdated', { session })
        if (client2) client2.send('tradeUpdated', { session })
      }
    }
  }

  async handleRemoveTradeItem(playerId: string, sessionId: string, itemId: string) {
    if (!this.tradingSystem) return

    const success = await this.tradingSystem.removeItem(sessionId, playerId, itemId)
    if (success) {
      const session = this.tradingSystem.getTradeSession(sessionId)
      if (session) {
        const client1 = this.getClientBySessionId(session.player1Id)
        const client2 = this.getClientBySessionId(session.player2Id)
        if (client1) client1.send('tradeUpdated', { session })
        if (client2) client2.send('tradeUpdated', { session })
      }
    }
  }

  async handleSetTradeCredits(playerId: string, sessionId: string, credits: number) {
    if (!this.tradingSystem) return

    const success = await this.tradingSystem.setCredits(sessionId, playerId, credits)
    if (success) {
      const session = this.tradingSystem.getTradeSession(sessionId)
      if (session) {
        const client1 = this.getClientBySessionId(session.player1Id)
        const client2 = this.getClientBySessionId(session.player2Id)
        if (client1) client1.send('tradeUpdated', { session })
        if (client2) client2.send('tradeUpdated', { session })
      }
    }
  }

  async handleConfirmTrade(playerId: string, sessionId: string) {
    if (!this.tradingSystem) return

    const success = await this.tradingSystem.confirmTrade(sessionId, playerId)
    if (success) {
      const session = this.tradingSystem.getTradeSession(sessionId)
      if (session) {
        const client1 = this.getClientBySessionId(session.player1Id)
        const client2 = this.getClientBySessionId(session.player2Id)
        if (client1) client1.send('tradeUpdated', { session })
        if (client2) client2.send('tradeUpdated', { session })

        // If both confirmed, execute trade
        if (session.player1Confirmed && session.player2Confirmed) {
          // Track trade completion
          this.monitoringService.recordMetric('game.trade_completed', 1, {
            player1Id: session.player1Id,
            player2Id: session.player2Id,
            itemCount: String(session.player1Offer.items.length + session.player2Offer.items.length),
            credits: String(session.player1Offer.credits + session.player2Offer.credits)
          })
          
          // Trade execution is handled by TradingSystem
          if (client1) client1.send('tradeCompleted', { session })
          if (client2) client2.send('tradeCompleted', { session })
        }
      }
    }
  }

  async handleCancelTrade(playerId: string, sessionId: string) {
    if (!this.tradingSystem) return

    await this.tradingSystem.cancelTrade(sessionId, playerId)
    const session = this.tradingSystem.getTradeSession(sessionId)
    if (session) {
      const client1 = this.getClientBySessionId(session.player1Id)
      const client2 = this.getClientBySessionId(session.player2Id)
      if (client1) client1.send('tradeCancelled', { sessionId })
      if (client2) client2.send('tradeCancelled', { sessionId })
    }
  }

  async handleRequestAchievementProgress(playerId: string) {
    if (!this.achievementSystem) return

    const achievements = this.achievementSystem.getAchievements()
    const progress = await this.achievementSystem.getPlayerProgress(playerId)
    
    const client = this.getClientBySessionId(playerId)
    if (client) {
      client.send('achievementProgress', { achievements, progress })
    }
  }

  // Trading helper methods
  validateTradeProximity(player1Id: string, player2Id: string): boolean {
    const player1 = this.state.players.get(player1Id)
    const player2 = this.state.players.get(player2Id)
    if (!player1 || !player2) return false

    const distance = Math.sqrt(
      Math.pow(player1.x - player2.x, 2) +
      Math.pow(player1.z - player2.z, 2)
    )

    return distance <= 5 // 5 units proximity
  }

  async getPlayerInventory(playerId: string): Promise<Array<{ itemId: string; quantity: number }>> {
    if (this.playerDataRepository) {
      const playerData = await this.playerDataRepository.loadPlayerData(playerId)
      return playerData?.inventory || []
    }
    return []
  }

  async validateItemOwnership(playerId: string, itemId: string, quantity: number): Promise<boolean> {
    const inventory = await this.getPlayerInventory(playerId)
    const item = inventory.find(i => i.itemId === itemId)
    return item ? item.quantity >= quantity : false
  }

  onDispose() {
    if (this.enemySpawnTimer) clearInterval(this.enemySpawnTimer)
    if (this.gameLoopTimer) clearInterval(this.gameLoopTimer)
    if (this.worldBossTimer) clearTimeout(this.worldBossTimer)
    if (this.updateBatchTimer) clearInterval(this.updateBatchTimer)
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer)
    if (this.dailyQuestResetTimer) clearInterval(this.dailyQuestResetTimer)
    if (this.weeklyQuestResetTimer) clearInterval(this.weeklyQuestResetTimer)
    
    // Final save before disposal
    if (this.playerDataRepository) {
      this.autoSavePlayerData().catch(error => {
        console.error('Failed to save player data on disposal:', error)
      })
    }
    
    // Clear spatial grids
    this.enemySpatialGrid.clear()
    this.projectileSpatialGrid.clear()
    
    // Clear pending updates
    this.pendingEntityUpdates.clear()
    
    // Clear player ID to session mapping
    this.playerIdToSessionId.clear()
    
    console.log('NexusRoom disposed')
  }
}

