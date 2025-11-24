/**
 * BattlePassSystem - Manages battle pass seasons, progress, and rewards
 * Handles XP gain, tier unlocking, and reward claiming
 */

import { BattlePass, BattlePassProgress, BattlePassTier, BattlePassReward } from '../../../shared/src/types/battlePass'
import { DatabaseService, PlayerData } from '../services/DatabaseService'
import { PlayerDataRepository } from '../services/PlayerDataRepository'

export interface BattlePassSystem {
  addExperience(playerId: string, amount: number): Promise<void>
  unlockTier(playerId: string, tier: number): Promise<void>
  claimReward(playerId: string, tier: number, track: 'free' | 'premium'): Promise<boolean>
  getProgress(playerId: string): Promise<BattlePassProgress | null>
  getCurrentSeason(): BattlePass | null
  unlockPremium(playerId: string): Promise<void>
}

export class BattlePassSystemImpl implements BattlePassSystem {
  private currentSeason: BattlePass | null = null
  private playerProgress: Map<string, BattlePassProgress> = new Map()

  constructor(
    private db: DatabaseService | null,
    private playerDataRepo: PlayerDataRepository | null
  ) {
    this.initializeCurrentSeason()
  }

  /**
   * Initialize the current battle pass season
   */
  private initializeCurrentSeason(): void {
    // Season 1: Quantum Season
    this.currentSeason = {
      id: 'season_1',
      name: 'Quantum Season',
      season: 1,
      startDate: Date.now(),
      endDate: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
      tiers: this.generateTiers(50) // 50 tiers
    }
  }

  /**
   * Generate battle pass tiers
   */
  private generateTiers(count: number): BattlePassTier[] {
    const tiers: BattlePassTier[] = []
    let cumulativeXP = 0

    for (let i = 1; i <= count; i++) {
      // XP requirement increases per tier
      const baseXP = 100
      const tierXP = baseXP + (i - 1) * 50
      cumulativeXP += tierXP

      const tier: BattlePassTier = {
        tier: i,
        xpRequired: cumulativeXP,
        freeRewards: this.generateFreeRewards(i),
        premiumRewards: this.generatePremiumRewards(i)
      }

      tiers.push(tier)
    }

    return tiers
  }

  /**
   * Generate free track rewards for a tier
   */
  private generateFreeRewards(tier: number): BattlePassReward[] {
    const rewards: BattlePassReward[] = []

    // Every tier gives credits
    rewards.push({ type: 'credits', amount: tier * 10 })

    // Every 5 tiers give XP
    if (tier % 5 === 0) {
      rewards.push({ type: 'xp', amount: tier * 100 })
    }

    // Every 10 tiers give an item
    if (tier % 10 === 0) {
      rewards.push({ type: 'item', itemId: 'quantum_crystal', quantity: tier / 10 })
    }

    return rewards
  }

  /**
   * Generate premium track rewards for a tier
   */
  private generatePremiumRewards(tier: number): BattlePassReward[] {
    const rewards: BattlePassReward[] = []

    // Premium always gives more credits
    rewards.push({ type: 'credits', amount: tier * 25 })

    // Every tier gives premium rewards
    if (tier % 3 === 0) {
      rewards.push({ type: 'item', itemId: 'mana_cell', quantity: tier / 3 })
    }

    // Milestone tiers give cosmetics
    if (tier === 10 || tier === 25 || tier === 50) {
      rewards.push({ type: 'cosmetic', cosmeticId: `season_1_tier_${tier}` })
    }

    return rewards
  }

  /**
   * Get current battle pass season
   */
  getCurrentSeason(): BattlePass | null {
    if (!this.currentSeason) return null

    // Check if season has ended
    if (Date.now() > this.currentSeason.endDate) {
      // Season ended, would start new season here
      return null
    }

    return this.currentSeason
  }

  /**
   * Get or initialize player battle pass progress
   */
  private async getOrInitProgress(playerId: string): Promise<BattlePassProgress> {
    let progress = this.playerProgress.get(playerId)

    if (!progress) {
      // Try to load from database
      if (this.playerDataRepo) {
        const playerData = await this.playerDataRepo.loadPlayerData(playerId)
        if (playerData?.battlePass) {
          progress = {
            season: playerData.battlePass.season,
            currentTier: playerData.battlePass.currentTier,
            currentXP: playerData.battlePass.currentXP,
            premiumUnlocked: playerData.battlePass.premiumUnlocked,
            claimedTiers: playerData.battlePass.claimedTiers || [],
            lastUpdated: Date.now()
          }
        }
      }

      // Initialize new progress if not found
      if (!progress) {
        const season = this.getCurrentSeason()
        if (!season) {
          throw new Error('No active battle pass season')
        }

        progress = {
          season: season.season,
          currentTier: 0,
          currentXP: 0,
          premiumUnlocked: false,
          claimedTiers: [],
          lastUpdated: Date.now()
        }
      }

      this.playerProgress.set(playerId, progress)
    }

    return progress
  }

  /**
   * Add experience to player's battle pass
   */
  async addExperience(playerId: string, amount: number): Promise<void> {
    const season = this.getCurrentSeason()
    if (!season) return

    const progress = await this.getOrInitProgress(playerId)

    // Check if season matches
    if (progress.season !== season.season) {
      // New season, reset progress
      progress.season = season.season
      progress.currentTier = 0
      progress.currentXP = 0
      progress.claimedTiers = []
    }

    // Add XP
    progress.currentXP += amount
    progress.lastUpdated = Date.now()

    // Check for tier unlocks
    const newTier = this.calculateTier(progress.currentXP, season)
    if (newTier > progress.currentTier) {
      progress.currentTier = newTier
      // Tier unlocked - would send notification here
    }

    // Save progress
    this.playerProgress.set(playerId, progress)
    await this.saveProgress(playerId, progress)
  }

  /**
   * Calculate current tier based on XP
   */
  private calculateTier(xp: number, season: BattlePass): number {
    for (let i = season.tiers.length - 1; i >= 0; i--) {
      if (xp >= season.tiers[i].xpRequired) {
        return season.tiers[i].tier
      }
    }
    return 0
  }

  /**
   * Unlock a tier (called when tier is reached)
   */
  async unlockTier(playerId: string, tier: number): Promise<void> {
    const progress = await this.getOrInitProgress(playerId)
    
    if (tier > progress.currentTier) {
      progress.currentTier = tier
      progress.lastUpdated = Date.now()
      
      this.playerProgress.set(playerId, progress)
      await this.saveProgress(playerId, progress)
    }
  }

  /**
   * Claim a reward from a tier
   */
  async claimReward(playerId: string, tier: number, track: 'free' | 'premium'): Promise<boolean> {
    const season = this.getCurrentSeason()
    if (!season) return false

    const progress = await this.getOrInitProgress(playerId)

    // Check if tier is unlocked
    if (tier > progress.currentTier) {
      return false
    }

    // Check if already claimed
    const claimKey = `${tier}_${track}`
    if (progress.claimedTiers.includes(tier)) {
      // Check if premium was claimed separately
      if (track === 'premium' && !progress.premiumUnlocked) {
        return false
      }
      // Already claimed this tier's free reward
      if (track === 'free') {
        return false
      }
    }

    // Check premium access
    if (track === 'premium' && !progress.premiumUnlocked) {
      return false
    }

    // Get tier data
    const tierData = season.tiers.find(t => t.tier === tier)
    if (!tierData) return false

    // Get rewards
    const rewards = track === 'free' ? tierData.freeRewards : tierData.premiumRewards

    // Distribute rewards (this would be handled by a reward system)
    console.log(`Player ${playerId} claimed ${track} rewards for tier ${tier}:`, rewards)

    // Mark as claimed
    if (!progress.claimedTiers.includes(tier)) {
      progress.claimedTiers.push(tier)
    }
    progress.lastUpdated = Date.now()

    this.playerProgress.set(playerId, progress)
    await this.saveProgress(playerId, progress)

    return true
  }

  /**
   * Unlock premium battle pass
   */
  async unlockPremium(playerId: string): Promise<void> {
    const progress = await this.getOrInitProgress(playerId)
    
    progress.premiumUnlocked = true
    progress.lastUpdated = Date.now()

    this.playerProgress.set(playerId, progress)
    await this.saveProgress(playerId, progress)
  }

  /**
   * Get player's battle pass progress
   */
  async getProgress(playerId: string): Promise<BattlePassProgress | null> {
    try {
      return await this.getOrInitProgress(playerId)
    } catch (error) {
      console.error(`Failed to get battle pass progress for ${playerId}:`, error)
      return null
    }
  }

  /**
   * Save progress to database
   */
  private async saveProgress(playerId: string, progress: BattlePassProgress): Promise<void> {
    if (!this.playerDataRepo) return

    try {
      const playerData = await this.playerDataRepo.loadPlayerData(playerId)
      if (!playerData) return

      await this.playerDataRepo.savePlayerData(playerId, {
        battlePass: {
          season: progress.season,
          currentTier: progress.currentTier,
          currentXP: progress.currentXP,
          premiumUnlocked: progress.premiumUnlocked,
          claimedTiers: progress.claimedTiers
        }
      })
    } catch (error) {
      console.error(`Failed to save battle pass progress for ${playerId}:`, error)
    }
  }

  /**
   * Start a new season
   */
  startNewSeason(seasonNumber: number, name: string, durationDays: number): void {
    this.currentSeason = {
      id: `season_${seasonNumber}`,
      name,
      season: seasonNumber,
      startDate: Date.now(),
      endDate: Date.now() + durationDays * 24 * 60 * 60 * 1000,
      tiers: this.generateTiers(50)
    }

    // Reset all player progress for new season
    this.playerProgress.clear()
    
    console.log(`Started new battle pass season: ${name} (Season ${seasonNumber})`)
  }

  /**
   * Archive completed season
   */
  archiveSeason(): void {
    if (!this.currentSeason) return

    console.log(`Archiving battle pass season: ${this.currentSeason.name}`)
    
    // Would save season data to database here
    // Would archive player progress
    
    this.currentSeason = null
  }
}

