import { useState, useEffect, useRef } from 'react'
import { useGameStore } from './game/store/useGameStore'
import { ErrorBoundary } from './game/utils/errorBoundary'
import LoginScreen from './game/ui/LoginScreen'
import CharacterCreation from './game/ui/CharacterCreation'
import CharacterSelection from './game/ui/CharacterSelection'
import HUD from './game/ui/HUD'
import { AuthUser } from './firebase/auth'
import EnhancedInventoryModal from './game/ui/EnhancedInventoryModal'
import CraftingModal from './game/ui/CraftingModal'
import MarketModal from './game/ui/MarketModal'
import SpellbookModal from './game/ui/SpellbookModal'
import GuildModal from './game/ui/GuildModal'
import QuestModal from './game/ui/QuestModal'
import TradeModal from './game/ui/TradeModal'
import BattlePassModal from './game/ui/BattlePassModal'
import AchievementModal from './game/ui/AchievementModal'
import CosmeticShop from './game/ui/CosmeticShop'
import Chat from './game/ui/Chat'
import KillFeed from './game/ui/KillFeed'
import ProximityVoice from './game/components/ProximityVoice'
import EmoteMenu from './game/ui/EmoteMenu'
import PerformanceMonitor from './game/components/PerformanceMonitor'
import SettingsModal from './game/ui/SettingsModal'
import TutorialModal from './game/ui/TutorialModal'
import Minimap from './game/ui/Minimap'
import HousingModal from './game/ui/HousingModal'
import SocialModal from './game/ui/SocialModal'
import DebugConsole from './game/ui/DebugConsole'
import AdminDashboard from './game/ui/AdminDashboard'
import PerformanceProfiler from './game/components/PerformanceProfiler'
import LoadingScreen from './game/components/LoadingScreen'
import ErrorReportingModal from './game/ui/ErrorReportingModal'
import PerformanceDashboard from './game/components/PerformanceDashboard'
import { mobilePersistence } from './game/utils/mobilePersistence'
// import { errorReporting } from './game/utils/errorReporting' // Available for future use
import Game from './game/Game'

function App() {
  const { player } = useGameStore()
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showCharacterSelection, setShowCharacterSelection] = useState(false)
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)
  const loadingStartedRef = useRef(false)

  // Initialize mobile persistence
  useEffect(() => {
    mobilePersistence.init()
    return () => {
      mobilePersistence.destroy()
    }
  }, [])

  // Progressive loading with critical assets first
  // Only run once after player is initialized
  useEffect(() => {
    // Don't start loading until player is initialized
    if (!isInitialized || !player || loadingStartedRef.current) {
      return
    }

    // Mark that we've started loading to prevent re-running
    loadingStartedRef.current = true
    console.log('App: Starting asset loading', { playerId: player.id })

    // Reset loading state when starting
    setIsLoading(true)
    setLoadingProgress(0)

    const loadCriticalAssets = async () => {
      try {
        const { progressiveLoader } = await import('./game/utils/progressiveLoader')
        
        // Define critical assets (player, UI, core textures)
        progressiveLoader.defineCriticalAssets([
          'player-model',
          'ui-texture',
          'core-terrain-texture',
          'core-skybox-texture'
        ])
        
        // Check if there are any assets to load
        const initialProgress = progressiveLoader.getProgress()
        if (initialProgress.total === 0) {
          // No assets to load, complete immediately
          console.log('No assets to load, completing immediately')
          setLoadingProgress(100)
          setTimeout(() => setIsLoading(false), 300)
          return
        }
        
        let loadingCompleted = false
        
        // Load critical assets first
        await progressiveLoader.loadAll((progress) => {
          setLoadingProgress(Math.min(progress.percentage, 100))
          // Complete loading if critical assets are loaded
          if (progress.criticalLoaded && progress.percentage >= 100) {
            if (!loadingCompleted) {
              loadingCompleted = true
              console.log('Loading completed via progress callback')
              setIsLoading(false)
            }
          }
        })
        
        // Fallback: check progress after loading completes
        if (!loadingCompleted) {
          const progress = progressiveLoader.getProgress()
          console.log('Loading finished, final progress:', progress)
          // Complete loading regardless
          setLoadingProgress(100)
          setTimeout(() => setIsLoading(false), 300)
        }
      } catch (error) {
        console.error('Failed to load critical assets:', error)
        // Fallback to simple progress - complete loading anyway
        setLoadingProgress(100)
        setTimeout(() => setIsLoading(false), 300)
      }
    }
    
    // Timeout fallback: ensure loading completes within 3 seconds
    const timeoutId = setTimeout(() => {
      console.warn('Loading timeout - completing anyway')
      setLoadingProgress(100)
      setIsLoading(false)
    }, 3000)
    
    loadCriticalAssets().finally(() => {
      clearTimeout(timeoutId)
    })
    
    return () => {
      clearTimeout(timeoutId)
    }
  }, [isInitialized, player?.id]) // Only depend on player.id, not the whole player object

  // Reset loading ref when user logs out
  useEffect(() => {
    if (!authenticatedUser) {
      loadingStartedRef.current = false
    }
  }, [authenticatedUser])

  // Log state changes
  useEffect(() => {
    console.log('App: State changed', { 
      hasAuthUser: !!authenticatedUser,
      hasPlayer: !!player, 
      isInitialized,
      playerId: player?.id,
      playerName: player?.name 
    })
  }, [player?.id, player?.name, isInitialized, authenticatedUser])

  // Initialize character selection state
  useEffect(() => {
    if (authenticatedUser && !player && !isInitialized && !showCharacterSelection && !showCharacterCreation) {
      setShowCharacterSelection(true)
    }
  }, [authenticatedUser, player, isInitialized, showCharacterSelection, showCharacterCreation])

  // Show login screen if not authenticated
  if (!authenticatedUser) {
    return (
      <ErrorBoundary>
        <LoginScreen onAuthSuccess={(user) => {
          console.log('App: User authenticated', { uid: user.uid, email: user.email })
          setAuthenticatedUser(user)
          // Store Firebase UID in game store for later use
          useGameStore.setState({ firebaseUid: user.uid })
        }} />
      </ErrorBoundary>
    )
  }

  // Show character selection or creation if player not initialized (but user is authenticated)
  if (!player || !isInitialized) {
    if (showCharacterSelection) {
      return (
        <ErrorBoundary>
          <CharacterSelection
            firebaseUid={authenticatedUser.uid}
            onSelectCharacter={(characterId) => {
              console.log('App: Character selected', { characterId })
              // Character data is already loaded and player is set in CharacterSelection
              setIsInitialized(true)
              setShowCharacterSelection(false)
            }}
            onCreateNew={() => {
              console.log('App: Create new character')
              setShowCharacterSelection(false)
              setShowCharacterCreation(true)
            }}
          />
        </ErrorBoundary>
      )
    }

    if (showCharacterCreation) {
      console.log('App: Showing CharacterCreation', { hasPlayer: !!player, isInitialized, uid: authenticatedUser.uid })
      return (
        <ErrorBoundary>
          <CharacterCreation 
            firebaseUid={authenticatedUser.uid}
            onComplete={() => {
              console.log('App: CharacterCreation onComplete called')
              setIsInitialized(true)
              setShowCharacterCreation(false)
              // Double-check player is set
              const currentPlayer = useGameStore.getState().player
              console.log('App: Player after onComplete', { hasPlayer: !!currentPlayer, playerId: currentPlayer?.id })
            }} 
          />
        </ErrorBoundary>
      )
    }

    // Fallback: show loading while determining state
    return (
      <ErrorBoundary>
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-orange-500">Loading...</p>
          </div>
        </div>
      </ErrorBoundary>
    )
  }

  // Show loading screen
  if (isLoading) {
    return (
      <ErrorBoundary>
        <LoadingScreen
          progress={loadingProgress}
          message="Loading NEX://VOID..."
        />
      </ErrorBoundary>
    )
  }

  // Show main game with HUD and modals
  return (
    <ErrorBoundary>
      <Game />
      <HUD />
      <EnhancedInventoryModal />
      <CraftingModal />
      <MarketModal />
      <SpellbookModal />
      <GuildModal />
      <QuestModal />
      <TradeModal />
      <BattlePassModal />
      <AchievementModal />
      <CosmeticShop />
      <Chat />
      <KillFeed />
      <ProximityVoice />
      <EmoteMenu />
      <PerformanceMonitor />
      <SettingsModal />
      <TutorialModal />
      <Minimap />
      <HousingModal />
      <SocialModal />
      <DebugConsole />
      <AdminDashboard />
      <PerformanceProfiler />
      <ErrorReportingModal />
      <PerformanceDashboard />
    </ErrorBoundary>
  )
}

export default App

