/**
 * Shared achievement types used across client and server
 */

export interface Achievement {
  id: string
  name: string
  description: string
  category: 'combat' | 'exploration' | 'social' | 'crafting' | 'collection' | 'progression'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  icon?: string
  hidden: boolean // Hidden until unlocked
  requirements: AchievementRequirement[]
  rewards: AchievementReward[]
  points: number // Achievement points value
}

export interface AchievementRequirement {
  type: 'kill' | 'collect' | 'craft' | 'reach_level' | 'complete_quest' | 'join_guild' | 'trade' | 'dungeon_complete'
  target?: string // Enemy type, item ID, quest ID, etc.
  quantity: number
  current: number
  completed: boolean
}

export interface AchievementProgress {
  achievementId: string
  unlocked: boolean
  unlockedAt?: number
  requirements: AchievementRequirement[]
  progress: number // 0-1
}

export interface AchievementReward {
  type: 'xp' | 'credits' | 'item' | 'title' | 'cosmetic'
  amount?: number
  itemId?: string
  titleId?: string
  cosmeticId?: string
  quantity?: number
}

export type GameEventType = 'kill' | 'collect' | 'craft' | 'level_up' | 'complete_quest' | 'join_guild' | 'trade' | 'dungeon_complete'

export interface GameEvent {
  type: GameEventType
  playerId: string
  targetId?: string // Enemy type, item id, quest id, etc.
  quantity?: number
  level?: number
}

