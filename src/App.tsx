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

  // Progressive loading with real asset tracking
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

    // Minimum display time for loading screen (1 second)
    const minDisplayTime = 1000
    const startTime = Date.now()

    const initializeLoading = async () => {
      try {
        // Small delay to ensure React has time to render the loading screen
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        
        const { progressiveLoader } = await import('./game/utils/progressiveLoader')
        const { loadingPhaseManager } = await import('./game/utils/loadingPhases')
        
        // Reset loading phases for new session
        loadingPhaseManager.reset()
        progressiveLoader.reset()
        
        // Define critical assets (player, UI, core textures)
        progressiveLoader.defineCriticalAssets([
          'player-model',
          'ui-texture',
          'core-terrain-texture',
          'core-skybox-texture'
        ])
        
        // Subscribe to loading phase progress updates
        const unsubscribePhase = loadingPhaseManager.subscribe((status) => {
          // Update progress based on overall phase progress
          // Phase 1 (0-50%), Phase 2 (50-85%), Phase 3 (85-100%)
          setLoadingProgress(status.overallProgress)
          
          // Allow entering world when Phase 1 is complete (50% progress)
          if (status.phase === 'phase2' || status.phase === 'phase3' || status.phase === 'complete') {
            // Phase 1 complete - can enter world
            const elapsed = Date.now() - startTime
            const remainingTime = Math.max(0, minDisplayTime - elapsed)
            
            setTimeout(() => {
              setIsLoading(false)
            }, remainingTime)
          }
        })
        
        // Also subscribe to progressive loader for additional progress details
        const unsubscribeLoader = progressiveLoader.subscribe(() => {
          // Use phase progress as primary, but this provides additional detail
          // The phase manager already handles overall progress calculation
          // This can be used for more granular progress if needed
        })
        
        // Start Phase 1 loading (Game component will trigger asset loading)
        console.log('App: Waiting for Game component to load Phase 1 assets')
        
        // Timeout fallback: ensure loading completes within 30 seconds
        const timeoutId = setTimeout(() => {
          console.warn('Loading timeout - completing anyway after 30 seconds')
          setLoadingProgress(100)
          setIsLoading(false)
          if (unsubscribePhase) unsubscribePhase()
          if (unsubscribeLoader) unsubscribeLoader()
        }, 30000)
        
        // Cleanup on unmount
        return () => {
          clearTimeout(timeoutId)
          if (unsubscribePhase) unsubscribePhase()
          if (unsubscribeLoader) unsubscribeLoader()
        }
      } catch (error) {
        console.error('Failed to initialize loading:', error)
        // Fallback: complete loading after minimum time
        const elapsed = Date.now() - startTime
        const remainingTime = Math.max(0, minDisplayTime - elapsed)
        setTimeout(() => {
          setLoadingProgress(100)
          setIsLoading(false)
        }, remainingTime)
      }
    }
    
    initializeLoading()
    
    // Cleanup function
    return () => {
      // Cleanup handled in initializeLoading
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

  // Show loading screen (but mount Game component in background to start loading assets)
  if (isLoading) {
    return (
      <ErrorBoundary>
        <LoadingScreen
          progress={loadingProgress}
          message="Loading NEX://VOID..."
        />
        {/* Mount Game component early but hidden - allows assets to load in background */}
        {player && isInitialized && (
          <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
            <Game />
          </div>
        )}
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

