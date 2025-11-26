import { useState, useEffect, useRef } from 'react'
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
    isSettingsOpen,
    isClimbingBuilding,
    canGrapple,
    grappledBuilding,
    stamina,
    maxStamina,
    toggleInventory,
    toggleCrafting,
    toggleMarket,
    toggleSpellbook,
    toggleGuild,
    toggleQuest,
    toggleBattlePass,
    toggleAchievement,
    toggleShop,
    toggleSkills,
    toggleSettings,
    isHousingOpen,
    toggleHousing,
    isSocialOpen,
    toggleSocial,
    isMinimapOpen,
    toggleMinimap
  } = useGameStore()
  
  const [isQualitySettingsOpen, setIsQualitySettingsOpen] = useState(false)
  const [showClimbingIndicator, setShowClimbingIndicator] = useState(false)
  const [showGrappleIndicator, setShowGrappleIndicator] = useState(false)
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const grappleIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [chunkProgress] = useState({ loadedChunks: 0, loadingChunks: 0, percentage: 0, currentChunk: null as { x: number; z: number } | null })
  const [assetProgress] = useState({ percentage: 0, currentAsset: '' })
  const [isLoading] = useState(false)
  
  // Show indicator when climbing starts, and keep it visible for 3 seconds after climbing stops
  useEffect(() => {
    if (isClimbingBuilding) {
      // Show indicator immediately when climbing starts
      setShowClimbingIndicator(true)
      
      // Clear any existing timeout
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current)
        indicatorTimeoutRef.current = null
      }
    } else {
      // When climbing stops, set a timer to hide the indicator after 3 seconds
      if (showClimbingIndicator && !indicatorTimeoutRef.current) {
        indicatorTimeoutRef.current = setTimeout(() => {
          setShowClimbingIndicator(false)
          indicatorTimeoutRef.current = null
        }, 3000) // 3 seconds
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (indicatorTimeoutRef.current) {
        clearTimeout(indicatorTimeoutRef.current)
      }
    }
  }, [isClimbingBuilding, showClimbingIndicator])

  // Show grapple indicator when canGrapple is true OR when actively grappling, and keep it visible for 3 seconds after it becomes false
  useEffect(() => {
    const isActivelyGrappling = grappledBuilding !== null
    const shouldShow = canGrapple || isActivelyGrappling
    
    if (shouldShow) {
      // Show indicator immediately when grapple becomes available or when actively grappling
      setShowGrappleIndicator(true)
      
      // Clear any existing timeout
      if (grappleIndicatorTimeoutRef.current) {
        clearTimeout(grappleIndicatorTimeoutRef.current)
        grappleIndicatorTimeoutRef.current = null
      }
    } else {
      // When grapple becomes unavailable, set a timer to hide the indicator after 3 seconds
      if (showGrappleIndicator && !grappleIndicatorTimeoutRef.current) {
        grappleIndicatorTimeoutRef.current = setTimeout(() => {
          setShowGrappleIndicator(false)
          grappleIndicatorTimeoutRef.current = null
        }, 3000) // 3 seconds
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (grappleIndicatorTimeoutRef.current) {
        clearTimeout(grappleIndicatorTimeoutRef.current)
      }
    }
  }, [canGrapple, grappledBuilding, showGrappleIndicator])

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
        defaultSize={{ width: 300, height: 160 }}
        minWidth={200}
        minHeight={160}
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
        <div className="bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-4 neon-border h-full flex flex-col justify-between">
          {/* Health Bar */}
          <div className="mb-3">
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
          <div className="mb-3">
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
          <div className="mb-3">
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

          {/* Loading Status Indicator */}
          {isLoading && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-cyan-500"></div>
                <span className="text-xs text-cyan-400">Loading...</span>
              </div>
              {chunkProgress.loadingChunks > 0 && (
                <div className="text-xs text-gray-400 mb-1">
                  Chunks: {chunkProgress.loadedChunks} loaded, {chunkProgress.loadingChunks} loading
                  {chunkProgress.currentChunk && (
                    <span className="text-cyan-300"> (Chunk {chunkProgress.currentChunk.x},{chunkProgress.currentChunk.z})</span>
                  )}
                </div>
              )}
              {assetProgress.percentage > 0 && assetProgress.percentage < 100 && (
                <div className="text-xs text-gray-400 mb-1">
                  Assets: {Math.round(assetProgress.percentage)}%
                  {assetProgress.currentAsset && (
                    <span className="text-cyan-300"> - {assetProgress.currentAsset}</span>
                  )}
                </div>
              )}
              <div className="w-full bg-gray-800 rounded-full h-1 mt-1">
                <div
                  className="bg-cyan-500 h-1 rounded-full transition-all"
                  style={{ 
                    width: `${Math.max(chunkProgress.percentage, assetProgress.percentage)}%`,
                    boxShadow: '0 0 8px rgba(0, 255, 255, 0.5)'
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </DraggableResizable>

      {/* Top Right - Quest & Battle Pass Buttons (Draggable/Resizable) */}
      <DraggableResizable
        id="top-right-buttons"
        storageKey="topRightButtons"
        defaultPosition={{ x: typeof window !== 'undefined' ? window.innerWidth - 700 : 200, y: 16 }}
        defaultSize={{ width: 680, height: 60 }}
        minWidth={500}
        minHeight={60}
        resizable={false}
        className="pointer-events-auto"
      >
        <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-3 neon-border flex items-center overflow-hidden" style={{ zIndex: 5, pointerEvents: 'none' }}>
          <div className="flex gap-2.5 items-center w-full flex-nowrap overflow-x-auto" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 15 }}>
            <button
              onClick={toggleQuest}
              onMouseDown={(e) => e.stopPropagation()}
              title="Quests"
              className={`bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isQuestOpen
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                  : 'border-cyan-500 text-cyan-400 hover:bg-gray-800'
              } neon-border`}
              style={{
                boxShadow: isQuestOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isQuestOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isQuestOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              📜
            </button>
            <button
              onClick={toggleBattlePass}
              onMouseDown={(e) => e.stopPropagation()}
              title="Battle Pass"
              className={`bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isBattlePassOpen
                  ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                  : 'border-purple-500 text-purple-400 hover:bg-gray-800'
              } neon-border`}
              style={{
                boxShadow: isBattlePassOpen 
                  ? '0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isBattlePassOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.6), 0 0 30px rgba(168, 85, 247, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isBattlePassOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              🎁
            </button>
            <button
              onClick={toggleAchievement}
              onMouseDown={(e) => e.stopPropagation()}
              title="Achievements"
              className={`bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isAchievementOpen
                  ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                  : 'border-yellow-500 text-yellow-400 hover:bg-gray-800'
              } neon-border`}
              style={{
                boxShadow: isAchievementOpen 
                  ? '0 0 20px rgba(234, 179, 8, 0.8), 0 0 40px rgba(234, 179, 8, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isAchievementOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(234, 179, 8, 0.6), 0 0 30px rgba(234, 179, 8, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isAchievementOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              🏆
            </button>
            <button
              onClick={toggleShop}
              onMouseDown={(e) => e.stopPropagation()}
              title="Shop"
              className={`bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isShopOpen
                  ? 'border-yellow-500 bg-yellow-500/20 text-yellow-400'
                  : 'border-yellow-500 text-yellow-400 hover:bg-gray-800'
              } neon-border`}
              style={{
                boxShadow: isShopOpen 
                  ? '0 0 20px rgba(234, 179, 8, 0.8), 0 0 40px rgba(234, 179, 8, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isShopOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(234, 179, 8, 0.6), 0 0 30px rgba(234, 179, 8, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isShopOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              🛍️
            </button>
            <button
              onClick={toggleSkills}
              onMouseDown={(e) => e.stopPropagation()}
              title="Skills"
              className={`bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isSkillsOpen
                  ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                  : 'border-purple-500 text-purple-400 hover:bg-gray-800'
              } neon-border`}
              style={{
                boxShadow: isSkillsOpen 
                  ? '0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSkillsOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(168, 85, 247, 0.6), 0 0 30px rgba(168, 85, 247, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSkillsOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              ⭐
            </button>
            <div className="ml-auto bg-gray-900/90 backdrop-blur-sm border-2 border-yellow-500 rounded-lg px-4 py-2 neon-border flex-shrink-0">
              <div className="text-yellow-400 font-bold whitespace-nowrap">💰 {player.credits}</div>
            </div>
          </div>
        </div>
      </DraggableResizable>

      {/* Bottom Bar - Action Buttons (Draggable/Resizable) */}
      <DraggableResizable
        id="action-buttons"
        storageKey="actionButtons"
        defaultPosition={{ 
          x: typeof window !== 'undefined' ? (window.innerWidth - 700) / 2 : 200, 
          y: typeof window !== 'undefined' ? window.innerHeight - 80 : 400 
        }}
        defaultSize={{ width: 700, height: 70 }}
        minWidth={600}
        minHeight={70}
        resizable={false}
        className="pointer-events-auto"
      >
        <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-3 neon-border flex items-center justify-center overflow-hidden" style={{ zIndex: 5, pointerEvents: 'none' }}>
          <div className="flex justify-center gap-2.5 flex-nowrap items-center w-full overflow-x-auto" style={{ pointerEvents: 'auto', position: 'relative', zIndex: 15 }}>
            <button
              onClick={toggleInventory}
              onMouseDown={(e) => e.stopPropagation()}
              title="Inventory"
              className={`p-2.5 rounded-lg text-lg transition-all flex-shrink-0 ${
                isInventoryOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              style={{
                boxShadow: isInventoryOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isInventoryOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isInventoryOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              📦
            </button>
            <button
              onClick={toggleCrafting}
              onMouseDown={(e) => e.stopPropagation()}
              title="Crafting"
              className={`p-2.5 rounded-lg text-lg transition-all flex-shrink-0 ${
                isCraftingOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              style={{
                boxShadow: isCraftingOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isCraftingOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isCraftingOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              🔨
            </button>
            <button
              onClick={toggleMarket}
              onMouseDown={(e) => e.stopPropagation()}
              title="Market"
              className={`p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isMarketOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              style={{
                boxShadow: isMarketOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isMarketOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isMarketOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              💰
            </button>
            <button
              onClick={toggleSpellbook}
              onMouseDown={(e) => e.stopPropagation()}
              title="Spellbook"
              className={`p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isSpellbookOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              style={{
                boxShadow: isSpellbookOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSpellbookOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSpellbookOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              📖
            </button>
            <button
              onClick={toggleGuild}
              onMouseDown={(e) => e.stopPropagation()}
              title="Guild"
              className={`p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isGuildOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              style={{
                boxShadow: isGuildOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isGuildOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isGuildOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              👥
            </button>
            <button
              onClick={toggleMinimap}
              onMouseDown={(e) => e.stopPropagation()}
              title="Minimap"
              className={`p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isMinimapOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              style={{
                boxShadow: isMinimapOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isMinimapOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isMinimapOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              🗺️
            </button>
            <button
              onClick={toggleHousing}
              onMouseDown={(e) => e.stopPropagation()}
              title="Housing"
              className={`p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isHousingOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              style={{
                boxShadow: isHousingOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isHousingOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isHousingOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              🏠
            </button>
            <button
              onClick={toggleSocial}
              onMouseDown={(e) => e.stopPropagation()}
              title="Social"
              className={`p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isSocialOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              style={{
                boxShadow: isSocialOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSocialOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSocialOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              👥
            </button>
            <button
              onClick={toggleSettings}
              onMouseDown={(e) => e.stopPropagation()}
              title="Settings"
              className={`p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center ${
                isSettingsOpen
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
              style={{
                boxShadow: isSettingsOpen 
                  ? '0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)' 
                  : 'none',
                transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!isSettingsOpen) {
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSettingsOpen) {
                  e.currentTarget.style.boxShadow = 'none'
                }
              }}
            >
              ⚙️
            </button>
          </div>
        </div>
      </DraggableResizable>

      {/* Stamina Bar - Top Right */}
      <div className="absolute top-20 right-4 pointer-events-auto">
        <div className="bg-gray-900/90 backdrop-blur-sm border-2 border-yellow-500 rounded-lg p-2 neon-border">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm font-bold">⚡</span>
            <div className="w-32">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Stamina</span>
                <span>{Math.round(stamina)}/{maxStamina}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stamina < 20 ? 'bg-red-500' : stamina < 50 ? 'bg-yellow-500' : 'bg-yellow-400'
                  }`}
                  style={{
                    width: `${(stamina / maxStamina) * 100}%`,
                    boxShadow: stamina < 20 ? '0 0 10px #ff0000' : '0 0 10px #ffd700'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Small indicators below stamina box */}
        <div className="mt-2 space-y-1">
          {/* Building Jump Indicator - Small and concise */}
          {showClimbingIndicator && (
            <div className="bg-gray-900/90 backdrop-blur-sm border border-orange-500 rounded px-2 py-1 neon-border">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">🏢</span>
                <span className="text-orange-400 text-xs font-semibold">Climbing</span>
              </div>
            </div>
          )}

          {/* Grapple Indicator - Small and concise */}
          {showGrappleIndicator && (
            <div 
              className={`bg-gray-900/90 backdrop-blur-sm border rounded px-2 py-1 neon-border ${
                grappledBuilding 
                  ? 'border-orange-500 animate-pulse' 
                  : 'border-cyan-500'
              }`}
              style={{
                boxShadow: grappledBuilding 
                  ? '0 0 15px rgba(255, 165, 0, 0.8), 0 0 30px rgba(255, 165, 0, 0.4)' 
                  : '0 0 10px rgba(0, 255, 255, 0.5)'
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{grappledBuilding ? '⚡' : '🎯'}</span>
                <span className={`text-xs font-semibold ${
                  grappledBuilding ? 'text-orange-400' : 'text-cyan-400'
                }`}>
                  {grappledBuilding ? 'Grappling' : 'Grapple'}
                </span>
                {grappledBuilding && player && (
                  <div className="ml-1 w-8 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 transition-all"
                      style={{
                        width: `${Math.min(100, (grappledBuilding.position.y / 50) * 100)}%`,
                        boxShadow: '0 0 5px rgba(255, 165, 0, 0.8)'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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

