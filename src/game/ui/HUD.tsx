import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { RACES } from '../data/races'
import QualitySettingsModal from '../components/QualitySettingsModal'
import SkillsModal from './SkillsModal'
import DraggableResizable from '../components/DraggableResizable'

export default function HUD() {
  const {
    player,
    isInventoryOpen,
    isCraftingOpen,
    isMarketOpen,
    isSpellbookOpen,
    isGuildOpen,
    isQuestOpen,
    isBattlePassOpen,
    isAchievementOpen,
    isShopOpen,
    isSkillsOpen,
    toggleInventory,
    toggleCrafting,
    toggleMarket,
    toggleSpellbook,
    toggleGuild,
    toggleQuest,
    toggleBattlePass,
    toggleAchievement,
    toggleShop,
    toggleSkills
  } = useGameStore()
  
  const [isQualitySettingsOpen, setIsQualitySettingsOpen] = useState(false)

  if (!player) return null

  // Defensive check for race data
  const raceData = RACES[player.race] || RACES.human
  const healthPercent = player.maxHealth > 0 ? (player.health / player.maxHealth) * 100 : 0
  const manaPercent = player.maxMana > 0 ? (player.mana / player.maxMana) * 100 : 0
  const xpPercent = player.xpToNext > 0 ? (player.xp / player.xpToNext) * 100 : 0

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Top Left - Player Info (Draggable/Resizable) */}
      <DraggableResizable
        id="player-stats"
        storageKey="playerStats"
        defaultPosition={{ x: 16, y: 16 }}
        defaultSize={{ width: 300, height: 140 }}
        minWidth={200}
        minHeight={100}
        maxWidth={400}
        className="pointer-events-auto"
        header={
          <div className="flex items-center justify-between p-2 bg-gray-900/90 border-b border-cyan-500">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: raceData.color }}
              />
              <span className="text-cyan-300 font-bold">{player.name}</span>
              {player.guildTag && (
                <span className="text-purple-400 text-sm">[{player.guildTag}]</span>
              )}
            </div>
            <div className="text-cyan-400 text-sm">Lv. {player.level}</div>
          </div>
        }
      >
        <div className="bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-3 neon-border">
          {/* Health Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>HP</span>
              <span>{player.health}/{player.maxHealth}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all neon-glow"
                style={{
                  width: `${healthPercent}%`,
                  boxShadow: '0 0 10px #ff0000'
                }}
              />
            </div>
          </div>

          {/* Mana Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>MP</span>
              <span>{player.mana}/{player.maxMana}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all neon-glow"
                style={{
                  width: `${manaPercent}%`,
                  boxShadow: '0 0 10px #0099ff'
                }}
              />
            </div>
          </div>

          {/* XP Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>XP</span>
              <span>{player.xp}/{player.xpToNext}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-cyan-500 h-1.5 rounded-full transition-all"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </DraggableResizable>

      {/* Top Right - Quest & Battle Pass Buttons (Draggable/Resizable) */}
      <DraggableResizable
        id="top-right-buttons"
        storageKey="topRightButtons"
        defaultPosition={{ x: typeof window !== 'undefined' ? window.innerWidth - 600 : 200, y: 16 }}
        defaultSize={{ width: 580, height: 50 }}
        minWidth={400}
        minHeight={40}
        resizable={false}
        className="pointer-events-auto"
        header={<div className="w-full h-full cursor-grab active:cursor-grabbing" style={{ backgroundColor: 'rgba(0,0,0,0.01)', pointerEvents: 'auto' }} />}
      >
        <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-2 neon-border flex gap-2 items-center" style={{ zIndex: 5, pointerEvents: 'none' }}>
          <div className="flex gap-2 items-center w-full" style={{ pointerEvents: 'auto' }}>
            <button
              onClick={toggleQuest}
              className={`bg-gray-900/90 border-2 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                isQuestOpen
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                  : 'border-cyan-500 text-cyan-400 hover:bg-gray-800'
              } neon-border`}
            >
              📜 Quests
            </button>
            <button
              onClick={toggleBattlePass}
              className={`bg-gray-900/90 border-2 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                isBattlePassOpen
                  ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                  : 'border-purple-500 text-purple-400 hover:bg-gray-800'
              } neon-border`}
            >
              🎁 Battle Pass
            </button>
            <button
              onClick={toggleAchievement}
              className={`bg-gray-900/90 border-2 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                isAchievementOpen
                  ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                  : 'border-yellow-500 text-yellow-400 hover:bg-gray-800'
              } neon-border`}
            >
              🏆 Achievements
            </button>
            <button
              onClick={toggleShop}
              className={`bg-gray-900/90 border-2 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                isShopOpen
                  ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                  : 'border-yellow-500 text-yellow-400 hover:bg-gray-800'
              } neon-border`}
            >
              🛍️ Shop
            </button>
            <button
              onClick={toggleSkills}
              className={`bg-gray-900/90 border-2 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                isSkillsOpen
                  ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                  : 'border-purple-500 text-purple-400 hover:bg-gray-800'
              } neon-border`}
            >
              ⭐ Skills
            </button>
            <div className="ml-auto bg-gray-900/90 backdrop-blur-sm border-2 border-yellow-500 rounded-lg px-4 py-2 neon-border">
              <div className="text-yellow-400 font-bold">💰 {player.credits}</div>
            </div>
          </div>
        </div>
      </DraggableResizable>

      {/* Bottom Bar - Action Buttons (Draggable/Resizable) */}
      <DraggableResizable
        id="action-buttons"
        storageKey="actionButtons"
        defaultPosition={{ 
          x: typeof window !== 'undefined' ? (window.innerWidth - 500) / 2 : 200, 
          y: typeof window !== 'undefined' ? window.innerHeight - 80 : 400 
        }}
        defaultSize={{ width: 500, height: 60 }}
        minWidth={400}
        minHeight={50}
        resizable={false}
        className="pointer-events-auto"
        header={<div className="w-full h-full cursor-grab active:cursor-grabbing" style={{ backgroundColor: 'rgba(0,0,0,0.01)', pointerEvents: 'auto' }} />}
      >
        <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-2 neon-border flex items-center justify-center" style={{ zIndex: 5, pointerEvents: 'none' }}>
          <div className="flex justify-center gap-2" style={{ pointerEvents: 'auto' }}>
            <button
              onClick={toggleInventory}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                isInventoryOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
            >
              📦 Inv
            </button>
            <button
              onClick={toggleCrafting}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                isCraftingOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
            >
              🔨 Craft
            </button>
            <button
              onClick={toggleMarket}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                isMarketOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
            >
              💰 Market
            </button>
            <button
              onClick={toggleSpellbook}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                isSpellbookOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
            >
              📖 Spells
            </button>
            <button
              onClick={toggleGuild}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                isGuildOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
            >
              👥 Guild
            </button>
            <button
              onClick={() => setIsQualitySettingsOpen(true)}
              className="px-4 py-2 rounded-lg font-bold transition-all bg-gray-800 text-cyan-400 hover:bg-gray-700"
              title="Quality Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </DraggableResizable>

      {/* Quality Settings Modal */}
      <QualitySettingsModal
        isOpen={isQualitySettingsOpen}
        onClose={() => setIsQualitySettingsOpen(false)}
      />
      
      {/* Skills Modal */}
      <SkillsModal />
    </div>
  )
}

