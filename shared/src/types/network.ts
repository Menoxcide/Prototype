/**
 * Network message types for client-server communication
 */

export interface NetworkMessageData {
  // Movement messages
  move?: { x: number; y: number; z: number; rotation: number }
  
  // Spell messages
  castSpell?: { spellId: string; position: { x: number; y: number; z: number }; rotation: number }
  
  // Chat messages
  chat?: { text: string }
  whisper?: { targetId: string; text: string }
  guildChat?: { text: string }
  
  // Loot messages
  pickupLoot?: { lootId: string }
  
  // Guild messages
  createGuild?: { name: string; tag: string }
  joinGuild?: { guildId: string }
  leaveGuild?: Record<string, never>
  
  // Quest messages
  acceptQuest?: { questId: string }
  completeQuest?: { questId: string }
  
  // Battle pass messages
  claimBattlePassReward?: { tier: number; track: 'free' | 'premium' }
  unlockBattlePassPremium?: Record<string, never>
  requestBattlePassProgress?: Record<string, never>
  
  // Dungeon messages
  createDungeon?: { difficulty: number; level: number }
  enterDungeon?: { dungeonId: string }
  exitDungeon?: { dungeonId: string }
  requestDungeonProgress?: { dungeonId: string }
  
  // Trading messages
  initiateTrade?: { targetPlayerId: string }
  addTradeItem?: { sessionId: string; itemId: string; quantity: number }
  removeTradeItem?: { sessionId: string; itemId: string }
  setTradeCredits?: { sessionId: string; credits: number }
  confirmTrade?: { sessionId: string }
  cancelTrade?: { sessionId: string }
  
  // Achievement messages
  requestAchievementProgress?: Record<string, never>
  
  // Emote messages
  emote?: { emote: string }
  
  // Social messages
  sendFriendRequest?: { targetId: string }
  acceptFriendRequest?: { requestId: string }
  declineFriendRequest?: { requestId: string }
  removeFriend?: { friendId: string }
}

export type NetworkMessageType = keyof NetworkMessageData

export interface TypedNetworkMessage<T extends NetworkMessageType = NetworkMessageType> {
  type: T
  data: NetworkMessageData[T]
  timestamp: number
  priority: number
}

// State delta types
export interface StateDelta {
  type: 'player' | 'enemy' | 'loot' | 'projectile'
  id: string
  position?: { x: number; y: number; z: number }
  x?: number
  y?: number
  z?: number
  rotation?: number
  health?: number
  maxHealth?: number
  mana?: number
  maxMana?: number
  itemId?: string
  [key: string]: unknown
}

export interface StateDeltaMessage {
  deltas: StateDelta[]
}

// Quest update types
export interface QuestProgress {
  questId: string
  status: 'active' | 'completed' | 'failed'
  objectives: Array<{
    id: string
    current: number
    required: number
  }>
  startedAt: number
  expiresAt?: number
}

export interface QuestUpdateMessage {
  activeQuests: QuestProgress[]
}

export interface AvailableQuestsMessage {
  quests: Array<{
    id: string
    name: string
    description: string
    category: string
    level: number
    prerequisites: string[]
    objectives: Array<{
      id: string
      type: string
      target: string
      required: number
    }>
    rewards: Array<{
      type: string
      amount: number
    }>
    repeatable: boolean
    timeLimit?: number
  }>
}

// Battle pass update types
export interface BattlePassProgress {
  season: number
  currentTier: number
  currentXP: number
  premiumUnlocked: boolean
  claimedTiers: number[]
}

export interface BattlePassUpdateMessage {
  progress: BattlePassProgress
  season: {
    id: number
    name: string
    startDate: number
    endDate: number
  }
}

// Housing data types
export interface HousingDataMessage {
  instance: {
    id: string
    playerId: string
    furniture: Array<{
      id: string
      itemId: string
      position: { x: number; y: number; z: number }
      rotation: number
    }>
  } | null
}

// Social data types
export interface FriendsListMessage {
  friends: Array<{
    id: string
    name: string
    online: boolean
    lastSeen: number
  }>
}

export interface FriendRequestsMessage {
  requests: Array<{
    id: string
    fromId: string
    fromName: string
    timestamp: number
  }>
}

export interface FriendRequestReceivedMessage {
  requestId: string
  fromId: string
  fromName: string
  timestamp: number
}

export interface FriendRequestSentMessage {
  requestId: string
  toId: string
  toName: string
  timestamp: number
}

