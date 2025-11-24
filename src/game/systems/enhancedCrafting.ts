/**
 * Enhanced Crafting System - Quality, substitution, queue, randomization, failure, specializations
 */

import { 
  CraftingQuality, 
  CRAFTING_QUALITY_DATA,
  MaterialSubstitution,
  CraftingSpecialization,
  CraftingSpecializationData,
  RandomizedItemStat
} from '../../../shared/src/types/crafting'
import { Recipe } from '../types'

export interface EnhancedCraftingSystem {
  calculateQuality(
    recipe: Recipe,
    specialization: CraftingSpecializationData | null,
    materialQuality: number
  ): CraftingQuality
  
  canSubstitute(
    originalItemId: string,
    substituteItemId: string
  ): MaterialSubstitution | null
  
  calculateFailureChance(
    recipe: Recipe,
    quality: CraftingQuality,
    specialization: CraftingSpecializationData | null
  ): number
  
  randomizeStats(
    baseStats: Record<string, number>,
    quality: CraftingQuality,
    statRanges: RandomizedItemStat[]
  ): Record<string, number>
  
  calculateSpecializationBonus(
    specialization: CraftingSpecializationData,
    recipe: Recipe
  ): {
    qualityChance: number
    failureReduction: number
    statBonus: number
    speedBonus: number
  }
}

class EnhancedCraftingSystemImpl implements EnhancedCraftingSystem {
  private substitutions: Map<string, MaterialSubstitution[]> = new Map()
  
  constructor() {
    this.initializeSubstitutions()
  }
  
  private initializeSubstitutions(): void {
    // Example substitutions
    this.addSubstitution('quantum_crystal', 'quantum_circuit', 0.1, 0.05)
    this.addSubstitution('quantum_circuit', 'cyber_scrap', 0.2, 0.1)
  }
  
  private addSubstitution(
    original: string,
    substitute: string,
    qualityPenalty: number,
    statPenalty: number
  ): void {
    if (!this.substitutions.has(original)) {
      this.substitutions.set(original, [])
    }
    this.substitutions.get(original)!.push({
      originalItemId: original,
      substituteItemId: substitute,
      qualityPenalty,
      statPenalty
    })
  }
  
  calculateQuality(
    recipe: Recipe,
    specialization: CraftingSpecializationData | null,
    materialQuality: number = 1.0
  ): CraftingQuality {
    // Base quality calculation
    let qualityScore = 0.5 + (materialQuality * 0.3)
    
    // Specialization bonus
    if (specialization) {
      qualityScore += specialization.bonuses.qualityChance * 0.2
    }
    
    // Recipe level affects quality
    qualityScore += (recipe.level / 50) * 0.2
    
    // Random factor
    qualityScore += (Math.random() - 0.5) * 0.3
    
    // Determine quality tier
    if (qualityScore >= 0.95) return 'legendary'
    if (qualityScore >= 0.85) return 'epic'
    if (qualityScore >= 0.70) return 'rare'
    if (qualityScore >= 0.50) return 'uncommon'
    if (qualityScore >= 0.30) return 'common'
    return 'poor'
  }
  
  canSubstitute(
    originalItemId: string,
    substituteItemId: string
  ): MaterialSubstitution | null {
    const subs = this.substitutions.get(originalItemId)
    if (!subs) return null
    
    return subs.find(s => s.substituteItemId === substituteItemId) || null
  }
  
  calculateFailureChance(
    recipe: Recipe,
    quality: CraftingQuality,
    specialization: CraftingSpecializationData | null
  ): number {
    const qualityData = CRAFTING_QUALITY_DATA[quality]
    let failureChance = qualityData.failureChance
    
    // Recipe complexity affects failure
    failureChance += (recipe.ingredients.length - 2) * 0.05
    
    // Specialization reduces failure
    if (specialization) {
      failureChance *= (1 - specialization.bonuses.failureReduction)
    }
    
    return Math.max(0, Math.min(1, failureChance))
  }
  
  randomizeStats(
    baseStats: Record<string, number>,
    quality: CraftingQuality,
    statRanges: RandomizedItemStat[]
  ): Record<string, number> {
    const qualityData = CRAFTING_QUALITY_DATA[quality]
    const randomized: Record<string, number> = {}
    
    for (const stat of statRanges) {
      const range = stat.max - stat.min
      const randomValue = stat.min + (Math.random() * range)
      const qualityMultiplier = 1 + (qualityData.statMultiplier - 1) * stat.qualityMultiplier
      randomized[stat.name] = Math.floor(randomValue * qualityMultiplier)
    }
    
    // Apply base stats with quality multiplier
    for (const [key, value] of Object.entries(baseStats)) {
      if (!randomized[key]) {
        randomized[key] = Math.floor(value * qualityData.statMultiplier)
      }
    }
    
    return randomized
  }
  
  calculateSpecializationBonus(
    specialization: CraftingSpecializationData,
    recipe: Recipe
  ): {
    qualityChance: number
    failureReduction: number
    statBonus: number
    speedBonus: number
  } {
    // Check if specialization matches recipe type
    const matches = this.specializationMatchesRecipe(specialization.specialization, recipe)
    const matchMultiplier = matches ? 1.5 : 1.0
    
    return {
      qualityChance: specialization.bonuses.qualityChance * matchMultiplier,
      failureReduction: specialization.bonuses.failureReduction * matchMultiplier,
      statBonus: specialization.bonuses.statBonus * matchMultiplier,
      speedBonus: specialization.bonuses.speedBonus * matchMultiplier
    }
  }
  
  private specializationMatchesRecipe(
    specialization: CraftingSpecialization,
    recipe: Recipe
  ): boolean {
    // Simple matching logic - can be enhanced
    const recipeName = recipe.name.toLowerCase()
    if (specialization === 'weaponsmith' && (recipeName.includes('blade') || recipeName.includes('rifle'))) {
      return true
    }
    if (specialization === 'armorsmith' && recipeName.includes('armor')) {
      return true
    }
    if (specialization === 'alchemist' && (recipeName.includes('pack') || recipeName.includes('cell'))) {
      return true
    }
    return false
  }
}

export const enhancedCraftingSystem = new EnhancedCraftingSystemImpl()

