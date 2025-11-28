import { useEffect, useRef, useState } from 'react'
import { useGameStore } from './store/useGameStore'
import EnhancedScene from './components/EnhancedScene'
import TouchControls from './components/TouchControls'
import { GAME_CONFIG } from './data/config'
import { getItem } from './data/items'
import { getSpell } from './data/spells'
import { createSpellProjectile, updateSpellProjectile, checkSpellHit, SpellProjectile } from './systems/spellSystem'
import { joinRoom, leaveRoom, sendSpellCast, sendLootPickup, sendPowerUpPickup } from './network/colyseus'
import { getCooldownManager } from './systems/cooldownSystem'
import { applyPowerUpEffect, updateActivePowerUps } from './systems/powerUpSystem'
import { NPCS } from './data/npcs'
import { startMovementSync, stopMovementSync } from './network/syncSystem'
import { setupOfflineHandler } from './utils/offlineHandler'
import { initializePrediction } from './network/prediction'
import { getMobileOptimizationFlags, frameRateCap } from './utils/mobileOptimizations'
import { isMobileDevice } from './utils/mobileOptimizations'
import { playZoneTrack, playCombatTrack } from './assets/audioTracks'
import AmbientSoundSystem from './components/AmbientSoundSystem'
import DynamicMusicSystem from './components/DynamicMusicSystem'
import PerformanceDashboard from './components/PerformanceDashboard'
import { Suspense } from 'react'
import { lazyWithErrorHandling } from './utils/lazyWithErrorHandling'
const NPCDialogueModal = lazyWithErrorHandling(() => import('./ui/NPCDialogueModal'), 'NPCDialogueModal')
import Crosshair from './components/Crosshair'
import GrappleIndicator from './components/GrappleIndicator'
import { progressiveLoader } from './utils/progressiveLoader'
import { loadingOrchestrator } from './utils/loadingOrchestrator'
import { getIdToken } from '../firebase/auth'
import { useAltKey } from './hooks/useAltKey'
import { memoryManager } from './utils/memoryManager'
// Note: assetCache and assetManifest imports removed as they're not currently used
// import { assetCache } from './utils/assetCache'
// import { assetManifest } from './assets/assetManifest'

export default function Game() {
  const {
    player,
    isConnected
  } = useGameStore()

  const [spellProjectiles, setSpellProjectiles] = useState<SpellProjectile[]>([])
  const gameLoopRef = useRef<number | undefined>(undefined)
  const { isQuestOpen, interactingWithNPC } = useGameStore()
  const lastProcessedQueueRef = useRef<number>(0) // Track last processed queue timestamp
  
  // Track Alt key state for UI interaction
  const isAltPressed = useAltKey()
  
  // Track if windows are open to disable game world pointer events
  // Also disable when Alt is held (allows UI interaction)
  const hasOpenWindows = isQuestOpen || !!interactingWithNPC
  const shouldDisablePointerEvents = hasOpenWindows || isAltPressed

  // Initialize memory manager for performance monitoring
  useEffect(() => {
    memoryManager.startMonitoring()
    
    return () => {
      // Stop monitoring when component unmounts
      memoryManager.stopMonitoring()
    }
  }, [])

  // Sequential milestone-based loading orchestration
  // Use ref to prevent multiple executions
  const loadingRef = useRef<{ playerId: string | undefined; isLoading: boolean }>({
    playerId: undefined,
    isLoading: false
  })

  useEffect(() => {
    if (!player) return

    // Prevent multiple executions for the same player
    if (loadingRef.current.playerId === player.id && loadingRef.current.isLoading) {
      return
    }

    // Mark as loading
    loadingRef.current = { playerId: player.id, isLoading: true }

    console.log('Game: Starting sequential milestone-based loading')
    
    const loadSequentially = async () => {
      try {
        // Milestone 0-5%: Initialization
        loadingOrchestrator.advanceToMilestone(5)
        // Initialize asset cache and manifest early (parallel)
        // Note: assetCache and assetManifest imports removed as they're not currently used
        // import { assetCache } from './assets/assetCache'
        // import { assetManifest } from './assets/assetManifest'
        // Promise.all([
        //   assetCache.init().catch((err: unknown) => console.warn('Failed to init asset cache:', err)),
        //   assetManifest.loadManifest().catch((err: unknown) => console.warn('Failed to preload asset manifest:', err))
        // ])
        // Minimal delay - just one frame
        await new Promise(resolve => requestAnimationFrame(resolve))
        loadingOrchestrator.markFeatureLoaded('Initialization')
        
        // No delay needed - components mount synchronously
        
        // Milestone 5-15%: Critical Textures
        loadingOrchestrator.advanceToMilestone(15)
        
        // Load Phase 1 assets (textures, player, lighting)
        await progressiveLoader.loadPhase('phase1')
        // No delay needed - components mark assets loaded asynchronously
        
        // Milestone 15-25%: Player Model
        loadingOrchestrator.advanceToMilestone(25)
        // Wait for player (with timeout)
        await new Promise(resolve => {
          let attempts = 0
          const maxAttempts = 25 // 5 seconds max
          const checkPlayer = () => {
            attempts++
            const status = loadingOrchestrator.getStatus()
            if (status.featureStatus.get('Player') === 'loaded' || attempts >= maxAttempts) {
              resolve(undefined)
            } else {
              setTimeout(checkPlayer, 200)
            }
          }
          checkPlayer()
        })
        
        // Milestone 25-35%: Lighting
        loadingOrchestrator.advanceToMilestone(35)
        // Wait for lighting (with timeout)
        await new Promise(resolve => {
          let attempts = 0
          const maxAttempts = 15 // 3 seconds max
          const checkLighting = () => {
            attempts++
            const status = loadingOrchestrator.getStatus()
            if (status.featureStatus.get('Lighting') === 'loaded' || attempts >= maxAttempts) {
              resolve(undefined)
            } else {
              setTimeout(checkLighting, 200)
            }
          }
          checkLighting()
        })
        
        // Milestone 35-45%: Game Systems
        loadingOrchestrator.advanceToMilestone(45)
        await new Promise(resolve => requestAnimationFrame(resolve))
        loadingOrchestrator.markFeatureLoaded('Game Systems')
        
        // Milestone 45-50%: Phase 1 Complete
        loadingOrchestrator.advanceToMilestone(50)
        // No delay needed
        
        // Milestone 50-60%: Road Network
        loadingOrchestrator.advanceToMilestone(60)
        // Wait for road network (CyberpunkCity generates it)
        await new Promise(resolve => {
          let attempts = 0
          const maxAttempts = 20 // 10 seconds max
          const checkRoadNetwork = () => {
            attempts++
            const status = loadingOrchestrator.getStatus()
            if (status.featureStatus.get('Road Network') === 'loaded' || attempts >= maxAttempts) {
              resolve(undefined)
            } else {
              setTimeout(checkRoadNetwork, 200) // Reduced from 500ms
            }
          }
          setTimeout(checkRoadNetwork, 200) // Reduced from 1000ms
        })
        
        // Milestone 60-70%: Buildings
        loadingOrchestrator.advanceToMilestone(70)
        // Load Phase 2 assets
        await progressiveLoader.loadPhase('phase2')
        // Wait for buildings (with timeout)
        await new Promise(resolve => {
          let attempts = 0
          const maxAttempts = 30 // 15 seconds max
          const checkBuildings = () => {
            attempts++
            const status = loadingOrchestrator.getStatus()
            if (status.featureStatus.get('Buildings') === 'loaded' || attempts >= maxAttempts) {
              resolve(undefined)
            } else {
              setTimeout(checkBuildings, 200) // Reduced from 500ms
            }
          }
          setTimeout(checkBuildings, 1500) // Give it time to generate
        })
        
        // Milestone 70-80%: Shadows
        loadingOrchestrator.advanceToMilestone(80)
        // Wait for shadows (with timeout)
        await new Promise(resolve => {
          let attempts = 0
          const maxAttempts = 10 // 2 seconds max
          const checkShadows = () => {
            attempts++
            const status = loadingOrchestrator.getStatus()
            if (status.featureStatus.get('Shadows') === 'loaded' || attempts >= maxAttempts) {
              resolve(undefined)
            } else {
              setTimeout(checkShadows, 200)
            }
          }
          checkShadows()
        })
        
        // Milestone 80-85%: Phase 2 Complete
        loadingOrchestrator.advanceToMilestone(85)
        // No delay needed
        
        // Milestone 85-90%: Weather
        loadingOrchestrator.advanceToMilestone(90)
        // Load Phase 3 assets
        await progressiveLoader.loadPhase('phase3')
        // Wait for weather (with timeout)
        await new Promise(resolve => {
          let attempts = 0
          const maxAttempts = 10 // 2 seconds max
          const checkWeather = () => {
            attempts++
            const status = loadingOrchestrator.getStatus()
            if (status.featureStatus.get('Weather') === 'loaded' || attempts >= maxAttempts) {
              resolve(undefined)
            } else {
              setTimeout(checkWeather, 200)
            }
          }
          checkWeather()
        })
        
        // Milestone 90-95%: Post Processing
        loadingOrchestrator.advanceToMilestone(95)
        // Wait for post-processing (with timeout)
        await new Promise(resolve => {
          let attempts = 0
          const maxAttempts = 10 // 2 seconds max
          const checkPostProcessing = () => {
            attempts++
            const status = loadingOrchestrator.getStatus()
            if (status.featureStatus.get('Post Processing') === 'loaded' || attempts >= maxAttempts) {
              resolve(undefined)
            } else {
              setTimeout(checkPostProcessing, 200)
            }
          }
          checkPostProcessing()
        })
        
        // Milestone 95-98%: Rendering Verification
        loadingOrchestrator.advanceToMilestone(98)
        // Wait for rendering to complete (critical - must wait)
        // Also ensure we're making progress, not just waiting
        await new Promise(resolve => {
          let attempts = 0
          const maxAttempts = 50 // 10 seconds max (reduced from 50 seconds)
          let lastProgress = 0
          let stuckCount = 0
          let lastCheckTime = Date.now()
          let isResolved = false
          
          const checkRendering = () => {
            if (isResolved) return
            
            attempts++
            const currentTime = Date.now()
            
            import('./utils/renderingTracker').then(({ renderingTracker }) => {
              if (isResolved) return
              
              const status = renderingTracker.getStatus()
              const isComplete = renderingTracker.isRenderingComplete()
              
              // Check if we're making progress (with time-based check)
              const timeSinceLastCheck = currentTime - lastCheckTime
              if (status.progress === lastProgress && timeSinceLastCheck > 100) {
                stuckCount++
              } else {
                stuckCount = 0
                lastProgress = status.progress
              }
              lastCheckTime = currentTime
              
              // If stuck for too long (4 seconds) or max attempts reached, consider it complete
              if (stuckCount > 20 || attempts >= maxAttempts) {
                if (import.meta.env.DEV) {
                  console.warn('Rendering verification timeout, marking as complete', {
                    attempts,
                    stuckCount,
                    progress: status.progress,
                    isComplete
                  })
                }
                isResolved = true
                loadingOrchestrator.markFeatureLoaded('Rendering Verification')
                resolve(undefined)
                return
              }
              
              if (isComplete) {
                isResolved = true
                loadingOrchestrator.markFeatureLoaded('Rendering Verification')
                resolve(undefined)
              } else {
                // Check more frequently if we're close to completion
                const delay = status.progress > 80 ? 200 : 500
                setTimeout(checkRendering, delay)
              }
            }).catch((error) => {
              // If rendering tracker fails, just complete anyway
              if (import.meta.env.DEV) {
                console.warn('Rendering tracker error, marking as complete:', error)
              }
              if (!isResolved) {
                isResolved = true
                loadingOrchestrator.markFeatureLoaded('Rendering Verification')
                resolve(undefined)
              }
            })
          }
          checkRendering()
        })
        
        // Milestone 98-100%: Complete
        loadingOrchestrator.advanceToMilestone(100)
        await new Promise(resolve => setTimeout(resolve, 200))
        loadingOrchestrator.markFeatureLoaded('Complete')
        
        console.log('Game: Sequential loading complete')
        
        // Mark as no longer loading
        loadingRef.current.isLoading = false
      } catch (error) {
        console.error('Game: Sequential loading failed:', error)
        // Advance to completion on error to prevent blocking
        loadingOrchestrator.advanceToMilestone(100)
        
        // Mark as no longer loading even on error
        loadingRef.current.isLoading = false
      }
    }
    
    loadSequentially()
    
    // Cleanup: reset loading state if player changes
    return () => {
      if (loadingRef.current.playerId !== player.id) {
        loadingRef.current = { playerId: undefined, isLoading: false }
      }
    }
  }, [player?.id])

  // Setup offline handler
  useEffect(() => {
    const cleanup = setupOfflineHandler()
    return cleanup
  }, [])

  // Initialize prediction system for offline play
  useEffect(() => {
    if (!player) return
    
    // Initialize prediction system even for offline play
    initializePrediction({
      id: player.id,
      position: player.position,
      rotation: player.rotation,
      timestamp: Date.now()
    })
  }, [player?.id])

  // Spawn NPCs based on current zone/biome
  // FIXED: Removed npcs Map from dependencies to prevent infinite loop (React error #310)
  useEffect(() => {
    if (!player) return

    const currentZone = player.zone || 'nexus_city'
    // Get NPCs for the current biome/zone
    // For now, spawn all NPCs (in a real game, filter by biome)
    const zoneNPCs = NPCS.filter(npc => {
      // Simple zone matching - in production, use proper biome/zone system
      return npc.biome === currentZone || npc.town === currentZone || currentZone === 'nexus_city'
    })

    // Get fresh state inside effect to avoid dependency on changing Map
    const currentState = useGameStore.getState()
    const currentNPCs = currentState.npcs

    // Add NPCs to store
    zoneNPCs.forEach(npc => {
      if (!currentNPCs.has(npc.id)) {
        currentState.addNPC(npc)
      }
    })
  }, [player?.zone, player?.id]) // Only depend on stable values

  // Connect to multiplayer server
  useEffect(() => {
    if (!player) return

    let connectionAttempts = 0
    const MAX_RECONNECT_ATTEMPTS = 3
    let retryTimeoutId: NodeJS.Timeout | null = null
    let isMounted = true

    const connect = async () => {
      // Don't attempt if component unmounted
      if (!isMounted) return

      try {
        // Get Firebase token before joining
        const firebaseToken = await getIdToken()
        
        await joinRoom(player.name, player.race, false, firebaseToken || undefined)
        
        // Only proceed if still mounted
        if (!isMounted) {
          leaveRoom()
          return
        }
        
        startMovementSync()
        connectionAttempts = 0 // Reset on success
      } catch (error) {
        // Don't retry if component unmounted
        if (!isMounted) return
        
        // Check if this is a seat reservation expired error (recoverable)
        const isSeatReservationExpired = error instanceof Error && 
          (error.message.includes('seat reservation expired') || 
           error.message.includes('reservation expired') ||
           (error as any).code === 4002)
        
        // Only log detailed errors in dev mode or for non-timeout errors
        const isTimeout = error instanceof Error && error.message.includes('timeout')
        
        // Suppress duplicate error logs
        if (import.meta.env.DEV || (!isTimeout && !isSeatReservationExpired)) {
          // Only log if this is a new error type or enough time has passed
          const errorKey = error instanceof Error ? error.message : String(error)
          const lastErrorKey = (window as any).__lastGameConnectionError
          const lastErrorTime = (window as any).__lastGameConnectionErrorTime || 0
          
          if (errorKey !== lastErrorKey || Date.now() - lastErrorTime > 5000) {
            console.error('Failed to connect to server, playing offline:', error)
            ;(window as any).__lastGameConnectionError = errorKey
            ;(window as any).__lastGameConnectionErrorTime = Date.now()
          }
        } else if (isSeatReservationExpired) {
          // Seat reservation expired - this is recoverable, retry quickly
          if (import.meta.env.DEV || connectionAttempts === 1) {
            console.warn('Seat reservation expired - retrying connection...')
          }
        } else {
          // In production, timeout errors are expected - just log a brief message (throttled)
          const lastTimeoutLog = (window as any).__lastGameTimeoutLog || 0
          if (Date.now() - lastTimeoutLog > 10000) {
            console.warn('Server connection timeout - playing offline mode')
            ;(window as any).__lastGameTimeoutLog = Date.now()
          }
        }
        connectionAttempts++
        
        // Retry more aggressively for seat reservation expired errors
        // Use exponential backoff with jitter to prevent thundering herd
        const baseDelay = isSeatReservationExpired 
          ? 1000 // Retry after 1 second for seat reservation errors
          : Math.min(2000 * Math.pow(2, connectionAttempts - 1), 10000) // Exponential backoff, max 10s
        const jitter = Math.random() * 500 // Add random jitter to prevent synchronized retries
        const retryDelay = baseDelay + jitter
        
        // Only retry a few times, then give up
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS && isMounted) {
          retryTimeoutId = setTimeout(() => {
            if (isMounted) {
              connect()
            }
          }, retryDelay)
        } else {
          console.warn('Max connection attempts reached, playing offline')
        }
      }
    }

    connect()

    return () => {
      isMounted = false
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId)
      }
      leaveRoom()
      stopMovementSync()
    }
  }, [player?.id]) // Only reconnect if player ID changes, not on every player update

  // Process spell casts
  // FIXED: Use Zustand subscription to avoid dependency on changing array reference
  useEffect(() => {
    if (!player?.id) return

    const processQueue = (queue: Array<{ spellId: string; timestamp: number }>) => {
      if (queue.length === 0) return

      const currentState = useGameStore.getState()
      const currentPlayer = currentState.player
      if (!currentPlayer) return

      // Check if we've already processed this queue (prevent duplicate processing)
      const queueTimestamp = queue[queue.length - 1]?.timestamp || 0
      if (queueTimestamp <= lastProcessedQueueRef.current) {
        return
      }
      lastProcessedQueueRef.current = queueTimestamp

      const { isConnected, isOnCooldown, startCooldown } = currentState

      queue.forEach(({ spellId }) => {
        const spell = getSpell(spellId)
        if (!spell) return
        
        const actionId = `spell:${spellId}`
        
        // Check cooldown (server will also validate, but check client-side too)
        if (isOnCooldown(actionId)) {
          return // Skip if on cooldown
        }
        
        if (isConnected) {
          // Multiplayer: send to server (server validates cooldown)
          sendSpellCast(spellId, currentPlayer.position, currentPlayer.rotation)
          // Start cooldown client-side (server will also track)
          startCooldown(actionId, spell.cooldown)
        } else {
          // Offline: create projectile locally
          const projectile = createSpellProjectile(
            spellId,
            currentPlayer.id,
            currentPlayer.position,
            currentPlayer.rotation
          )
          if (projectile) {
            setSpellProjectiles(prev => [...prev, projectile])
            // Start cooldown
            startCooldown(actionId, spell.cooldown)
          }
        }
      })

      currentState.clearSpellCastQueue()
    }

    // Subscribe to spellCastQueue changes using Zustand's subscribe API
    let lastQueue: Array<{ spellId: string; timestamp: number }> = []
    const unsubscribe = useGameStore.subscribe((state) => {
      const queue = state.spellCastQueue
      // Check if queue has changed
      const hasChanged = queue.length !== lastQueue.length || 
        queue.some((item, i) => item.timestamp !== lastQueue[i]?.timestamp)
      
      if (hasChanged && queue.length > 0) {
        lastQueue = [...queue]
        processQueue(queue)
      } else {
        lastQueue = [...queue]
      }
    })

    return unsubscribe
  }, [player?.id]) // Only depend on player ID

  // Initialize world boss and dynamic events systems
  useEffect(() => {
    if (!player || !isConnected) return
    
    let dynamicEventSystem: any = null
    
    const initSystems = async () => {
      try {
        // Initialize world boss system (client-side tracking)
        await import('./systems/worldBoss')
        // System is initialized but not started (server handles spawning)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('Failed to load world boss system:', error)
        }
      }
      
      try {
        // Initialize dynamic events system
        const dynamicEventsModule = await import('./systems/dynamicEvents')
        dynamicEventSystem = dynamicEventsModule.dynamicEventSystem
        if (dynamicEventSystem) {
          dynamicEventSystem.start()
        }
      } catch (error) {
        // Silently fail if dynamic events system can't be loaded
        // This is expected if the file doesn't exist or has errors
        if (import.meta.env.DEV) {
          console.warn('Failed to load dynamic events system:', error)
        }
      }
      
      return () => {
        if (dynamicEventSystem && typeof dynamicEventSystem.stop === 'function') {
          dynamicEventSystem.stop()
        }
      }
    }
    
    const cleanupPromise = initSystems()
    return () => {
      cleanupPromise.then(cleanupFn => cleanupFn?.()).catch(() => {
        // Ignore cleanup errors
      })
    }
  }, [player?.id, isConnected])

  // Game loop with frame rate capping
  // FIXED: Removed Map dependencies to prevent infinite loop (React error #310)
  // Use useGameStore.getState() inside loop to get fresh values without subscribing
  useEffect(() => {
    if (!player) return

    const flags = getMobileOptimizationFlags()
    const targetFPS = flags.targetFPS
    const deltaTime = 1000 / targetFPS // Calculate delta based on target FPS

    const gameLoop = () => {
      const frameStartTime = performance.now()
      
      // Get fresh state inside loop to avoid dependency on changing Maps
      const currentState = useGameStore.getState()
      const currentPlayer = currentState.player
      const currentEnemies = currentState.enemies
      const currentLootDrops = currentState.lootDrops
      const currentPowerUps = currentState.powerUps
      const currentIsConnected = currentState.isConnected

      if (!currentPlayer) return
      
      // Monitor frame time and warn if too long
      const frameTime = performance.now() - frameStartTime
      
      // Use frame time monitor for better tracking
      if (frameTime > 100) {
        import('./utils/frameTimeMonitor').then(({ frameTimeMonitor }) => {
          // Frame time monitor will handle logging and cleanup
          // This is just to ensure it's tracking
        }).catch(() => {
          // Fallback to simple logging if monitor not available
          if (import.meta.env.DEV && frameTime > 100) {
            console.warn(`Long frame time detected: ${frameTime.toFixed(2)}ms`)
          }
        })
      }
      
      // If frame time is extremely long (>1 second), something is blocking
      if (frameTime > 1000) {
        console.error(`⚠️ CRITICAL: Frame took ${frameTime.toFixed(2)}ms! This is blocking the main thread and may cause WebGL context loss.`)
        console.error('   This usually indicates:')
        console.error('   - Heavy asset loading on main thread')
        console.error('   - Synchronous operations blocking rendering')
        console.error('   - Large state updates')
        
        // Trigger emergency cleanup
        import('./utils/memoryManager').then(({ memoryManager }) => {
          memoryManager.forceCleanup()
        }).catch(() => {
          // Ignore if memory manager not available
        })
      }

      // Update spell projectiles
      setSpellProjectiles(prev => {
        const updated = prev
          .map(proj => updateSpellProjectile(proj, deltaTime))
          .filter((proj): proj is SpellProjectile => proj !== null)
        
        // Release removed projectiles (handled in updateSpellProjectile)

        // Check collisions with enemies
        updated.forEach(projectile => {
          currentEnemies.forEach(enemy => {
            if (checkSpellHit(projectile, enemy.position)) {
              // Deal damage
              const newHealth = enemy.health - projectile.spell.damage
              if (newHealth <= 0) {
                // Enemy killed
                currentState.removeEnemy(enemy.id)
                currentState.addXP(50)
                currentState.addCredits(25)

                // Drop loot
                const lootItem = getItem('cyber_scrap')
                if (lootItem) {
                  currentState.addLootDrop({
                    id: `loot_${Date.now()}`,
                    item: lootItem,
                    position: { ...enemy.position },
                    expiresAt: Date.now() + GAME_CONFIG.lootExpireTime
                  })
                }
              } else {
                currentState.updateEnemy(enemy.id, { health: newHealth })
              }
            }
          })
        })

        return updated
      })

      // Enemy spawning is handled by the server
      // Client only receives enemy updates via network sync

      // Update active power-ups
      updateActivePowerUps(deltaTime)
      
      // Update cooldown system
      getCooldownManager().update(deltaTime / 1000) // Convert ms to seconds

      // Clean up expired loot
      currentLootDrops.forEach(loot => {
        if (Date.now() > loot.expiresAt) {
          currentState.removeLootDrop(loot.id)
        }
      })

      // Clean up expired power-ups
      currentPowerUps.forEach(powerUp => {
        if (Date.now() > powerUp.expiresAt) {
          currentState.removePowerUp(powerUp.id)
        }
      })

      // Check for power-up pickup
      currentPowerUps.forEach(powerUp => {
        const distance = Math.sqrt(
          Math.pow(currentPlayer.position.x - powerUp.position.x, 2) +
          Math.pow(currentPlayer.position.y - powerUp.position.y, 2) +
          Math.pow(currentPlayer.position.z - powerUp.position.z, 2)
        )

        const pickupRange = 2.5
        if (distance < pickupRange) {
          // Apply power-up effect
          applyPowerUpEffect(powerUp.powerUpId, powerUp.id)
          currentState.removePowerUp(powerUp.id)
          
          // Send to server if connected
          if (currentIsConnected) {
            sendPowerUpPickup(powerUp.id)
          }
        }
      })

      // Check for loot pickup (manual or auto-loot)
      // Load auto-loot settings
      const savedSettings = localStorage.getItem('gameSettings')
      let autoLootEnabled = false
      let autoLootRange = 2
      let autoLootFilter: string[] = []
      
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings)
          autoLootEnabled = settings.autoLootEnabled || false
          autoLootRange = settings.autoLootRange || 2
          autoLootFilter = settings.autoLootFilter || []
        } catch (e) {
          console.error('Failed to parse auto-loot settings:', e)
        }
      }
      
      // Check frame time and limit expensive operations if frame is taking too long
      const currentFrameTime = performance.now() - frameStartTime
      const shouldLimitExpensiveOps = currentFrameTime > 30 // Limit if already over 30ms
      
      // Limit loot checks if frame is taking too long (process fewer items)
      const maxLootChecks = shouldLimitExpensiveOps ? Math.min(5, currentLootDrops.size) : currentLootDrops.size

      // Process loot drops (limited if frame is taking too long)
      let lootCheckCount = 0
      for (const loot of currentLootDrops.values()) {
        if (shouldLimitExpensiveOps && lootCheckCount >= maxLootChecks) {
          break // Skip remaining loot checks if frame is taking too long
        }
        lootCheckCount++
        
        const distance = Math.sqrt(
          Math.pow(currentPlayer.position.x - loot.position.x, 2) +
          Math.pow(currentPlayer.position.y - loot.position.y, 2) +
          Math.pow(currentPlayer.position.z - loot.position.z, 2)
        )

        const pickupRange = autoLootEnabled ? autoLootRange : 2
        const isInRange = distance < pickupRange
        const canPickup = (!loot.ownerId || loot.ownerId === currentPlayer.id)

        if (isInRange && canPickup) {
          // Check auto-loot filter if enabled
          if (autoLootEnabled && autoLootFilter.length > 0) {
            const item = getItem(loot.item.id)
            if (item && !autoLootFilter.includes(item.type)) {
              continue // Skip this item - not in filter
            }
          }

          // Pick up loot
          if (currentIsConnected) {
            sendLootPickup(loot.id)
          } else {
            // Offline mode
            currentState.addItem(loot.item.id, 1)
            currentState.removeLootDrop(loot.id)
          }
        }
      }
    }

    // Apply frame rate capping if on mobile or if performance issues detected
    let stopCap: (() => void) | null = null
    let frameTimeHistory: number[] = []
    const MAX_FRAME_TIME_HISTORY = 60
    
    const cappedLoop = () => {
      const frameStart = performance.now()
      gameLoop()
      const frameEnd = performance.now()
      const frameTime = frameEnd - frameStart
      
      // Track frame times
      frameTimeHistory.push(frameTime)
      if (frameTimeHistory.length > MAX_FRAME_TIME_HISTORY) {
        frameTimeHistory.shift()
      }
      
      // Calculate average frame time
      const avgFrameTime = frameTimeHistory.reduce((a, b) => a + b, 0) / frameTimeHistory.length
      
      // If average frame time is too high, reduce target FPS
      if (avgFrameTime > 50 && targetFPS > 30) {
        // Frame times are too high, but we're already capped
        // This will be handled by the frame rate cap
      }
    }
    
    if (flags.isMobile && targetFPS < 60) {
      stopCap = frameRateCap.cap(targetFPS, cappedLoop)
    } else {
      // Desktop: use standard requestAnimationFrame with monitoring
      const standardLoop = () => {
        cappedLoop()
        gameLoopRef.current = requestAnimationFrame(standardLoop)
      }
      gameLoopRef.current = requestAnimationFrame(standardLoop)
    }

    return () => {
      if (stopCap) {
        stopCap()
      } else if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [player?.id, isConnected]) // Only depend on player ID and connection status - stable values

  // Music integration - play zone music based on current zone
  useEffect(() => {
    if (player && isConnected) {
      const zone = player.zone || 'nexus_city'
      playZoneTrack(zone, true)
    }
  }, [player?.zone, isConnected])

  // Combat music - play when in combat
  // FIXED: Use getState() inside effect to avoid dependency on changing Map reference
  useEffect(() => {
    if (!player) return
    
    const currentState = useGameStore.getState()
    const currentEnemies = currentState.enemies
    
    const hasNearbyEnemies = Array.from(currentEnemies.values()).some(enemy => {
      const distance = Math.sqrt(
        Math.pow(player.position.x - enemy.position.x, 2) +
        Math.pow(player.position.y - enemy.position.y, 2) +
        Math.pow(player.position.z - enemy.position.z, 2)
      )
      return distance < 20
    })

    if (hasNearbyEnemies) {
      playCombatTrack('combat_normal', true)
    } else {
      const zone = player.zone || 'nexus_city'
      playZoneTrack(zone, true)
    }
  }, [player?.id, player?.position.x, player?.position.y, player?.position.z, player?.zone]) // Only depend on stable values

  // Handle player death
  // FIXED: Only depend on player health, not the whole player object
  useEffect(() => {
    if (!player) return
    
    const currentHealth = player.health
    if (currentHealth <= 0) {
      // Respawn player
      const currentState = useGameStore.getState()
      setTimeout(() => {
        currentState.updatePlayerHealth(player.maxHealth)
        currentState.updatePlayerPosition({ x: 0, y: 1, z: 0 }) // Y=1 to stand on ground
      }, 2000)
    }
  }, [player?.id, player?.health, player?.maxHealth]) // Only depend on health values, not whole object

  if (!player) return null

  return (
    <div 
      className="fixed inset-0 w-full h-full" 
      style={{ 
        zIndex: 1,
        backgroundColor: '#1a1a2e', // Lighter background color for better visibility
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: shouldDisablePointerEvents ? 'none' : 'auto'
      }}
    >
      <EnhancedScene spellProjectiles={spellProjectiles} />
      {isMobileDevice() && <TouchControls />}
      <AmbientSoundSystem />
      <DynamicMusicSystem />
      <PerformanceDashboard />
      <Suspense fallback={null}>
        <NPCDialogueModal />
      </Suspense>
      <Crosshair />
      <GrappleIndicator />
    </div>
  )
}

