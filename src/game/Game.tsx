import { useEffect, useRef, useState } from 'react'
import { useGameStore } from './store/useGameStore'
import EnhancedScene from './components/EnhancedScene'
import TouchControls from './components/TouchControls'
import { GAME_CONFIG } from './data/config'
import { getItem } from './data/items'
import { createSpellProjectile, updateSpellProjectile, checkSpellHit, SpellProjectile } from './systems/spellSystem'
import { joinRoom, leaveRoom, sendSpellCast, sendLootPickup } from './network/colyseus'
import { startMovementSync, stopMovementSync } from './network/syncSystem'
import { setupOfflineHandler } from './utils/offlineHandler'
import { initializePrediction } from './network/prediction'
import { getMobileOptimizationFlags, frameRateCap } from './utils/mobileOptimizations'
import { isMobileDevice } from './utils/mobileOptimizations'
import { playZoneTrack, playCombatTrack } from './assets/audioTracks'
import AmbientSoundSystem from './components/AmbientSoundSystem'
import PerformanceDashboard from './components/PerformanceDashboard'
import { loadingPhaseManager } from './utils/loadingPhases'
import { progressiveLoader } from './utils/progressiveLoader'

export default function Game() {
  const {
    player,
    enemies,
    addEnemy,
    removeEnemy,
    updateEnemy,
    updatePlayerHealth,
    addXP,
    addCredits,
    addItem,
    lootDrops,
    addLootDrop,
    removeLootDrop,
    isConnected
  } = useGameStore()

  const [spellProjectiles, setSpellProjectiles] = useState<SpellProjectile[]>([])
  const gameLoopRef = useRef<number | undefined>(undefined)
  const { spellCastQueue, clearSpellCastQueue } = useGameStore()
  const phase2StartedRef = useRef(false)

  // Initialize loading phases and start Phase 1 loading
  useEffect(() => {
    if (!player) return

    // Reset loading phases for new game session
    loadingPhaseManager.reset()
    progressiveLoader.reset()

    console.log('Game: Initializing loading phases')
    
    // Give components a moment to register their assets, then start loading Phase 1
    const startPhase1 = async () => {
      // Wait multiple frames to let components mount and register assets
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      
      // Additional delay to ensure all components have registered
      await new Promise(resolve => setTimeout(resolve, 300))
      
      console.log('Game: Starting Phase 1 asset loading')
      
      // Check if components are loading assets themselves
      // If so, we'll wait for them to finish via markAssetLoaded
      // Otherwise, loadPhase will handle loading
      try {
        // Start loading Phase 1 - this will load any unloaded assets
        // Components that load assets themselves will call markAssetLoaded
        await progressiveLoader.loadPhase('phase1', (progress) => {
          // Progress is automatically updated via loadingPhaseManager
          console.log('Phase 1 progress:', progress.phaseProgress, `(${progress.loaded}/${progress.total} assets)`)
        })
        
        // Give a moment for any async component loading to complete
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Final check - if phase isn't complete, mark it as complete
        // (components may have loaded everything themselves)
        if (!loadingPhaseManager.isPhaseComplete('phase1')) {
          console.log('Game: Phase 1 assets loaded by components, marking complete')
          loadingPhaseManager.updatePhaseProgress('phase1', 100)
        }
        
        console.log('Game: Phase 1 loading complete')
      } catch (error) {
        console.error('Game: Phase 1 loading failed:', error)
        // Mark Phase 1 as complete anyway to prevent blocking
        loadingPhaseManager.updatePhaseProgress('phase1', 100)
      }
    }
    
    startPhase1()
    
    // Listen for Phase 1 completion to start Phase 2
    const unsubscribePhase1 = loadingPhaseManager.onPhaseComplete('phase1', async () => {
      console.log('Game: Phase 1 complete, starting Phase 2')
      if (!phase2StartedRef.current) {
        phase2StartedRef.current = true
        loadingPhaseManager.transitionToNextPhase()
        
        // Start Phase 2 loading after a brief delay
        setTimeout(async () => {
          console.log('Game: Starting Phase 2 asset loading')
          try {
            await progressiveLoader.loadPhase('phase2', (progress) => {
              console.log('Phase 2 progress:', progress.phaseProgress)
            })
            console.log('Game: Phase 2 loading complete')
            loadingPhaseManager.transitionToNextPhase()
            
            // Start Phase 3 loading
            setTimeout(async () => {
              console.log('Game: Starting Phase 3 asset loading')
              try {
                await progressiveLoader.loadPhase('phase3', (progress) => {
                  console.log('Phase 3 progress:', progress.phaseProgress)
                })
                console.log('Game: Phase 3 loading complete')
                loadingPhaseManager.transitionToNextPhase()
              } catch (error) {
                console.error('Game: Phase 3 loading failed:', error)
                loadingPhaseManager.updatePhaseProgress('phase3', 100)
              }
            }, 100)
          } catch (error) {
            console.error('Game: Phase 2 loading failed:', error)
            loadingPhaseManager.updatePhaseProgress('phase2', 100)
          }
        }, 100)
      }
    })

    return () => {
      unsubscribePhase1()
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

  // Connect to multiplayer server
  useEffect(() => {
    if (!player) return

    let isConnecting = false
    let connectionAttempts = 0
    const MAX_RECONNECT_ATTEMPTS = 3

    const connect = async () => {
      if (isConnecting) return
      isConnecting = true

      try {
        // Get Firebase token before joining
        const { getIdToken } = await import('../firebase/auth')
        const firebaseToken = await getIdToken()
        
        await joinRoom(player.name, player.race, false, firebaseToken || undefined)
        startMovementSync()
        connectionAttempts = 0 // Reset on success
      } catch (error) {
        console.error('Failed to connect to server, playing offline:', error)
        connectionAttempts++
        
        // Only retry a few times, then give up
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          setTimeout(() => {
            isConnecting = false
            connect()
          }, 2000 * connectionAttempts) // Exponential backoff
        } else {
          console.warn('Max connection attempts reached, playing offline')
          isConnecting = false
        }
      } finally {
        if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
          isConnecting = false
        }
      }
    }

    connect()

    return () => {
      isConnecting = false
      leaveRoom()
      stopMovementSync()
    }
  }, [player?.id]) // Only reconnect if player ID changes, not on every player update

  // Process spell casts
  useEffect(() => {
    if (!player || spellCastQueue.length === 0) return

    const { isConnected } = useGameStore.getState()

    spellCastQueue.forEach(({ spellId }) => {
      if (isConnected) {
        // Multiplayer: send to server
        sendSpellCast(spellId, player.position, player.rotation)
      } else {
        // Offline: create projectile locally
        const projectile = createSpellProjectile(
          spellId,
          player.id,
          player.position,
          player.rotation
        )
        if (projectile) {
          setSpellProjectiles(prev => [...prev, projectile])
        }
      }
    })

    clearSpellCastQueue()
  }, [spellCastQueue, player, clearSpellCastQueue])

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
  useEffect(() => {
    if (!player) return

    const flags = getMobileOptimizationFlags()
    const targetFPS = flags.targetFPS
    const deltaTime = 1000 / targetFPS // Calculate delta based on target FPS

    const gameLoop = () => {
      // Update spell projectiles
      setSpellProjectiles(prev => {
        const updated = prev
          .map(proj => updateSpellProjectile(proj, deltaTime))
          .filter((proj): proj is SpellProjectile => proj !== null)
        
        // Release removed projectiles (handled in updateSpellProjectile)

        // Check collisions with enemies
        updated.forEach(projectile => {
          enemies.forEach(enemy => {
            if (checkSpellHit(projectile, enemy.position)) {
              // Deal damage
              const newHealth = enemy.health - projectile.spell.damage
              if (newHealth <= 0) {
                // Enemy killed
                removeEnemy(enemy.id)
                addXP(50)
                addCredits(25)

                // Drop loot
                const lootItem = getItem('cyber_scrap')
                if (lootItem) {
                  addLootDrop({
                    id: `loot_${Date.now()}`,
                    item: lootItem,
                    position: { ...enemy.position },
                    expiresAt: Date.now() + GAME_CONFIG.lootExpireTime
                  })
                }
              } else {
                updateEnemy(enemy.id, { health: newHealth })
              }
            }
          })
        })

        return updated
      })

      // Enemy spawning is handled by the server
      // Client only receives enemy updates via network sync

      // Clean up expired loot
      lootDrops.forEach(loot => {
        if (Date.now() > loot.expiresAt) {
          removeLootDrop(loot.id)
        }
      })

      // Check for loot pickup (manual or auto-loot)
      if (player) {
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

        lootDrops.forEach(loot => {
          const distance = Math.sqrt(
            Math.pow(player.position.x - loot.position.x, 2) +
            Math.pow(player.position.y - loot.position.y, 2) +
            Math.pow(player.position.z - loot.position.z, 2)
          )

          const pickupRange = autoLootEnabled ? autoLootRange : 2
          const isInRange = distance < pickupRange
          const canPickup = (!loot.ownerId || loot.ownerId === player.id)

          if (isInRange && canPickup) {
            // Check auto-loot filter if enabled
            if (autoLootEnabled && autoLootFilter.length > 0) {
              const item = getItem(loot.item.id)
              if (item && !autoLootFilter.includes(item.type)) {
                return // Skip this item - not in filter
              }
            }

            // Pick up loot
            if (isConnected) {
              sendLootPickup(loot.id)
            } else {
              // Offline mode
              addItem(loot.item.id, 1)
              removeLootDrop(loot.id)
            }
          }
        })
      }
    }

    // Apply frame rate capping if on mobile
    let stopCap: (() => void) | null = null
    if (flags.isMobile && targetFPS < 60) {
      stopCap = frameRateCap.cap(targetFPS, gameLoop)
    } else {
      // Desktop: use standard requestAnimationFrame
      const standardLoop = () => {
        gameLoop()
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
  }, [player, enemies, lootDrops, isConnected, addEnemy, removeEnemy, updateEnemy, addXP, addCredits, addItem, addLootDrop, removeLootDrop])

  // Music integration - play zone music based on current zone
  useEffect(() => {
    if (player && isConnected) {
      const zone = player.zone || 'nexus_city'
      playZoneTrack(zone, true)
    }
  }, [player?.zone, isConnected])

  // Combat music - play when in combat
  useEffect(() => {
    const hasNearbyEnemies = Array.from(enemies.values()).some(enemy => {
      if (!player) return false
      const distance = Math.sqrt(
        Math.pow(player.position.x - enemy.position.x, 2) +
        Math.pow(player.position.y - enemy.position.y, 2) +
        Math.pow(player.position.z - enemy.position.z, 2)
      )
      return distance < 20
    })

    if (hasNearbyEnemies) {
      playCombatTrack('combat_normal', true)
    } else if (player) {
      const zone = player.zone || 'nexus_city'
      playZoneTrack(zone, true)
    }
  }, [enemies, player])

  // Handle player death
  useEffect(() => {
    if (player && player.health <= 0) {
      // Respawn player
      setTimeout(() => {
        updatePlayerHealth(player.maxHealth)
        useGameStore.getState().updatePlayerPosition({ x: 0, y: 1, z: 0 }) // Y=1 to stand on ground
      }, 2000)
    }
  }, [player, updatePlayerHealth])

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
        pointerEvents: 'auto'
      }}
    >
      <EnhancedScene spellProjectiles={spellProjectiles} />
      {isMobileDevice() && <TouchControls />}
      <AmbientSoundSystem />
      <PerformanceDashboard />
    </div>
  )
}

