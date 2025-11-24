export interface Quest {
  id: string
  name: string
  description: string
  type: 'daily' | 'weekly' | 'story'
  objectives: QuestObjective[]
  rewards: QuestReward[]
  level: number
  expiresAt?: number // For daily/weekly quests
}

export interface QuestObjective {
  id: string
  type: 'kill' | 'collect' | 'craft' | 'reach_level'
  target: string // Enemy type, item ID, etc.
  quantity: number
  current: number
  completed: boolean
}

export interface QuestReward {
  type: 'xp' | 'credits' | 'item'
  amount?: number
  itemId?: string
  quantity?: number
}

export const DAILY_QUESTS: Quest[] = [
  {
    id: 'daily_kill_10',
    name: 'Daily Slayer',
    description: 'Defeat 10 enemies',
    type: 'daily',
    objectives: [
      {
        id: 'kill_10',
        type: 'kill',
        target: 'cyber_drone',
        quantity: 10,
        current: 0,
        completed: false
      }
    ],
    rewards: [
      { type: 'xp', amount: 500 },
      { type: 'credits', amount: 200 }
    ],
    level: 1,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  },
  {
    id: 'daily_collect_5',
    name: 'Resource Gatherer',
    description: 'Collect 5 quantum crystals',
    type: 'daily',
    objectives: [
      {
        id: 'collect_5',
        type: 'collect',
        target: 'quantum_crystal',
        quantity: 5,
        current: 0,
        completed: false
      }
    ],
    rewards: [
      { type: 'xp', amount: 300 },
      { type: 'credits', amount: 150 },
      { type: 'item', itemId: 'mana_cell', quantity: 2 }
    ],
    level: 1,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  },
  {
    id: 'daily_craft_3',
    name: 'Master Crafter',
    description: 'Craft 3 items',
    type: 'daily',
    objectives: [
      {
        id: 'craft_3',
        type: 'craft',
        target: 'any',
        quantity: 3,
        current: 0,
        completed: false
      }
    ],
    rewards: [
      { type: 'xp', amount: 400 },
      { type: 'credits', amount: 100 }
    ],
    level: 5,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  }
]

export const WEEKLY_QUESTS: Quest[] = [
  {
    id: 'weekly_kill_100',
    name: 'Weekly Warrior',
    description: 'Defeat 100 enemies this week',
    type: 'weekly',
    objectives: [
      {
        id: 'kill_100',
        type: 'kill',
        target: 'any',
        quantity: 100,
        current: 0,
        completed: false
      }
    ],
    rewards: [
      { type: 'xp', amount: 5000 },
      { type: 'credits', amount: 1000 },
      { type: 'item', itemId: 'quantum_blade', quantity: 1 }
    ],
    level: 1,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  }
]

export function getDailyQuests(): Quest[] {
  return DAILY_QUESTS.filter(quest => {
    if (quest.expiresAt && Date.now() > quest.expiresAt) return false
    return true
  })
}

export function getWeeklyQuests(): Quest[] {
  return WEEKLY_QUESTS.filter(quest => {
    if (quest.expiresAt && Date.now() > quest.expiresAt) return false
    return true
  })
}

