import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { getItem } from '../data/items'
import { acceptQuest, requestAvailableQuests } from '../network/quests'

export default function QuestModal() {
  const { isQuestOpen, toggleQuest, player, activeQuests, availableQuests } = useGameStore()
  const [selectedCategory, setSelectedCategory] = useState<'active' | 'available'>('active')

  useEffect(() => {
    if (isQuestOpen && player) {
      requestAvailableQuests()
    }
  }, [isQuestOpen, player])

  if (!isQuestOpen || !player) return null

  const renderActiveQuest = (questProgress: typeof activeQuests[0]) => {
    const allCompleted = questProgress.objectives.every(obj => obj.current >= obj.quantity)
    const isExpired = questProgress.expiresAt && Date.now() > questProgress.expiresAt
    
    return (
      <div
        key={questProgress.questId}
        className={`bg-gray-800 border-2 rounded-lg p-4 mb-3 ${
          allCompleted ? 'border-green-500' : isExpired ? 'border-red-500' : 'border-cyan-500'
        }`}
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-cyan-300 font-bold text-lg">Quest {questProgress.questId}</h3>
            {isExpired && (
              <p className="text-red-400 text-sm">Expired</p>
            )}
          </div>
          {allCompleted && (
            <button
              onClick={() => acceptQuest(questProgress.questId)} // This will complete it
              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-bold"
            >
              Claim
            </button>
          )}
        </div>

        <div className="mb-3">
          <div className="text-sm font-bold text-cyan-400 mb-1">Objectives:</div>
          {questProgress.objectives.map(obj => {
            const progress = (obj.current / obj.quantity) * 100
            return (
              <div key={obj.id} className="text-sm text-gray-300 mb-2">
                <div className="flex justify-between mb-1">
                  <span className={obj.current >= obj.quantity ? 'line-through text-gray-500' : ''}>
                    {obj.type === 'kill' && `Defeat ${obj.quantity} ${obj.target === 'any' ? 'enemies' : obj.target}`}
                    {obj.type === 'collect' && `Collect ${obj.quantity} ${obj.target}`}
                    {obj.type === 'craft' && `Craft ${obj.quantity} items`}
                    {obj.type === 'reach' && `Reach ${obj.target}`}
                  </span>
                  <span className="text-cyan-400">
                    {obj.current}/{obj.quantity}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-cyan-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderAvailableQuest = (quest: typeof availableQuests[0]) => {
    return (
      <div
        key={quest.id}
        className="bg-gray-800 border-2 border-cyan-500 rounded-lg p-4 mb-3"
      >
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-cyan-300 font-bold text-lg">{quest.name}</h3>
            <p className="text-gray-400 text-sm">{quest.description}</p>
            <p className="text-gray-500 text-xs mt-1">Level {quest.level} • {quest.category}</p>
          </div>
          <button
            onClick={() => acceptQuest(quest.id)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded text-sm font-bold"
          >
            Accept
          </button>
        </div>

        <div>
          <div className="text-sm font-bold text-yellow-400 mb-1">Rewards:</div>
          <div className="flex gap-2 flex-wrap">
            {quest.rewards.map((reward: any, idx: number) => (
              <div key={idx} className="text-xs bg-gray-700 px-2 py-1 rounded">
                {reward.type === 'xp' && `+${reward.amount} XP`}
                {reward.type === 'credits' && `+${reward.amount} Credits`}
                {reward.type === 'item' && reward.itemId && (
                  <span>
                    {getItem(reward.itemId)?.icon} {getItem(reward.itemId)?.name} x{reward.quantity}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400 neon-glow">Quests</h2>
          <button
            onClick={toggleQuest}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory('active')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              selectedCategory === 'active'
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
            }`}
          >
            Active ({activeQuests.length})
          </button>
          <button
            onClick={() => setSelectedCategory('available')}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              selectedCategory === 'available'
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
            }`}
          >
            Available ({availableQuests.length})
          </button>
        </div>

        {/* Quest List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {selectedCategory === 'active' ? (
            activeQuests.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No active quests. Check available quests to start!
              </div>
            ) : (
              activeQuests.map(renderActiveQuest)
            )
          ) : (
            availableQuests.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No quests available at your level.
              </div>
            ) : (
              availableQuests.map(renderAvailableQuest)
            )
          )}
        </div>
      </div>
    </div>
  )
}

