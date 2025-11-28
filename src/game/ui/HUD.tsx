import { useState, useEffect, useRef, lazy, Suspense, useMemo, useCallback, memo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { RACES } from '../data/races'
import DraggableResizable from '../components/DraggableResizable'
import { useTranslation } from '../hooks/useTranslation'
import { isMobileDevice } from '../utils/mobileOptimizations'

// Lazy load modals for code splitting
const QualitySettingsModal = lazy(() => import('../components/QualitySettingsModal'))
const SkillsModal = lazy(() => import('./SkillsModal'))

// Memoized HUD Button Component
interface HUDButtonProps {
  onClick: () => void
  isOpen: boolean
  title: string
  icon: string
  className?: string
  activeClassName?: string
  inactiveClassName?: string
  activeBoxShadow?: string
  hoverBoxShadow?: string
}

const HUDButton = memo(function HUDButton({
  onClick,
  isOpen,
  title,
  icon,
  className = '',
  activeClassName = '',
  inactiveClassName = '',
  activeBoxShadow = '',
  hoverBoxShadow = ''
}: HUDButtonProps) {
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      e.currentTarget.style.boxShadow = hoverBoxShadow
    }
  }, [isOpen, hoverBoxShadow])

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      e.currentTarget.style.boxShadow = 'none'
    }
  }, [isOpen])

  const buttonStyle = useMemo(() => ({
    boxShadow: isOpen ? activeBoxShadow : 'none',
    transition: 'box-shadow 0.3s ease, background-color 0.3s ease'
  }), [isOpen, activeBoxShadow])

  return (
    <button
      onClick={onClick}
      onMouseDown={handleMouseDown}
      title={title}
      className={`${className} ${isOpen ? activeClassName : inactiveClassName}`}
      style={buttonStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {icon}
    </button>
  )
})

// Memoized Stat Bar Component
interface StatBarProps {
  label: string
  current: number
  max: number
  percent: number
  barColor: string
  glowColor: string
}

const StatBar = memo(function StatBar({ label, current, max, percent, barColor, glowColor }: StatBarProps) {
  const barStyle = useMemo(() => ({
    width: `${percent}%`,
    boxShadow: `0 0 10px ${glowColor}`
  }), [percent, glowColor])

  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>{label}</span>
        <span>{current}/{max}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all neon-glow`}
          style={barStyle}
        />
      </div>
    </div>
  )
})

// Memoized Player Stats Header Component
interface PlayerStatsHeaderProps {
  player: { name: string; race: string; level: number; guildTag?: string }
  t: (key: string) => string
}

const PlayerStatsHeader = memo(function PlayerStatsHeader({ player, t }: PlayerStatsHeaderProps) {
  const raceData = useMemo(() => RACES[player.race as keyof typeof RACES] || RACES.human, [player.race])
  const raceColorStyle = useMemo(() => ({ backgroundColor: raceData.color }), [raceData.color])

  return (
    <div className="flex items-center justify-between p-2 bg-gray-900/90 border-b border-cyan-500">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full" style={raceColorStyle} />
        <span className="text-cyan-300 font-bold">{player.name}</span>
        {player.guildTag && (
          <span className="text-purple-400 text-sm">[{player.guildTag}]</span>
        )}
      </div>
      <div className="text-cyan-400 text-sm">{t('characterSelection.levelShort')} {player.level}</div>
    </div>
  )
})

function HUD() {
  const { t } = useTranslation()
  
  // Use selective subscriptions to reduce re-renders
  const player = useGameStore((state) => state.player)
  const isInventoryOpen = useGameStore((state) => state.isInventoryOpen)
  const isCraftingOpen = useGameStore((state) => state.isCraftingOpen)
  const isMarketOpen = useGameStore((state) => state.isMarketOpen)
  const isSpellbookOpen = useGameStore((state) => state.isSpellbookOpen)
  const isGuildOpen = useGameStore((state) => state.isGuildOpen)
  const isQuestOpen = useGameStore((state) => state.isQuestOpen)
  const isBattlePassOpen = useGameStore((state) => state.isBattlePassOpen)
  const isAchievementOpen = useGameStore((state) => state.isAchievementOpen)
  const isShopOpen = useGameStore((state) => state.isShopOpen)
  const isSkillsOpen = useGameStore((state) => state.isSkillsOpen)
  const isSettingsOpen = useGameStore((state) => state.isSettingsOpen)
  const isClimbingBuilding = useGameStore((state) => state.isClimbingBuilding)
  const isWallRunning = useGameStore((state) => state.isWallRunning)
  const grappledBuilding = useGameStore((state) => state.grappledBuilding)
  const stamina = useGameStore((state) => state.stamina)
  const maxStamina = useGameStore((state) => state.maxStamina)
  const isHousingOpen = useGameStore((state) => state.isHousingOpen)
  const isSocialOpen = useGameStore((state) => state.isSocialOpen)
  const isMinimapOpen = useGameStore((state) => state.isMinimapOpen)
  
  // Memoize toggle functions
  const toggleInventory = useGameStore((state) => state.toggleInventory)
  const toggleCrafting = useGameStore((state) => state.toggleCrafting)
  const toggleMarket = useGameStore((state) => state.toggleMarket)
  const toggleSpellbook = useGameStore((state) => state.toggleSpellbook)
  const toggleGuild = useGameStore((state) => state.toggleGuild)
  const toggleQuest = useGameStore((state) => state.toggleQuest)
  const toggleBattlePass = useGameStore((state) => state.toggleBattlePass)
  const toggleAchievement = useGameStore((state) => state.toggleAchievement)
  const toggleShop = useGameStore((state) => state.toggleShop)
  const toggleSkills = useGameStore((state) => state.toggleSkills)
  const toggleSettings = useGameStore((state) => state.toggleSettings)
  const toggleHousing = useGameStore((state) => state.toggleHousing)
  const toggleSocial = useGameStore((state) => state.toggleSocial)
  const toggleMinimap = useGameStore((state) => state.toggleMinimap)
  
  const [isQualitySettingsOpen, setIsQualitySettingsOpen] = useState(false)
  const [showClimbingIndicator, setShowClimbingIndicator] = useState(false)
  const indicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [chunkProgress] = useState({ loadedChunks: 0, loadingChunks: 0, percentage: 0, currentChunk: null as { x: number; z: number } | null })
  const [assetProgress] = useState({ percentage: 0, currentAsset: '' })
  const [isLoading] = useState(false)
  
  // HUD auto-hide during movement
  const isPlayerMoving = useGameStore((s) => s.isPlayerMoving)
  const [hudOpacity, setHudOpacity] = useState(1)
  const [showHudBars, setShowHudBars] = useState(true)
  const lastHealthRef = useRef(player?.health || 0)
  const lastManaRef = useRef(player?.mana || 0)
  const hudHideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
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

  // Auto-hide HUD bars during movement
  useEffect(() => {
    // Check for health/mana changes (show bars on damage/mana use)
    if (player) {
      const healthChanged = Math.abs((player.health || 0) - lastHealthRef.current) > 1
      const manaChanged = Math.abs((player.mana || 0) - lastManaRef.current) > 1
      
      if (healthChanged || manaChanged) {
        // Show bars immediately on change
        setShowHudBars(true)
        setHudOpacity(1)
        if (hudHideTimeoutRef.current) {
          clearTimeout(hudHideTimeoutRef.current)
          hudHideTimeoutRef.current = null
        }
      }
      
      lastHealthRef.current = player.health || 0
      lastManaRef.current = player.mana || 0
    }

    if (isPlayerMoving) {
      // Start fade out after 2 seconds of movement
      if (hudHideTimeoutRef.current) {
        clearTimeout(hudHideTimeoutRef.current)
      }
      hudHideTimeoutRef.current = setTimeout(() => {
        setHudOpacity(0.2) // Fade to 20% opacity
        setShowHudBars(false) // Hide bars but keep container for smooth transition
      }, 2000)
    } else {
      // Show bars immediately when movement stops
      setShowHudBars(true)
      setHudOpacity(1)
      if (hudHideTimeoutRef.current) {
        clearTimeout(hudHideTimeoutRef.current)
        hudHideTimeoutRef.current = null
      }
    }

    return () => {
      if (hudHideTimeoutRef.current) {
        clearTimeout(hudHideTimeoutRef.current)
      }
    }
  }, [isPlayerMoving, player])


  if (!player) return null

  // Mobile detection and responsive scaling - memoized
  const isMobile = useMemo(() => isMobileDevice(), [])
  const screenDimensions = useMemo(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080
  }), [])

  // Mobile-specific sizing - memoized
  const playerStatsWidth = useMemo(() => 
    isMobile ? Math.min(screenDimensions.width * 0.9, 300) : 300,
    [isMobile, screenDimensions.width]
  )
  const playerStatsHeight = useMemo(() => isMobile ? 140 : 160, [isMobile])
  const topRightButtonsWidth = useMemo(() => 
    isMobile ? Math.min(screenDimensions.width * 0.9, 400) : 680,
    [isMobile, screenDimensions.width]
  )
  const topRightButtonsHeight = useMemo(() => isMobile ? 50 : 60, [isMobile])
  const actionButtonsWidth = useMemo(() => 
    isMobile ? Math.min(screenDimensions.width * 0.95, screenDimensions.width - 16) : 700,
    [isMobile, screenDimensions.width]
  )
  const actionButtonsHeight = useMemo(() => isMobile ? 60 : 70, [isMobile])

  // Mobile-specific positioning - memoized
  const playerStatsPosition = useMemo(() => 
    isMobile ? { x: 8, y: 8 } : { x: 16, y: 16 },
    [isMobile]
  )
  const topRightButtonsPosition = useMemo(() => 
    isMobile
      ? { x: screenDimensions.width - topRightButtonsWidth - 8, y: 8 }
      : { x: screenDimensions.width - 680, y: 16 },
    [isMobile, screenDimensions.width, topRightButtonsWidth]
  )
  const actionButtonsPosition = useMemo(() => 
    isMobile
      ? { x: (screenDimensions.width - actionButtonsWidth) / 2, y: screenDimensions.height - actionButtonsHeight - 8 }
      : { x: (screenDimensions.width - 700) / 2, y: screenDimensions.height - 80 },
    [isMobile, screenDimensions.width, screenDimensions.height, actionButtonsWidth, actionButtonsHeight]
  )

  // Memoize computed values
  const healthPercent = useMemo(() => 
    player.maxHealth > 0 ? (player.health / player.maxHealth) * 100 : 0,
    [player.health, player.maxHealth]
  )
  const manaPercent = useMemo(() => 
    player.maxMana > 0 ? (player.mana / player.maxMana) * 100 : 0,
    [player.mana, player.maxMana]
  )
  const xpPercent = useMemo(() => 
    player.xpToNext > 0 ? (player.xp / player.xpToNext) * 100 : 0,
    [player.xp, player.xpToNext]
  )
  const staminaPercent = useMemo(() => 
    maxStamina > 0 ? (stamina / maxStamina) * 100 : 0,
    [stamina, maxStamina]
  )

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      {/* Top Left - Player Info (Draggable/Resizable) */}
      <DraggableResizable
        id="player-stats"
        storageKey="playerStats"
        defaultPosition={playerStatsPosition}
        defaultSize={{ width: playerStatsWidth, height: playerStatsHeight }}
        minWidth={isMobile ? 200 : 200}
        minHeight={isMobile ? 140 : 160}
        maxWidth={isMobile ? playerStatsWidth : 400}
        draggable={true}
        resizable={!isMobile}
        className="pointer-events-auto"
        header={<PlayerStatsHeader player={player} t={t} />}
      >
        <div 
          className="bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-4 neon-border h-full flex flex-col justify-between" 
          style={useMemo(() => ({ opacity: hudOpacity, transition: 'opacity 0.3s ease-in-out' }), [hudOpacity])}
        >
          {/* Health Bar */}
          {showHudBars && (
            <StatBar
              label={t('common.health')}
              current={player.health}
              max={player.maxHealth}
              percent={healthPercent}
              barColor="bg-red-500"
              glowColor="#ff0000"
            />
          )}

          {/* Mana Bar */}
          {showHudBars && (
            <StatBar
              label={t('common.mana')}
              current={player.mana}
              max={player.maxMana}
              percent={manaPercent}
              barColor="bg-blue-500"
              glowColor="#0099ff"
            />
          )}

          {/* XP Bar - Always visible but faded during movement */}
          <div className="mb-3" style={useMemo(() => ({ opacity: showHudBars ? 1 : 0.3 }), [showHudBars])}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{t('common.xp')}</span>
              <span>{player.xp}/{player.xpToNext}</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div
                className="bg-cyan-500 h-1.5 rounded-full transition-all"
                style={useMemo(() => ({ width: `${xpPercent}%` }), [xpPercent])}
              />
            </div>
          </div>

          {/* Status Indicators - Only show active movement states (grappling, wall-running) */}
          <div className="mt-2 pt-2 border-t border-gray-700 space-y-1">
            {/* Wall-Running Indicator */}
            {isWallRunning && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-purple-400">🧱</span>
                <span className="text-purple-400 font-semibold">Wall-Running</span>
              </div>
            )}
            
            {/* Grapple Indicator */}
            {grappledBuilding && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-cyan-400">🎯</span>
                <span className="text-cyan-400 font-semibold">Grappling</span>
              </div>
            )}
            
            {/* Climb Indicator */}
            {isClimbingBuilding && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-orange-400">🏢</span>
                <span className="text-orange-400 font-semibold">Climbing</span>
              </div>
            )}
          </div>

          {/* Loading Status Indicator */}
          {isLoading && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-cyan-500"></div>
                <span className="text-xs text-cyan-400">{t('system.loading')}</span>
              </div>
              {chunkProgress.loadingChunks > 0 && (
                <div className="text-xs text-gray-400 mb-1">
                  {t('hud.chunks', { loaded: chunkProgress.loadedChunks, loading: chunkProgress.loadingChunks })}
                  {chunkProgress.currentChunk && (
                    <span className="text-cyan-300"> ({t('hud.currentChunk', { x: chunkProgress.currentChunk.x, z: chunkProgress.currentChunk.z })})</span>
                  )}
                </div>
              )}
              {assetProgress.percentage > 0 && assetProgress.percentage < 100 && (
                <div className="text-xs text-gray-400 mb-1">
                  {t('hud.assets', { percentage: Math.round(assetProgress.percentage) })}
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
        defaultPosition={topRightButtonsPosition}
        defaultSize={{ width: topRightButtonsWidth, height: topRightButtonsHeight }}
        minWidth={isMobile ? Math.min(screenDimensions.width * 0.8, 300) : 500}
        minHeight={isMobile ? 50 : 60}
        resizable={false}
        draggable={true}
        className="pointer-events-auto"
      >
        <div 
          className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-3 neon-border flex items-center overflow-hidden" 
          style={useMemo(() => ({ zIndex: 5, pointerEvents: 'none' }), [])}
        >
          <div 
            className="flex gap-2.5 items-center w-full flex-nowrap overflow-x-auto" 
            style={useMemo(() => ({ pointerEvents: 'auto', position: 'relative', zIndex: 15 }), [])}
          >
            <HUDButton
              onClick={toggleQuest}
              isOpen={isQuestOpen}
              title={t('common.quests')}
              icon="📜"
              className="bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center neon-border"
              activeClassName="border-cyan-500 bg-cyan-500/20 text-cyan-400"
              inactiveClassName="border-cyan-500 text-cyan-400 hover:bg-gray-800"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
            <HUDButton
              onClick={toggleBattlePass}
              isOpen={isBattlePassOpen}
              title={t('common.battlePass')}
              icon="🎁"
              className="bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center neon-border"
              activeClassName="border-purple-500 bg-purple-500/20 text-purple-400"
              inactiveClassName="border-purple-500 text-purple-400 hover:bg-gray-800"
              activeBoxShadow="0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.4)"
              hoverBoxShadow="0 0 15px rgba(168, 85, 247, 0.6), 0 0 30px rgba(168, 85, 247, 0.3)"
            />
            <HUDButton
              onClick={toggleAchievement}
              isOpen={isAchievementOpen}
              title={t('common.achievements')}
              icon="🏆"
              className="bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center neon-border"
              activeClassName="border-yellow-500 bg-yellow-500/20 text-yellow-400"
              inactiveClassName="border-yellow-500 text-yellow-400 hover:bg-gray-800"
              activeBoxShadow="0 0 20px rgba(234, 179, 8, 0.8), 0 0 40px rgba(234, 179, 8, 0.4)"
              hoverBoxShadow="0 0 15px rgba(234, 179, 8, 0.6), 0 0 30px rgba(234, 179, 8, 0.3)"
            />
            <HUDButton
              onClick={toggleShop}
              isOpen={isShopOpen}
              title={t('common.shop')}
              icon="🛍️"
              className="bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center neon-border"
              activeClassName="border-yellow-500 bg-yellow-500/20 text-yellow-400"
              inactiveClassName="border-yellow-500 text-yellow-400 hover:bg-gray-800"
              activeBoxShadow="0 0 20px rgba(234, 179, 8, 0.8), 0 0 40px rgba(234, 179, 8, 0.4)"
              hoverBoxShadow="0 0 15px rgba(234, 179, 8, 0.6), 0 0 30px rgba(234, 179, 8, 0.3)"
            />
            <HUDButton
              onClick={toggleSkills}
              isOpen={isSkillsOpen}
              title={t('common.skills')}
              icon="⭐"
              className="bg-gray-900/90 border-2 rounded-lg p-2.5 text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center neon-border"
              activeClassName="border-purple-500 bg-purple-500/20 text-purple-400"
              inactiveClassName="border-purple-500 text-purple-400 hover:bg-gray-800"
              activeBoxShadow="0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.4)"
              hoverBoxShadow="0 0 15px rgba(168, 85, 247, 0.6), 0 0 30px rgba(168, 85, 247, 0.3)"
            />
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
        defaultPosition={actionButtonsPosition}
        defaultSize={{ width: actionButtonsWidth, height: actionButtonsHeight }}
        minWidth={isMobile ? Math.min(screenDimensions.width * 0.9, screenDimensions.width - 16) : 600}
        minHeight={isMobile ? 60 : 70}
        resizable={false}
        draggable={true}
        className="pointer-events-auto"
      >
        <div 
          className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-3 neon-border flex items-center justify-center overflow-hidden" 
          style={useMemo(() => ({ zIndex: 5, pointerEvents: 'none' }), [])}
        >
          <div 
            className="flex justify-center gap-2.5 flex-nowrap items-center w-full overflow-x-auto" 
            style={useMemo(() => ({ pointerEvents: 'auto', position: 'relative', zIndex: 15 }), [])}
          >
            <HUDButton
              onClick={toggleInventory}
              isOpen={isInventoryOpen}
              title={t('common.inventory')}
              icon="📦"
              className="p-2.5 rounded-lg text-lg transition-all flex-shrink-0"
              activeClassName="bg-cyan-600 text-white"
              inactiveClassName="bg-gray-800 text-cyan-400 hover:bg-gray-700"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
            <HUDButton
              onClick={toggleCrafting}
              isOpen={isCraftingOpen}
              title={t('common.crafting')}
              icon="🔨"
              className="p-2.5 rounded-lg text-lg transition-all flex-shrink-0"
              activeClassName="bg-cyan-600 text-white"
              inactiveClassName="bg-gray-800 text-cyan-400 hover:bg-gray-700"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
            <HUDButton
              onClick={toggleMarket}
              isOpen={isMarketOpen}
              title={t('common.market')}
              icon="💰"
              className="p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center"
              activeClassName="bg-cyan-600 text-white"
              inactiveClassName="bg-gray-800 text-cyan-400 hover:bg-gray-700"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
            <HUDButton
              onClick={toggleSpellbook}
              isOpen={isSpellbookOpen}
              title={t('common.spellbook')}
              icon="📖"
              className="p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center"
              activeClassName="bg-cyan-600 text-white"
              inactiveClassName="bg-gray-800 text-cyan-400 hover:bg-gray-700"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
            <HUDButton
              onClick={toggleGuild}
              isOpen={isGuildOpen}
              title={t('common.guild')}
              icon="👥"
              className="p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center"
              activeClassName="bg-cyan-600 text-white"
              inactiveClassName="bg-gray-800 text-cyan-400 hover:bg-gray-700"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
            <HUDButton
              onClick={toggleMinimap}
              isOpen={isMinimapOpen}
              title={t('common.minimap')}
              icon="🗺️"
              className="p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center"
              activeClassName="bg-cyan-600 text-white"
              inactiveClassName="bg-gray-800 text-cyan-400 hover:bg-gray-700"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
            <HUDButton
              onClick={toggleHousing}
              isOpen={isHousingOpen}
              title={t('common.housing')}
              icon="🏠"
              className="p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center"
              activeClassName="bg-cyan-600 text-white"
              inactiveClassName="bg-gray-800 text-cyan-400 hover:bg-gray-700"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
            <HUDButton
              onClick={toggleSocial}
              isOpen={isSocialOpen}
              title={t('common.social')}
              icon="👥"
              className="p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center"
              activeClassName="bg-cyan-600 text-white"
              inactiveClassName="bg-gray-800 text-cyan-400 hover:bg-gray-700"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
            <HUDButton
              onClick={toggleSettings}
              isOpen={isSettingsOpen}
              title={t('common.settings')}
              icon="⚙️"
              className="p-2.5 rounded-lg text-lg transition-all flex-shrink-0 w-12 h-12 flex items-center justify-center"
              activeClassName="bg-cyan-600 text-white"
              inactiveClassName="bg-gray-800 text-cyan-400 hover:bg-gray-700"
              activeBoxShadow="0 0 20px rgba(6, 182, 212, 0.8), 0 0 40px rgba(6, 182, 212, 0.4)"
              hoverBoxShadow="0 0 15px rgba(6, 182, 212, 0.6), 0 0 30px rgba(6, 182, 212, 0.3)"
            />
          </div>
        </div>
      </DraggableResizable>

      {/* Stamina Bar - Top Right */}
      <div 
        className="absolute pointer-events-auto"
        style={useMemo(() => ({
          top: isMobile ? (playerStatsHeight + 16) : 80,
          right: isMobile ? 8 : 16,
          zIndex: 15
        }), [isMobile, playerStatsHeight])}
      >
        <div className="bg-gray-900/90 backdrop-blur-sm border-2 border-yellow-500 rounded-lg p-2 neon-border">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm font-bold">⚡</span>
            <div style={useMemo(() => ({ width: isMobile ? '80px' : '128px' }), [isMobile])}>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{t('common.stamina')}</span>
                <span>{Math.round(stamina)}/{maxStamina}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className={useMemo(() => 
                    `h-2 rounded-full transition-all ${
                      stamina < 20 ? 'bg-red-500' : stamina < 50 ? 'bg-yellow-500' : 'bg-yellow-400'
                    }`,
                    [stamina]
                  )}
                  style={useMemo(() => ({
                    width: `${staminaPercent}%`,
                    boxShadow: stamina < 20 ? '0 0 10px #ff0000' : '0 0 10px #ffd700'
                  }), [staminaPercent, stamina])}
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
                <span className="text-orange-400 text-xs font-semibold">{t('hud.climbing')}</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Quality Settings Modal */}
      <Suspense fallback={null}>
        <QualitySettingsModal
          isOpen={isQualitySettingsOpen}
          onClose={useCallback(() => setIsQualitySettingsOpen(false), [])}
        />
        
        {/* Skills Modal */}
        <SkillsModal />
      </Suspense>
    </div>
  )
}

export default memo(HUD)

