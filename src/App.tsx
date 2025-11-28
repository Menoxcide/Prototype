import { useState, useEffect, useRef, Suspense } from 'react'
import { useGameStore } from './game/store/useGameStore'
import { ErrorBoundary } from './game/utils/errorBoundary'
import LoginScreen from './game/ui/LoginScreen'
import CharacterCreation from './game/ui/CharacterCreation'
import CharacterSelection from './game/ui/CharacterSelection'
import HUD from './game/ui/HUD'
import { AuthUser } from './firebase/auth'
import Chat from './game/ui/Chat'
import KillFeed from './game/ui/KillFeed'
import ProximityVoice from './game/components/ProximityVoice'
import EmoteMenu from './game/ui/EmoteMenu'
import PerformanceMonitor from './game/components/PerformanceMonitor'
import Minimap from './game/ui/Minimap'
import DebugConsole from './game/ui/DebugConsole'
import LoadingScreen from './game/components/LoadingScreen'
import PerformanceDashboard from './game/components/PerformanceDashboard'
import { lazyWithErrorHandling } from './game/utils/lazyWithErrorHandling'

// Dev/debug panels - lazy load
const MovementDebugPanel = lazyWithErrorHandling(() => import('./game/components/MovementDebugPanel'), 'MovementDebugPanel')
const TestingChecklist = lazyWithErrorHandling(() => import('./game/components/TestingChecklist'), 'TestingChecklist')

// Lazy load modals for code splitting with error handling
const EnhancedInventoryModal = lazyWithErrorHandling(() => import('./game/ui/EnhancedInventoryModal'), 'EnhancedInventoryModal')
const CraftingModal = lazyWithErrorHandling(() => import('./game/ui/CraftingModal'), 'CraftingModal')
const MarketModal = lazyWithErrorHandling(() => import('./game/ui/MarketModal'), 'MarketModal')
const SpellbookModal = lazyWithErrorHandling(() => import('./game/ui/SpellbookModal'), 'SpellbookModal')
const GuildModal = lazyWithErrorHandling(() => import('./game/ui/GuildModal'), 'GuildModal')
const QuestModal = lazyWithErrorHandling(() => import('./game/ui/QuestModal'), 'QuestModal')
const TradeModal = lazyWithErrorHandling(() => import('./game/ui/TradeModal'), 'TradeModal')
const BattlePassModal = lazyWithErrorHandling(() => import('./game/ui/BattlePassModal'), 'BattlePassModal')
const AchievementModal = lazyWithErrorHandling(() => import('./game/ui/AchievementModal'), 'AchievementModal')
const CosmeticShop = lazyWithErrorHandling(() => import('./game/ui/CosmeticShop'), 'CosmeticShop')
const SettingsModal = lazyWithErrorHandling(() => import('./game/ui/SettingsModal'), 'SettingsModal')
const TutorialModal = lazyWithErrorHandling(() => import('./game/ui/TutorialModal'), 'TutorialModal')
const HousingModal = lazyWithErrorHandling(() => import('./game/ui/HousingModal'), 'HousingModal')
const SocialModal = lazyWithErrorHandling(() => import('./game/ui/SocialModal'), 'SocialModal')
const AdminDashboard = lazyWithErrorHandling(() => import('./game/ui/AdminDashboard'), 'AdminDashboard')
const ErrorReportingModal = lazyWithErrorHandling(() => import('./game/ui/ErrorReportingModal'), 'ErrorReportingModal')
import { mobilePersistence } from './game/utils/mobilePersistence'
// import { errorReporting } from './game/utils/errorReporting' // Available for future use
import Game from './game/Game'
import { localizationManager, Locale } from './game/utils/localization'
import { progressiveLoader } from './game/utils/progressiveLoader'
import { loadingPhaseManager } from './game/utils/loadingPhases'
import { loadingOrchestrator } from './game/utils/loadingOrchestrator'
import { setupOrientationLock } from './game/utils/orientationLock'
import OrientationWarning from './game/components/OrientationWarning'
const AssetTestPage = lazyWithErrorHandling(() => import('./game/pages/AssetTestPage'), 'AssetTestPage')

function App() {
  const { player } = useGameStore()
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showCharacterSelection, setShowCharacterSelection] = useState(false)
  const [showCharacterCreation, setShowCharacterCreation] = useState(false)
  const [showAssetTest, setShowAssetTest] = useState(false)
  const loadingStartedRef = useRef(false)

  // Initialize localization - non-blocking (for better LCP)
  // Localization loads in background, UI updates reactively via useTranslation hook
  useEffect(() => {
    // Start localization loading in background (non-blocking)
    // Default locale (en) is already available synchronously
    localizationManager.waitForInitialization().catch(error => {
      console.error('Failed to initialize localization:', error)
    })
    
    // Optionally override with saved locale or browser language (non-blocking)
    const savedLocale = localStorage.getItem('locale') as Locale | null;
    if (savedLocale) {
      localizationManager.setLocale(savedLocale)
    } else {
      // Try to detect browser language
      const browserLang = navigator.language.split('-')[0] as Locale
      const availableLocales = localizationManager.getAvailableLocales()
      if (availableLocales.includes(browserLang)) {
        localizationManager.setLocale(browserLang)
      }
    }
  }, [])

  // Initialize mobile persistence
  useEffect(() => {
    mobilePersistence.init()
    return () => {
      mobilePersistence.destroy()
    }
  }, [])

  // Setup orientation lock for mobile devices
  useEffect(() => {
    const cleanup = setupOrientationLock()
    return cleanup
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

    // Minimum display time for loading screen (reduced for better LCP)
    const minDisplayTime = 200
    const startTime = Date.now()

    // Fallback progress simulation - ensures progress bar moves even if assets don't register
    let fallbackProgress = 0
    let fallbackInterval: number | null = null // Changed to number for requestAnimationFrame ID
    let unsubscribePhase: (() => void) | undefined = undefined
    let timeoutId: NodeJS.Timeout | null = null
    let renderingCheckInterval: NodeJS.Timeout | null = null

    const initializeLoading = async () => {
      try {
        // Minimal delay - just one frame to ensure React has rendered
        await new Promise(resolve => requestAnimationFrame(resolve))
        
        // Reset loading phases for new session
        loadingPhaseManager.reset()
        progressiveLoader.reset()
        loadingOrchestrator.reset()
        
        // Start orchestrator
        loadingOrchestrator.start()
        
        // Define critical assets (player, UI, core textures)
        progressiveLoader.defineCriticalAssets([
          'player-model',
          'ui-texture',
          'core-terrain-texture',
          'core-skybox-texture'
        ])
        
        // Start fallback progress simulation - use requestAnimationFrame for smooth updates
        fallbackProgress = 0
        let lastUpdate = Date.now()
        const updateProgress = () => {
          if (fallbackInterval === null) return // Cancelled
          
          const now = Date.now()
          const delta = now - lastUpdate
          lastUpdate = now
          
          // Update fallback progress (0.3% per 100ms = smooth progression)
          fallbackProgress = Math.min(fallbackProgress + (delta / 100) * 0.3, 30) // Cap at 30% for fallback
          
          // Only use fallback if actual progress is lower
          const actualProgress = loadingPhaseManager.getStatus().overallProgress
          if (actualProgress < fallbackProgress) {
            setLoadingProgress(fallbackProgress)
          }
          
          // Continue animation
          fallbackInterval = requestAnimationFrame(updateProgress)
        }
        fallbackInterval = requestAnimationFrame(updateProgress)

        // Subscribe to orchestrator for explicit milestone-based progress
        unsubscribePhase = loadingOrchestrator.subscribe(async (status) => {
          // Combine orchestrator progress with actual phase progress for smoother updates
          const orchestratorProgress = status.displayedPercentage
          const phaseProgress = loadingPhaseManager.getStatus().overallProgress
          
          // Use the higher of the two, but smooth it out to prevent jumps
          const rawProgress = Math.max(orchestratorProgress, phaseProgress)
          const useProgress = rawProgress > 0 ? rawProgress : fallbackProgress
          
          // Smooth progress updates to prevent jumps
          setLoadingProgress(prev => {
            const diff = useProgress - prev
            // If jump is too large (>10%), smooth it out
            if (Math.abs(diff) > 10) {
              return prev + (diff * 0.3) // Smooth large jumps
            }
            return Math.max(prev, useProgress, fallbackProgress)
          })
          
          // Clear fallback animation once we have real progress
          if (orchestratorProgress > 0 && fallbackInterval !== null) {
            fallbackInterval = null
          }
          
          // Only hide loading screen when:
          // 1. Orchestrator confirms 100% complete
          // 2. Rendering verification is actually complete
          // 3. Minimum display time has elapsed
          if (status.isComplete && status.displayedPercentage >= 100) {
            // Check if rendering is actually complete
            const { renderingTracker } = await import('./game/utils/renderingTracker')
            const isRenderingComplete = renderingTracker.isRenderingComplete()
            
            if (!isRenderingComplete) {
              // Rendering not complete yet - wait for it
              console.log('App: Waiting for rendering verification to complete...')
              
              // Clear any existing interval
              if (renderingCheckInterval !== null) {
                clearInterval(renderingCheckInterval)
              }
              
              renderingCheckInterval = setInterval(() => {
                if (renderingTracker.isRenderingComplete()) {
                  if (renderingCheckInterval !== null) {
                    clearInterval(renderingCheckInterval)
                    renderingCheckInterval = null
                  }
                  // Now hide loading screen
                  if (fallbackInterval !== null) {
                    fallbackInterval = null
                  }
                  const elapsed = Date.now() - startTime
                  const remainingTime = Math.max(0, minDisplayTime - elapsed)
                  
                  setTimeout(() => {
                    setIsLoading(false)
                  }, remainingTime)
                }
              }, 200) // Check every 200ms
              
              // Timeout after 5 seconds if rendering still not complete
              setTimeout(() => {
                if (renderingCheckInterval !== null) {
                  clearInterval(renderingCheckInterval)
                  renderingCheckInterval = null
                }
                if (fallbackInterval !== null) {
                  fallbackInterval = null
                }
                const elapsed = Date.now() - startTime
                const remainingTime = Math.max(0, minDisplayTime - elapsed)
                setTimeout(() => {
                  setIsLoading(false)
                }, remainingTime)
              }, 5000)
            } else {
              // Rendering complete - hide loading screen
              if (fallbackInterval !== null) {
                fallbackInterval = null
              }
              const elapsed = Date.now() - startTime
              const remainingTime = Math.max(0, minDisplayTime - elapsed)
              
              setTimeout(() => {
                setIsLoading(false)
              }, remainingTime)
            }
          }
        })
        
        // Start Phase 1 loading (Game component will trigger asset loading)
        console.log('App: Waiting for Game component to load Phase 1 assets')
        
        // Timeout fallback: ensure loading completes within 30 seconds
        timeoutId = setTimeout(() => {
          console.warn('Loading timeout - completing anyway after 30 seconds')
          if (fallbackInterval !== null) {
            fallbackInterval = null
          }
          setLoadingProgress(100)
          setIsLoading(false)
          unsubscribePhase?.()
        }, 30000)
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
      // Clear fallback animation frame
      if (fallbackInterval !== null) {
        cancelAnimationFrame(fallbackInterval)
        fallbackInterval = null
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (renderingCheckInterval !== null) {
        clearInterval(renderingCheckInterval)
        renderingCheckInterval = null
      }
      unsubscribePhase?.()
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

  // Show asset test page if enabled (press F9 to toggle)
  // MOVED: This hook must be before any early returns to follow Rules of Hooks
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        setShowAssetTest(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

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

  // Show game immediately with loading overlay (for better LCP)
  // Render canvas right away so it can be measured for LCP
  if (isLoading && player && isInitialized) {
    return (
      <ErrorBoundary>
        {/* Render Game component immediately - canvas will be visible for LCP */}
        <Game />
        {/* Loading overlay on top of canvas */}
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 9999, 
          pointerEvents: isLoading ? 'auto' : 'none',
          opacity: isLoading ? 1 : 0,
          transition: 'opacity 0.3s ease-out'
        }}>
          <LoadingScreen
            progress={loadingProgress}
            message="Loading MARS://NEXUS..."
          />
        </div>
      </ErrorBoundary>
    )
  }

  if (showAssetTest) {
    return (
      <ErrorBoundary>
        <Suspense fallback={
          <div className="fixed inset-0 bg-black flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-orange-500">Loading Asset Test...</p>
            </div>
          </div>
        }>
          <AssetTestPage />
          <button
            onClick={() => setShowAssetTest(false)}
            style={{
              position: 'fixed',
              top: 20,
              right: 20,
              zIndex: 1001,
              padding: '10px 20px',
              background: 'rgba(255, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontFamily: 'monospace'
            }}
          >
            Close Test (F9)
          </button>
        </Suspense>
      </ErrorBoundary>
    )
  }

  // Show main game with HUD and modals
  return (
    <ErrorBoundary>
      <OrientationWarning />
      <Game />
      <HUD />
      <Suspense fallback={null}>
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
        <SettingsModal />
        <TutorialModal />
        <HousingModal />
        <SocialModal />
        <AdminDashboard />
        <ErrorReportingModal />
      </Suspense>
      <Chat />
      <KillFeed />
      <ProximityVoice />
      <EmoteMenu />
      <PerformanceMonitor />
      <Minimap />
      <DebugConsole />
      <PerformanceDashboard />
      {/* Dev/debug panels - rendered at top level to ensure proper z-index stacking */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <MovementDebugPanel />
          <TestingChecklist />
        </Suspense>
      )}
    </ErrorBoundary>
  )
}

export default App

