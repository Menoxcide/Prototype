/**
 * Enhanced Crafting Types - Shared between client and server
 */

export type CraftingQuality = 'poor' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export type CraftingSpecialization = 
  | 'weaponsmith'
  | 'armorsmith'
  | 'alchemist'
  | 'engineer'
  | 'enchanter'

export interface CraftingQualityData {
  quality: CraftingQuality
  statMultiplier: number
  failureChance: number
  materialBonus: number
}

export const CRAFTING_QUALITY_DATA: Record<CraftingQuality, CraftingQualityData> = {
  poor: { quality: 'poor', statMultiplier: 0.7, failureChance: 0.3, materialBonus: 0 },
  common: { quality: 'common', statMultiplier: 1.0, failureChance: 0.1, materialBonus: 0 },
  uncommon: { quality: 'uncommon', statMultiplier: 1.2, failureChance: 0.05, materialBonus: 0.1 },
  rare: { quality: 'rare', statMultiplier: 1.5, failureChance: 0.02, materialBonus: 0.2 },
  epic: { quality: 'epic', statMultiplier: 2.0, failureChance: 0.01, materialBonus: 0.3 },
  legendary: { quality: 'legendary', statMultiplier: 3.0, failureChance: 0.005, materialBonus: 0.5 }
}

export interface MaterialSubstitution {
  originalItemId: string
  substituteItemId: string
  qualityPenalty: number // Reduces quality chance
  statPenalty: number // Reduces stat bonus
}

export interface CraftingQueueItem {
  id: string
  recipeId: string
  quality: CraftingQuality | null // null = auto-determine
  startTime: number
  duration: number
  status: 'queued' | 'crafting' | 'completed' | 'failed'
  result?: {
    itemId: string
    quantity: number
    quality: CraftingQuality
    stats?: Record<string, number>
  }
}

export interface CraftingSpecializationData {
  specialization: CraftingSpecialization
  level: number
  experience: number
  experienceToNext: number
  bonuses: {
    qualityChance: number
    failureReduction: number
    statBonus: number
    speedBonus: number
  }
}

export interface RandomizedItemStat {
  name: string
  min: number
  max: number
  qualityMultiplier: number
}

