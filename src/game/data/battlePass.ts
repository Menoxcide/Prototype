export interface BattlePassTier {
  level: number
  freeReward?: BattlePassReward
  premiumReward?: BattlePassReward
}

export interface BattlePassReward {
  type: 'xp' | 'credits' | 'item' | 'cosmetic'
  amount?: number
  itemId?: string
  cosmeticId?: string
  quantity?: number
}

export interface BattlePass {
  id: string
  name: string
  season: number
  startDate: number
  endDate: number
  tiers: BattlePassTier[]
}

export const BATTLE_PASS_TIERS: BattlePassTier[] = [
  { level: 1, freeReward: { type: 'credits', amount: 100 }, premiumReward: { type: 'cosmetic', cosmeticId: 'neon_glow' } },
  { level: 2, freeReward: { type: 'xp', amount: 500 }, premiumReward: { type: 'item', itemId: 'health_pack', quantity: 5 } },
  { level: 3, freeReward: { type: 'credits', amount: 150 }, premiumReward: { type: 'cosmetic', cosmeticId: 'weapon_trail_blue' } },
  { level: 4, freeReward: { type: 'xp', amount: 750 }, premiumReward: { type: 'item', itemId: 'mana_cell', quantity: 5 } },
  { level: 5, freeReward: { type: 'credits', amount: 200 }, premiumReward: { type: 'cosmetic', cosmeticId: 'name_glow_purple' } },
  { level: 6, freeReward: { type: 'xp', amount: 1000 }, premiumReward: { type: 'item', itemId: 'quantum_crystal', quantity: 3 } },
  { level: 7, freeReward: { type: 'credits', amount: 250 }, premiumReward: { type: 'cosmetic', cosmeticId: 'death_effect_void' } },
  { level: 8, freeReward: { type: 'xp', amount: 1250 }, premiumReward: { type: 'item', itemId: 'energy_drink', quantity: 3 } },
  { level: 9, freeReward: { type: 'credits', amount: 300 }, premiumReward: { type: 'cosmetic', cosmeticId: 'chroma_skin_rainbow' } },
  { level: 10, freeReward: { type: 'xp', amount: 1500 }, premiumReward: { type: 'cosmetic', cosmeticId: 'legendary_aura' } }
]

export const CURRENT_BATTLE_PASS: BattlePass = {
  id: 'season_1',
  name: 'Quantum Season',
  season: 1,
  startDate: Date.now(),
  endDate: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90 days
  tiers: BATTLE_PASS_TIERS
}

export function getBattlePassProgress(battlePassXP: number): { currentTier: number; progress: number; nextTierXP: number } {
  const XP_PER_TIER = 1000
  const currentTier = Math.floor(battlePassXP / XP_PER_TIER) + 1
  const progress = (battlePassXP % XP_PER_TIER) / XP_PER_TIER
  const nextTierXP = currentTier * XP_PER_TIER

  return {
    currentTier: Math.min(currentTier, BATTLE_PASS_TIERS.length),
    progress,
    nextTierXP
  }
}

