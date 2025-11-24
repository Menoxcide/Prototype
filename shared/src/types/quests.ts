/**
 * Shared quest types used across client and server
 */

export type QuestCategory = 'main' | 'side' | 'daily' | 'weekly'
export type QuestStatus = 'active' | 'completed' | 'failed' | 'available'
export type QuestObjectiveType = 'kill' | 'collect' | 'reach' | 'craft' | 'complete'

export interface Quest {
  id: string
  name: string
  description: string
  category: QuestCategory
  level: number
  prerequisites: string[] // Quest IDs that must be completed first
  objectives: QuestObjective[]
  rewards: QuestReward[]
  repeatable: boolean
  timeLimit?: number // Time limit in milliseconds
}

export interface QuestObjective {
  id: string
  type: QuestObjectiveType
  target: string // Enemy type, item ID, location, etc.
  quantity: number
  current: number
  description?: string
}

export interface QuestProgress {
  questId: string
  status: QuestStatus
  objectives: QuestObjective[]
  startedAt: number
  completedAt?: number
  expiresAt?: number
}

export interface QuestReward {
  type: 'xp' | 'credits' | 'item' | 'battlePassXP'
  amount?: number
  itemId?: string
  quantity?: number
}

