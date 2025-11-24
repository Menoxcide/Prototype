import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { requestAchievementProgress } from '../network/achievements'
import type { AchievementProgress } from '../../../shared/src/types/achievements'

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b'
}

const RARITY_BORDERS = {
  common: 'border-gray-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500'
}

export default function AchievementModal() {
  const { isAchievementOpen, toggleAchievement, player, achievementProgress, achievements } = useGameStore()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    if (isAchievementOpen && player) {
      requestAchievementProgress()
    }
  }, [isAchievementOpen, player])

  if (!isAchievementOpen || !player) return null

  const categories = ['all', 'combat', 'exploration', 'social', 'crafting', 'collection', 'progression']
  const filteredAchievements = selectedCategory === 'all'
    ? achievements
    : achievements.filter(a => a.category === selectedCategory)

  const getProgress = (achievementId: string): AchievementProgress | null => {
    return achievementProgress.find(p => p.achievementId === achievementId) || null
  }

  const unlockedCount = achievementProgress.filter(p => p.unlocked).length
  const totalPoints = achievementProgress
    .filter(p => p.unlocked)
    .reduce((sum, p) => {
      const achievement = achievements.find(a => a.id === p.achievementId)
      return sum + (achievement?.points || 0)
    }, 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 neon-glow">Achievements</h2>
            <p className="text-gray-400 text-sm">
              {unlockedCount} / {achievements.length} unlocked • {totalPoints} points
            </p>
          </div>
          <button
            onClick={toggleAchievement}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                selectedCategory === category
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Achievements List */}
        <div className="grid grid-cols-1 gap-3">
          {filteredAchievements.map(achievement => {
            const progress = getProgress(achievement.id)
            const isUnlocked = progress?.unlocked || false

            return (
              <div
                key={achievement.id}
                className={`border-2 rounded-lg p-4 ${
                  isUnlocked
                    ? `${RARITY_BORDERS[achievement.rarity as keyof typeof RARITY_BORDERS]} bg-${achievement.rarity === 'legendary' ? 'yellow' : achievement.rarity === 'epic' ? 'purple' : achievement.rarity === 'rare' ? 'blue' : 'gray'}-900/20`
                    : 'border-gray-700 bg-gray-800/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`text-lg font-bold ${isUnlocked ? 'text-cyan-300' : 'text-gray-400'}`}>
                        {achievement.name}
                        {isUnlocked && <span className="text-green-400 ml-2">✓</span>}
                      </h3>
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: `${RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]}20`,
                          color: RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS],
                          border: `1px solid ${RARITY_COLORS[achievement.rarity as keyof typeof RARITY_COLORS]}`
                        }}
                      >
                        {achievement.rarity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {achievement.points} pts
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>

                    {/* Requirements Progress */}
                    {!isUnlocked && progress && (
                      <div className="space-y-1">
                        {progress.requirements.map((req, idx) => (
                          <div key={idx} className="text-xs">
                            <div className="flex justify-between text-gray-400 mb-1">
                              <span>
                                {req.type === 'kill' && `Defeat ${req.target || 'enemies'}`}
                                {req.type === 'collect' && `Collect items`}
                                {req.type === 'craft' && 'Craft items'}
                                {req.type === 'reach_level' && 'Reach level'}
                                {req.type === 'complete_quest' && 'Complete quests'}
                                {req.type === 'join_guild' && 'Join guild'}
                                {req.type === 'trade' && 'Complete trades'}
                                {req.type === 'dungeon_complete' && 'Complete dungeons'}
                              </span>
                              <span>{req.current} / {req.quantity}</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-1.5">
                              <div
                                className="bg-cyan-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${Math.min((req.current / req.quantity) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Rewards */}
                    {achievement.rewards.length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {achievement.rewards.map((reward: any, idx: number) => (
                          <div key={idx} className="text-xs bg-gray-800 px-2 py-1 rounded">
                            {reward.type === 'xp' && `⭐ ${reward.amount} XP`}
                            {reward.type === 'credits' && `💰 ${reward.amount} Credits`}
                            {reward.type === 'item' && `📦 ${reward.itemId} x${reward.quantity}`}
                            {reward.type === 'title' && `👑 Title: ${reward.titleId}`}
                            {reward.type === 'cosmetic' && `✨ ${reward.cosmeticId}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

