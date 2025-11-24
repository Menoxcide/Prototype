/**
 * Shared skill types used across client and server
 */

export type SkillCategory = 'combat' | 'magic' | 'crafting' | 'survival' | 'social'
export type SkillType = 'passive' | 'active' | 'ultimate'

export interface Skill {
  id: string
  name: string
  description: string
  category: SkillCategory
  type: SkillType
  maxLevel: number
  requirements: SkillRequirement[]
  effects: SkillEffect[]
  icon: string
  color: string
}

export interface SkillRequirement {
  type: 'level' | 'skill' | 'quest'
  value: string | number
}

export interface SkillEffect {
  level: number
  stat?: string // e.g., 'damage', 'health', 'mana'
  modifier: number // percentage or flat value
  description: string
}

export interface PlayerSkill {
  skillId: string
  level: number
  experience: number
  experienceToNext: number
  unlocked: boolean
  unlockedAt?: number
}

export interface SkillTree {
  category: SkillCategory
  skills: Skill[]
  prerequisites: Map<string, string[]> // skillId -> required skillIds
}

