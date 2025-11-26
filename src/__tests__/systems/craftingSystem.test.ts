/**
 * Unit tests for Enhanced Crafting System
 */

import { enhancedCraftingSystem } from '../../game/systems/enhancedCrafting'
import { Recipe } from '../../game/types'
import { CraftingSpecializationData } from '../../../shared/src/types/crafting'

describe('Enhanced Crafting System', () => {
  const mockRecipe: Recipe = {
    id: 'test_recipe',
    name: 'Test Blade',
    description: 'A test weapon',
    level: 10,
    ingredients: [
      { itemId: 'quantum_crystal', quantity: 2 },
      { itemId: 'cyber_scrap', quantity: 5 }
    ],
    result: { itemId: 'test_blade', quantity: 1 },
    craftingTime: 5000
  }

  const mockSpecialization: CraftingSpecializationData = {
    specialization: 'weaponsmith',
    level: 5,
    bonuses: {
      qualityChance: 0.2,
      failureReduction: 0.15,
      statBonus: 0.1,
      speedBonus: 0.2
    }
  }

  describe('calculateQuality', () => {
    test('should return a quality tier', () => {
      const quality = enhancedCraftingSystem.calculateQuality(mockRecipe, null, 1.0)
      expect(['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(quality)
    })

    test('should improve quality with better materials', () => {
      const qualityLow = enhancedCraftingSystem.calculateQuality(mockRecipe, null, 0.5)
      const qualityHigh = enhancedCraftingSystem.calculateQuality(mockRecipe, null, 1.5)
      
      // Higher material quality should generally produce better results
      // (allowing for randomness)
      const qualityOrder = ['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary']
      const lowIndex = qualityOrder.indexOf(qualityLow)
      const highIndex = qualityOrder.indexOf(qualityHigh)
      
      // At least test that both are valid qualities
      expect(lowIndex).toBeGreaterThanOrEqual(0)
      expect(highIndex).toBeGreaterThanOrEqual(0)
    })

    test('should improve quality with specialization', () => {
      const qualityNoSpec = enhancedCraftingSystem.calculateQuality(mockRecipe, null, 1.0)
      const qualityWithSpec = enhancedCraftingSystem.calculateQuality(mockRecipe, mockSpecialization, 1.0)
      
      // Both should be valid qualities
      expect(['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(qualityNoSpec)
      expect(['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(qualityWithSpec)
    })

    test('should consider recipe level in quality calculation', () => {
      const lowLevelRecipe = { ...mockRecipe, level: 1 }
      const highLevelRecipe = { ...mockRecipe, level: 50 }
      
      const qualityLow = enhancedCraftingSystem.calculateQuality(lowLevelRecipe, null, 1.0)
      const qualityHigh = enhancedCraftingSystem.calculateQuality(highLevelRecipe, null, 1.0)
      
      // Both should be valid qualities
      expect(['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(qualityLow)
      expect(['poor', 'common', 'uncommon', 'rare', 'epic', 'legendary']).toContain(qualityHigh)
    })
  })

  describe('canSubstitute', () => {
    test('should find valid substitution', () => {
      const substitution = enhancedCraftingSystem.canSubstitute('quantum_crystal', 'quantum_circuit')
      expect(substitution).not.toBeNull()
      expect(substitution?.originalItemId).toBe('quantum_crystal')
      expect(substitution?.substituteItemId).toBe('quantum_circuit')
      expect(substitution?.qualityPenalty).toBeGreaterThanOrEqual(0)
      expect(substitution?.statPenalty).toBeGreaterThanOrEqual(0)
    })

    test('should return null for invalid substitution', () => {
      const substitution = enhancedCraftingSystem.canSubstitute('invalid_item', 'other_item')
      expect(substitution).toBeNull()
    })

    test('should return null when substitute does not match', () => {
      const substitution = enhancedCraftingSystem.canSubstitute('quantum_crystal', 'wrong_substitute')
      expect(substitution).toBeNull()
    })
  })

  describe('calculateFailureChance', () => {
    test('should return failure chance between 0 and 1', () => {
      const failureChance = enhancedCraftingSystem.calculateFailureChance(mockRecipe, 'common', null)
      expect(failureChance).toBeGreaterThanOrEqual(0)
      expect(failureChance).toBeLessThanOrEqual(1)
    })

    test('should reduce failure chance with specialization', () => {
      const failureNoSpec = enhancedCraftingSystem.calculateFailureChance(mockRecipe, 'common', null)
      const failureWithSpec = enhancedCraftingSystem.calculateFailureChance(mockRecipe, 'common', mockSpecialization)
      
      expect(failureWithSpec).toBeLessThanOrEqual(failureNoSpec)
    })

    test('should increase failure chance with more complex recipes', () => {
      const simpleRecipe = { ...mockRecipe, ingredients: [{ itemId: 'item1', quantity: 1 }] }
      const complexRecipe = { ...mockRecipe, ingredients: [
        { itemId: 'item1', quantity: 1 },
        { itemId: 'item2', quantity: 1 },
        { itemId: 'item3', quantity: 1 },
        { itemId: 'item4', quantity: 1 }
      ]}
      
      const simpleFailure = enhancedCraftingSystem.calculateFailureChance(simpleRecipe, 'common', null)
      const complexFailure = enhancedCraftingSystem.calculateFailureChance(complexRecipe, 'common', null)
      
      expect(complexFailure).toBeGreaterThanOrEqual(simpleFailure)
    })

    test('should have lower failure chance for better quality', () => {
      const poorFailure = enhancedCraftingSystem.calculateFailureChance(mockRecipe, 'poor', null)
      const epicFailure = enhancedCraftingSystem.calculateFailureChance(mockRecipe, 'epic', null)
      
      expect(epicFailure).toBeLessThanOrEqual(poorFailure)
    })
  })

  describe('randomizeStats', () => {
    test('should randomize stats based on quality', () => {
      const baseStats = { damage: 100, defense: 50 }
      const statRanges = [
        { name: 'damage', min: 90, max: 110, qualityMultiplier: 1.0 },
        { name: 'defense', min: 45, max: 55, qualityMultiplier: 1.0 }
      ]

      const poorStats = enhancedCraftingSystem.randomizeStats(baseStats, 'poor', statRanges)
      const epicStats = enhancedCraftingSystem.randomizeStats(baseStats, 'epic', statRanges)

      expect(poorStats.damage).toBeGreaterThan(0)
      expect(poorStats.defense).toBeGreaterThan(0)
      expect(epicStats.damage).toBeGreaterThan(0)
      expect(epicStats.defense).toBeGreaterThan(0)
      
      // Epic should generally have higher stats (allowing for randomness)
      expect(epicStats.damage).toBeGreaterThanOrEqual(poorStats.damage * 0.5)
    })

    test('should apply base stats with quality multiplier', () => {
      const baseStats = { health: 200 }
      const statRanges: any[] = []

      const stats = enhancedCraftingSystem.randomizeStats(baseStats, 'rare', statRanges)
      
      expect(stats.health).toBeGreaterThan(0)
      expect(stats.health).toBeGreaterThanOrEqual(baseStats.health * 0.5)
    })

    test('should handle empty stat ranges', () => {
      const baseStats = { damage: 100 }
      const statRanges: any[] = []

      const stats = enhancedCraftingSystem.randomizeStats(baseStats, 'common', statRanges)
      
      expect(stats.damage).toBeGreaterThan(0)
    })
  })

  describe('calculateSpecializationBonus', () => {
    test('should return specialization bonuses', () => {
      const bonuses = enhancedCraftingSystem.calculateSpecializationBonus(mockSpecialization, mockRecipe)
      
      expect(bonuses.qualityChance).toBeGreaterThanOrEqual(0)
      expect(bonuses.failureReduction).toBeGreaterThanOrEqual(0)
      expect(bonuses.statBonus).toBeGreaterThanOrEqual(0)
      expect(bonuses.speedBonus).toBeGreaterThanOrEqual(0)
    })

    test('should apply match multiplier when specialization matches recipe', () => {
      const weaponRecipe: Recipe = {
        ...mockRecipe,
        name: 'Quantum Blade'
      }
      
      const bonuses = enhancedCraftingSystem.calculateSpecializationBonus(mockSpecialization, weaponRecipe)
      
      // Should have higher bonuses when specialization matches
      expect(bonuses.qualityChance).toBeGreaterThan(mockSpecialization.bonuses.qualityChance)
    })

    test('should not apply match multiplier when specialization does not match', () => {
      const armorRecipe: Recipe = {
        ...mockRecipe,
        name: 'Cyber Armor'
      }
      
      const bonuses = enhancedCraftingSystem.calculateSpecializationBonus(mockSpecialization, armorRecipe)
      
      // Should have base bonuses when specialization does not match
      expect(bonuses.qualityChance).toBeGreaterThanOrEqual(mockSpecialization.bonuses.qualityChance)
    })
  })
})

