/**
 * Shared battle pass types used across client and server
 */

export interface BattlePass {
  id: string
  name: string
  season: number
  startDate: number
  endDate: number
  tiers: BattlePassTier[]
}

export interface BattlePassTier {
  tier: number
  xpRequired: number
  freeRewards: BattlePassReward[]
  premiumRewards: BattlePassReward[]
}

export interface BattlePassReward {
  type: 'xp' | 'credits' | 'item' | 'cosmetic' | 'battlePassXP'
  amount?: number
  itemId?: string
  cosmeticId?: string
  quantity?: number
}

export interface BattlePassProgress {
  season: number
  currentTier: number
  currentXP: number
  premiumUnlocked: boolean
  claimedTiers: number[]
  lastUpdated: number
}

export interface BattlePassTierProgress {
  tier: number
  xpRequired: number
  currentXP: number
  progress: number // 0-1
  freeRewardClaimed: boolean
  premiumRewardClaimed: boolean
  freeRewards: BattlePassReward[]
  premiumRewards: BattlePassReward[]
}

