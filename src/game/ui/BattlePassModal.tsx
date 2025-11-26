import { useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getItem } from '../data/items'
import { getCosmetic } from '../data/cosmetics'
import { claimBattlePassReward, unlockBattlePassPremium, requestBattlePassProgress } from '../network/battlePass'

export default function BattlePassModal() {
  const { isBattlePassOpen, toggleBattlePass, player, battlePassProgress, battlePassSeason } = useGameStore()

  useEffect(() => {
    if (isBattlePassOpen && player) {
      requestBattlePassProgress()
    }
  }, [isBattlePassOpen, player])

  if (!isBattlePassOpen || !player || !battlePassSeason) return null

  const progress = battlePassProgress || {
    season: battlePassSeason.season,
    currentTier: 0,
    currentXP: 0,
    premiumUnlocked: false,
    claimedTiers: [],
    lastUpdated: Date.now()
  }

  // Calculate progress to next tier
  // Store tiers have a simpler structure: { tier: number; freeReward?: {...}; premiumReward?: {...} }
  const nextTierData = battlePassSeason.tiers.find((t: any) => t.tier === progress.currentTier + 1)
  
  let progressToNext = 0
  let xpForNext = 0
  
  // For now, use a simple calculation since store doesn't have xpRequired
  if (nextTierData) {
    // Estimate XP needed per tier (1000 XP per tier)
    const estimatedXPPerTier = 1000
    xpForNext = estimatedXPPerTier
    const xpInCurrentTier = progress.currentXP % estimatedXPPerTier
    progressToNext = xpInCurrentTier / xpForNext
  } else if (progress.currentTier >= battlePassSeason.tiers.length) {
    progressToNext = 1 // Max tier reached
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 neon-glow">
              {battlePassSeason.name}
            </h2>
            <p className="text-gray-400 text-sm">Season {battlePassSeason.season}</p>
            <p className="text-gray-500 text-xs">
              {Math.ceil((battlePassSeason.endDate - Date.now()) / (24 * 60 * 60 * 1000))} days remaining
            </p>
          </div>
          <button
            onClick={toggleBattlePass}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>Tier {progress.currentTier} / {battlePassSeason.tiers.length}</span>
            <span>{progress.currentXP} XP</span>
            {nextTierData && (
              <span>{Math.floor(progressToNext * 100)}% to Tier {progress.currentTier + 1}</span>
            )}
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-cyan-500 to-purple-500 h-4 rounded-full transition-all"
              style={{ width: `${Math.min(progressToNext * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Premium Toggle */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-cyan-300 font-bold">Premium Pass</div>
              <div className="text-sm text-gray-400">
                Unlock exclusive rewards and +25% XP bonus
              </div>
            </div>
            <button
              onClick={() => !progress.premiumUnlocked && unlockBattlePassPremium()}
              disabled={progress.premiumUnlocked}
              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                progress.premiumUnlocked
                  ? 'bg-yellow-600 text-white cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {progress.premiumUnlocked ? '✓ Premium' : 'Upgrade'}
            </button>
          </div>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-5 gap-3">
          {battlePassSeason.tiers.map((tier: any, tierIdx: number) => {
            const isUnlocked = tier.tier <= progress.currentTier
            const isCurrentTier = tier.tier === progress.currentTier
            const claimedTiers = (progress.claimedTiers as number[]) || []
            const freeClaimed = claimedTiers.includes(tier.tier)
            const premiumClaimed = progress.premiumUnlocked && claimedTiers.includes(tier.tier)

            return (
              <div
                key={tierIdx}
                className={`border-2 rounded-lg p-3 ${
                  isCurrentTier
                    ? 'border-cyan-500 bg-cyan-500/20'
                    : isUnlocked
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                <div className="text-center mb-2">
                  <div className="text-lg font-bold text-cyan-400">Tier {tier.tier}</div>
                </div>

                {/* Free Reward */}
                {tier.freeReward && (
                  <div className="mb-2 p-2 bg-gray-800 rounded text-center">
                    <div className="text-xs text-gray-400 mb-1">Free</div>
                    <div className="text-xs">
                      {tier.freeReward.type === 'credits' && (
                        <div className="text-yellow-400">💰 {tier.freeReward.amount}</div>
                      )}
                      {tier.freeReward.type === 'xp' && (
                        <div className="text-cyan-400">⭐ {tier.freeReward.amount} XP</div>
                      )}
                      {tier.freeReward.type === 'item' && (
                        <div>
                          {getItem(tier.freeReward.itemId || '')?.icon} x{tier.freeReward.quantity || 1}
                        </div>
                      )}
                    </div>
                    {isUnlocked && !freeClaimed && (
                      <button
                        onClick={() => claimBattlePassReward(tier.tier, 'free')}
                        className="mt-1 w-full bg-green-600 hover:bg-green-500 text-white text-xs py-1 rounded"
                      >
                        Claim
                      </button>
                    )}
                    {freeClaimed && (
                      <div className="mt-1 text-green-400 text-xs">✓ Claimed</div>
                    )}
                  </div>
                )}

                {/* Premium Reward */}
                {tier.premiumReward && progress.premiumUnlocked && (
                  <div className="p-2 bg-yellow-900/30 border border-yellow-500 rounded text-center">
                    <div className="text-xs text-yellow-400 mb-1">Premium</div>
                    <div className="text-xs">
                      {tier.premiumReward.type === 'cosmetic' && tier.premiumReward.cosmeticId && (
                        <div className="text-yellow-400">
                          {getCosmetic(tier.premiumReward.cosmeticId)?.icon}
                        </div>
                      )}
                      {tier.premiumReward.type === 'item' && tier.premiumReward.itemId && (
                        <div>
                          {getItem(tier.premiumReward.itemId)?.icon} x{tier.premiumReward.quantity || 1}
                        </div>
                      )}
                      {tier.premiumReward.type === 'credits' && (
                        <div className="text-yellow-400">💰 {tier.premiumReward.amount}</div>
                      )}
                    </div>
                    {isUnlocked && !premiumClaimed && (
                      <button
                        onClick={() => claimBattlePassReward(tier.tier, 'premium')}
                        className="mt-1 w-full bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-1 rounded"
                      >
                        Claim
                      </button>
                    )}
                    {premiumClaimed && (
                      <div className="mt-1 text-green-400 text-xs">✓ Claimed</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

