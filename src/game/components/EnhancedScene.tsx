// src/game/components/EnhancedScene.tsx — WORKING WORLD VERSION
import { useMemo, Suspense, useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
// Critical components - load eagerly (Phase 1)
import PlayerControls from './PlayerControls'
import PlayerCamera from './PlayerCamera'
import Player from './Player'
import BuildingGrappleSystem from './BuildingGrappleSystem'
import { GrappleIndicatorLogic } from './GrappleIndicator'
import LandingFeedback from './LandingFeedback'
import GrappleTrail from './GrappleTrail'
import EnhancedTerrain from './EnhancedTerrain'
import SpaceSkybox from './SpaceSkybox'
import { useGameStore } from '../store/useGameStore'
import { getQualitySettings, getQualityManager } from '../utils/qualitySettings'
import { getDungeonPortals } from '../systems/dungeonSystem'
import { useLoadingPhase } from '../hooks/useLoadingPhase'
import { loadingOrchestrator } from '../utils/loadingOrchestrator'
import { renderingTracker } from '../utils/renderingTracker'
import { lazyWithErrorHandling } from '../utils/lazyWithErrorHandling'
import { SpellProjectile } from '../systems/spellSystem'
import { getGPUFrustumCuller } from '../utils/gpuFrustumCulling'
import { isFeatureEnabled } from '../utils/featureFlags'

// Phase 2 components - lazy load
const CyberpunkCity = lazyWithErrorHandling(() => import('./CyberpunkCity'), 'CyberpunkCity')
const DayNightCycleComponent = lazyWithErrorHandling(() => import('./DayNightCycleComponent'), 'DayNightCycleComponent')
const PortalZone = lazyWithErrorHandling(() => import('./PortalZone'), 'PortalZone')
const ShadowOptimizer = lazyWithErrorHandling(() => import('./ShadowOptimizer'), 'ShadowOptimizer')
// Instanced rendering components (always used for optimal performance)
const InstancedEnemies = lazyWithErrorHandling(() => import('./InstancedEnemies'), 'InstancedEnemies')
const InstancedLootDrops = lazyWithErrorHandling(() => import('./InstancedLootDrops'), 'InstancedLootDrops')
const InstancedResourceNodes = lazyWithErrorHandling(() => import('./InstancedResourceNodes'), 'InstancedResourceNodes')
const InstancedProjectiles = lazyWithErrorHandling(() => import('./InstancedProjectiles'), 'InstancedProjectiles')
const PowerUp = lazyWithErrorHandling(() => import('./PowerUp'), 'PowerUp')
const NPC = lazyWithErrorHandling(() => import('./NPC'), 'NPC')
const DungeonPortal = lazyWithErrorHandling(() => import('./DungeonPortal'), 'DungeonPortal')
const QuestObjectiveMarker = lazyWithErrorHandling(() => import('./QuestObjectiveMarker'), 'QuestObjectiveMarker')
const DungeonMap = lazyWithErrorHandling(() => import('../ui/DungeonMap'), 'DungeonMap')

// Phase 3 components - lazy load
const WeatherSystem = lazyWithErrorHandling(() => import('./WeatherSystem'), 'WeatherSystem')
const PuddleReflections = lazyWithErrorHandling(() => import('./PuddleReflections'), 'PuddleReflections')
const OcclusionCuller = lazyWithErrorHandling(() => import('./OcclusionCuller'), 'OcclusionCuller')
const PostProcessingSimple = lazyWithErrorHandling(() => import('./PostProcessingSimple'), 'PostProcessingSimple')
const BiomeEnvironment = lazyWithErrorHandling(() => import('./BiomeEnvironment'), 'BiomeEnvironment')

// Dev/debug components - lazy load
const FPSTracker = lazyWithErrorHandling(() => import('./FPSTracker'), 'FPSTracker')
const PerformanceProfiler = lazyWithErrorHandling(() => import('./PerformanceProfiler'), 'PerformanceProfiler')
const MovementDebugTracker = lazyWithErrorHandling(() => import('./MovementDebugTracker'), 'MovementDebugTracker')

// Helper for teleportToBiome (needs to be imported)
import { teleportToBiome } from '../systems/biomeTeleportSystem'

interface EnhancedSceneProps {
  spellProjectiles?: SpellProjectile[]
}

// SceneContent component handles game entities (enemies, loot, portals)
function SceneContent({ spellProjectiles = [] }: EnhancedSceneProps) {
  // Use selective subscriptions to reduce re-renders
  const enemies = useGameStore((state) => state.enemies)
  const currentDungeon = useGameStore((state) => state.currentDungeon)
  const isDungeonMapOpen = useGameStore((state) => state.isDungeonMapOpen)
  const dungeonProgress = useGameStore((state) => state.dungeonProgress)
  const resourceNodes = useGameStore((state) => state.resourceNodes)
  const lootDrops = useGameStore((state) => state.lootDrops)
  const powerUps = useGameStore((state) => state.powerUps)
  const npcs = useGameStore((state) => state.npcs)
  const activeQuests = useGameStore((state) => state.activeQuests)
  const qualitySettings = useMemo(() => getQualitySettings(), [])
  
  // Convert spell projectiles array to Map for instanced rendering
  const spellProjectilesMap = useMemo(() => {
    const map = new Map()
    spellProjectiles.forEach(proj => {
      map.set(proj.id, proj)
    })
    return map
  }, [spellProjectiles])

  // Filter enemies and loot based on quality settings
  const filteredEnemies = useMemo(() => {
    const enemyArray = Array.from(enemies.values())
    return new Map(enemyArray.slice(0, qualitySettings.maxEnemies).map(e => [e.id, e]))
  }, [enemies, qualitySettings.maxEnemies])

  const filteredLootDrops = useMemo(() => {
    const lootArray = Array.from(lootDrops.values())
    return new Map(lootArray.slice(0, qualitySettings.maxLootDrops).map(l => [l.id, l]))
  }, [lootDrops, qualitySettings.maxLootDrops])

  return (
    <Suspense fallback={null}>
      {/* Enemies - ALWAYS use instanced rendering for optimal performance (force enabled) */}
      <InstancedEnemies enemies={filteredEnemies} />

      {/* Resource Nodes - ALWAYS use instanced rendering (force enabled, no count threshold) */}
      <InstancedResourceNodes resourceNodes={resourceNodes} />

      {/* Loot Drops - ALWAYS use instanced rendering for optimal performance (force enabled) */}
      <InstancedLootDrops lootDrops={filteredLootDrops} />

      {/* Power-ups */}
      {Array.from(powerUps.values()).map(powerUp => (
        <PowerUp key={powerUp.id} powerUp={powerUp} />
      ))}

      {/* NPCs */}
      {Array.from(npcs.values()).map((npc) => (
        <NPC key={npc.id} npc={npc} />
      ))}

      {/* Dungeon Portals */}
      {getDungeonPortals().map(portal => (
        <DungeonPortal key={portal.id} portal={portal} />
      ))}

      {/* Spell Projectiles - ALWAYS use instanced rendering for optimal performance (force enabled) */}
      <InstancedProjectiles projectiles={spellProjectilesMap} />

      {/* Quest Objective Markers */}
      {activeQuests.map(quest => 
        quest.objectives
          .filter(obj => obj.current < obj.quantity) // Only show incomplete objectives
          .map(objective => (
            <QuestObjectiveMarker
              key={`${quest.questId}_${objective.id}`}
              questId={quest.questId}
              objectiveId={objective.id}
              type={objective.type}
              target={objective.target}
            />
          ))
      )}

      {/* Dungeon Map and UI (if active dungeon) */}
      {currentDungeon && isDungeonMapOpen && (
        <DungeonMap dungeon={currentDungeon} progress={dungeonProgress.get(currentDungeon.id)} />
      )}
    </Suspense>
  )
}

export default function EnhancedScene({ spellProjectiles = [] }: EnhancedSceneProps) {
  const { phase } = useLoadingPhase()
  const [_canvasReady, setCanvasReady] = useState(false)
  
  // Track context loss count and recovery attempts
  const contextLossCountRef = useRef(0)
  const lastContextLossTimeRef = useRef(0)
  const recoveryAttemptCountRef = useRef(0)
  
  // Determine which components to render based on loading phase
  const showPhase1 = phase === 'phase1' || phase === 'phase2' || phase === 'phase3' || phase === 'complete'
  const showPhase2 = phase === 'phase2' || phase === 'phase3' || phase === 'complete'
  const showPhase3 = phase === 'phase3' || phase === 'complete'
  
  // Always render canvas immediately for better LCP (even with minimal content)
  // Canvas will show skybox and basic terrain right away, then enhance progressively
  
  // Mark lighting as loaded when lights are rendered
  useEffect(() => {
    if (showPhase1) {
      loadingOrchestrator.markFeatureLoaded('Lighting')
    }
  }, [showPhase1])
  
  // Mark shadows as loaded when shadows are enabled
  useEffect(() => {
    if (showPhase2 && getQualitySettings().shadows) {
      loadingOrchestrator.markFeatureLoaded('Shadows')
    }
  }, [showPhase2])
  
  // Mark weather as loaded when weather system is rendered
  useEffect(() => {
    if (showPhase3) {
      loadingOrchestrator.markFeatureLoaded('Weather')
    }
  }, [showPhase3])
  
  // Mark post-processing as loaded when enabled
  useEffect(() => {
    if (showPhase3 && getQualitySettings().postProcessing) {
      loadingOrchestrator.markFeatureLoaded('Post Processing')
    }
  }, [showPhase3])
  
  // Keep 'always' mode for smooth continuous rendering (required for games)
  // The adaptive DPR and other optimizations will handle performance
  const fps = useGameStore((state) => state.fps)
  const frameloopMode = 'always' as const
  
  // Adaptive DPR based on FPS and phase
  const adaptiveDPR = useMemo(() => {
    if (phase !== 'complete') {
      // During loading, use reduced DPR
      return phase === 'phase1' ? 0.5 : 0.75
    }
    // After loading, adapt DPR based on FPS
    if (fps > 0 && fps < 30) {
      // Low FPS: reduce DPR to 1.0 (no pixel ratio scaling)
      return 1.0
    } else if (fps > 0 && fps < 45) {
      // Medium FPS: use 1.5x DPR
      return 1.5
    }
    // High FPS: use device pixel ratio (default, can be 2-3x on high-DPI)
    return undefined
  }, [phase, fps])

  // Handle WebGL context lost/restored events with improved recovery
  const handleContextLost = useMemo(() => (event: Event) => {
    event.preventDefault()
    
    const now = Date.now()
    contextLossCountRef.current += 1
    lastContextLossTimeRef.current = now
    
    // Warn if multiple context losses detected
    if (contextLossCountRef.current > 1) {
      console.warn(`⚠️ WebGL context lost (${contextLossCountRef.current} times). This may indicate memory or performance issues.`)
    } else {
      console.warn('⚠️ WebGL context lost. Attempting to recover...')
    }
    
    // Reset rendering tracker since context is lost
    import('../utils/renderingTracker').then(({ renderingTracker }) => {
      renderingTracker.reset()
    }).catch(() => {
      // Ignore errors if rendering tracker isn't available
    })
    
    // Immediately reduce quality settings to prevent further context loss
    const qualityManager = getQualityManager()
    const currentPreset = qualityManager.getSettings().preset
    
    // Always force to low on context loss - this is critical
    if (currentPreset !== 'low') {
      qualityManager.setPreset('low')
      console.warn('⚠️ Quality forced to "low" due to context loss')
    }
    
    // Trigger emergency memory cleanup immediately
    import('../utils/memoryManager').then(({ memoryManager }) => {
      // Force emergency cleanup to free as much memory as possible
      memoryManager.forceCleanup()
      
      // Also clear Three.js cache
      import('three').then(({ Cache }) => {
        Cache.clear()
      })
    })
    
    // Pause rendering to reduce load immediately
    setCanvasReady(false)
    
    // Reset recovery attempt count for exponential backoff
    recoveryAttemptCountRef.current = 0
    
    // If multiple context losses, warn user about potential issues
    if (contextLossCountRef.current >= 3) {
      console.error('⚠️ Multiple WebGL context losses detected. This may indicate:')
      console.error('   - GPU memory exhaustion')
      console.error('   - Too many resources loaded')
      console.error('   - Browser/device limitations')
      console.error('   - Consider closing other tabs or reducing game quality')
    }
  }, [])

  const handleContextRestored = useMemo(() => () => {
    console.log('✅ WebGL context restored')
    
    // Exponential backoff: wait longer after each recovery attempt
    // Base delay: 500ms, increases with each attempt (max 5 seconds)
    recoveryAttemptCountRef.current += 1
    const baseDelay = 500
    const backoffMultiplier = Math.min(recoveryAttemptCountRef.current, 10) // Cap at 10x
    const delay = baseDelay * backoffMultiplier
    
    if (import.meta.env.DEV && recoveryAttemptCountRef.current > 1) {
      console.log(`⏳ Waiting ${delay}ms before resuming (attempt ${recoveryAttemptCountRef.current})`)
    }
    
    // Perform aggressive cleanup before attempting recovery
    import('../utils/memoryManager').then(({ memoryManager }) => {
      memoryManager.forceCleanup()
      
      // Wait for cleanup to complete, then restore
      setTimeout(() => {
        setCanvasReady(true)
        
        // Re-initialize rendering tracker with new context
        // This will be done in onCreated, but we can also do it here if needed
        import('../utils/renderingTracker').then(({ renderingTracker }) => {
          // Tracker will be re-initialized in onCreated callback
          // Just reset it here to clear any stale state
          renderingTracker.reset()
        }).catch(() => {
          // Ignore errors if rendering tracker isn't available
        })
        
        // Force a re-render to restore the scene
        window.dispatchEvent(new Event('webgl-context-restored'))
        
        // Log recovery success
        if (import.meta.env.DEV) {
          console.log(`✅ WebGL context recovery complete - rendering resumed (delay: ${delay}ms)`)
        }
      }, delay)
    })
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas 
        shadows
        frameloop={frameloopMode}
        dpr={adaptiveDPR} // Adaptive DPR based on FPS and loading phase
        onCreated={({ gl, scene }) => {
          // Initialize frame time monitoring
          import('../utils/frameTimeMonitor').then(({ frameTimeMonitor }) => {
            frameTimeMonitor.startMonitoring()
          }).catch(() => {
            // Ignore if frame time monitor not available
          })
          
          // Initialize rendering tracker
          renderingTracker.initialize(scene, gl)
          
          // Initialize GPU frustum culling if supported (for large entity counts)
          if (import.meta.env.DEV) {
            try {
              const gpuCuller = getGPUFrustumCuller()
              const isSupported = gpuCuller.initialize(gl)
              if (isSupported) {
                console.log('[EnhancedScene] GPU frustum culling enabled')
              }
            } catch (error) {
              console.warn('[EnhancedScene] GPU culling not available:', error)
            }
          }
          
          // Mark Canvas as ready after a brief delay to ensure context is fully initialized
          setTimeout(() => {
            setCanvasReady(true)
          }, 0)
          
          // Set up WebGL context lost/restored handlers
          const canvas = gl.domElement
          
          // Store cleanup function for proper removal
          const contextLostHandler = (event: Event) => {
            handleContextLost(event)
          }
          const contextRestoredHandler = () => {
            handleContextRestored()
          }
          
          // Add event listeners with proper options
          canvas.addEventListener('webglcontextlost', contextLostHandler, false)
          canvas.addEventListener('webglcontextrestored', contextRestoredHandler, false)
          
          // Store cleanup on gl object for proper disposal
          ;(gl as any).__contextLostHandler = contextLostHandler
          ;(gl as any).__contextRestoredHandler = contextRestoredHandler
          
          // Check if context is already lost (defensive check)
          const context = gl.getContext() as WebGLRenderingContext | WebGL2RenderingContext | null
          if (context && context.isContextLost && context.isContextLost()) {
            console.warn('WebGL context was already lost on initialization')
            setCanvasReady(false)
          }
          
          // Log WebGL info for debugging
          if (import.meta.env.DEV && context && !context.isContextLost()) {
            console.log('WebGL Renderer initialized:', {
              vendor: context.getParameter(context.VENDOR),
              renderer: context.getParameter(context.RENDERER),
              version: context.getParameter(context.VERSION),
              maxTextureSize: context.getParameter(context.MAX_TEXTURE_SIZE),
            })
          }
          
          // Return cleanup function
          return () => {
            // Remove event listeners
            canvas.removeEventListener('webglcontextlost', contextLostHandler, false)
            canvas.removeEventListener('webglcontextrestored', contextRestoredHandler, false)
            
            // Clean up stored references
            delete (gl as any).__contextLostHandler
            delete (gl as any).__contextRestoredHandler
            
            // Dispose of WebGL resources to prevent memory leaks
            try {
              // Dispose of geometries, materials, and textures in the scene
              scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                  const mesh = object as THREE.Mesh
                  if (mesh.geometry) {
                    mesh.geometry.dispose()
                  }
                  if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                      mesh.material.forEach((mat: THREE.Material) => {
                        if (mat instanceof THREE.Material) {
                          mat.dispose()
                        }
                      })
                    } else if (mesh.material instanceof THREE.Material) {
                      mesh.material.dispose()
                    }
                  }
                }
              })
              
              // Dispose of renderer resources
              gl.dispose()
            } catch (error) {
              // Ignore disposal errors during cleanup
              if (import.meta.env.DEV) {
                console.warn('Error during WebGL cleanup:', error)
              }
            }
          }
        }}
      >
        {/* Render immediately for LCP - canvas ready check happens in onCreated */}
        {/* Phase 1: Critical components - render immediately (skybox + terrain for LCP) */}
        {showPhase1 && (
              <>
            {/* Mars Sky & Atmosphere */}
            <Suspense fallback={null}>
              <SpaceSkybox />
            </Suspense>

            {/* Basic Lighting System - minimal for Phase 1 */}
            <ambientLight intensity={0.25} />
            
            {/* Basic directional light (no shadows in Phase 1 to reduce load) */}
            {showPhase2 && getQualitySettings().shadows && isFeatureEnabled('shadowsEnabled') && (
              <directionalLight
                castShadow
                position={[50, 100, 50]}
                intensity={1.8}
                color="#ffffff"
                shadow-mapSize={getQualitySettings().preset === 'ultra' ? 4096 : getQualitySettings().preset === 'high' ? 2048 : 1024}
                shadow-camera-far={getQualitySettings().shadowDistance || 100}
                shadow-camera-left={-50}
                shadow-camera-right={50}
                shadow-camera-top={50}
                shadow-camera-bottom={-50}
                shadow-bias={0.001}
                shadow-normalBias={0.05}
                shadow-radius={getQualitySettings().preset === 'low' ? 2 : 4}
              />
            )}
            
            {/* Shadow optimizer - only in Phase 2+ */}
            {showPhase2 && isFeatureEnabled('shadowsEnabled') && (
              <Suspense fallback={null}>
                <ShadowOptimizer />
              </Suspense>
            )}
            
            {/* Enhanced Cyberpunk Terrain (ground) - Phase 1 */}
            <Suspense fallback={null}>
              <EnhancedTerrain />
            </Suspense>

            {/* Player & Controls - Phase 1 (critical for entering world) */}
            <PlayerCamera />
            <Player />
            <PlayerControls />
            <BuildingGrappleSystem />
            <GrappleIndicatorLogic />
            <LandingFeedback />
            <GrappleTrail visible={true} />
          </>
        )}

        {/* Phase 2: Important components - full city and lighting */}
        {showPhase2 && (
          <>
            {/* Cyberpunk accent lights */}
            <pointLight 
              position={[20, 15, 20]} 
              intensity={1.0} 
              color="#ff6b35" // Mars orange
              distance={40}
              decay={2}
            />
            <pointLight 
              position={[-20, 15, -20]} 
              intensity={1.0} 
              color="#ff8c42" // Mars amber
              distance={40}
              decay={2}
            />
            
            {/* Hemisphere light for ambient fill */}
            <hemisphereLight 
              args={['#2a1a0a', '#1a0a00', 0.4]} // Mars atmosphere
            />

            {/* Mars Cyberpunk City Buildings - Phase 2 */}
            <Suspense fallback={null}>
              <CyberpunkCity />
            </Suspense>
            
            {/* Portal Zone - Biome Portals */}
            <Suspense fallback={null}>
              <PortalZone 
                centerPosition={[0, 0, 0]}
                radius={30}
                onBiomeEnter={(biomeId) => {
                  teleportToBiome(biomeId)
                }}
              />
            </Suspense>

            {/* Basic fog - Phase 2 */}
            <fogExp2 attach="fog" args={['#1a1a2a', 0.025]} />

            {/* Mars Day/Night Cycle - Phase 2 */}
            <Suspense fallback={null}>
              <DayNightCycleComponent enabled={true} cycleDuration={300} />
            </Suspense>
          </>
        )}

        {/* Phase 3: Background components - weather, post-processing, biome environment */}
        {showPhase3 && (
          <>
            {/* Biome Environment - Updates sky, fog, and lighting based on current biome */}
            <Suspense fallback={null}>
              <BiomeEnvironment />
            </Suspense>
            
            {/* Enhanced Weather System - Neon rain with cyberpunk aesthetic */}
            {isFeatureEnabled('weatherEnabled') && (
              <Suspense fallback={null}>
                <WeatherSystem weatherType="cyber-rain" intensity={1.0} rainIntensity="medium" />
                <PuddleReflections />
              </Suspense>
            )}
            
            {/* Occlusion Culling for Mars horizon */}
            <OcclusionCuller />

            {/* Post-Processing Effects for Mars atmosphere - conditional based on quality and feature flag */}
            {getQualitySettings().postProcessing && isFeatureEnabled('postProcessingEnabled') && (
              <Suspense fallback={null}>
                <PostProcessingSimple enabled={true} />
              </Suspense>
            )}
          </>
        )}

        {/* Game Entities (Enemies, Loot, Portals) - Phase 2+ */}
        {showPhase2 && (
          <SceneContent spellProjectiles={spellProjectiles} />
        )}
        
            {/* FPS Tracker - Optional based on quality settings or dev mode */}
            {(import.meta.env.DEV || getQualitySettings().preset === 'ultra') && (
              <Suspense fallback={null}>
                <FPSTracker />
              </Suspense>
            )}
            
            {/* Performance Profiler - Only in dev mode, must be inside Canvas for R3F hooks */}
            {import.meta.env.DEV && (
              <Suspense fallback={null}>
                <PerformanceProfiler />
              </Suspense>
            )}
            
            {/* Movement Debug Tracker - Only in dev mode, must be inside Canvas for useFrame */}
            {import.meta.env.DEV && (
              <Suspense fallback={null}>
                <MovementDebugTracker />
              </Suspense>
            )}
      </Canvas>
    </div>
  )
}
