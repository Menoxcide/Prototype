import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import EnhancedPlayerMesh from './EnhancedPlayerMesh'
import EnhancedEnemy from './EnhancedEnemy'
import InstancedEnemies from './InstancedEnemies'
import InstancedLootDrops from './InstancedLootDrops'
import ResourceNode from './ResourceNode'
import Particles from './Particles'
import SpellProjectile from './SpellProjectile'
import OtherPlayer from './OtherPlayer'
import LootDrop from './LootDrop'
import DungeonPortal from './DungeonPortal'
import FPSTracker from './FPSTracker'
import { getDungeonPortals } from '../systems/dungeonSystem'
import { createFrustumCuller } from '../utils/frustumCulling'
import { getQualitySettings } from '../utils/qualitySettings'
import { assetManager } from '../assets/assetManager'
import PostProcessingSimple from './PostProcessingSimple'
import WeatherSystem from './WeatherSystem'
import DayNightCycleComponent from './DayNightCycleComponent'
import { getMobileOptimizationFlags, isMobileDevice } from '../utils/mobileOptimizations'
import { performanceProfiler, startReactProfiling } from '../utils/performanceProfiler'

interface SceneContentProps {
  spellProjectiles?: any[]
}

// Debug component that updates every frame to show player position
function DebugPlayerIndicators({ player }: { player: any }) {
  const greenBoxRef = useRef<THREE.Mesh>(null)
  const yellowBoxRef = useRef<THREE.Mesh>(null)
  const lineRef = useRef<THREE.Line>(null)
  
  useFrame(() => {
    // Get fresh player position every frame
    const currentPlayer = useGameStore.getState().player
    if (!currentPlayer) return
    
    const pos = currentPlayer.position
    
    // Update green box (above player)
    if (greenBoxRef.current) {
      greenBoxRef.current.position.set(pos.x, pos.y + 4, pos.z)
    }
    
    // Update yellow box (at player position)
    if (yellowBoxRef.current) {
      yellowBoxRef.current.position.set(pos.x, pos.y, pos.z)
    }
    
    // Update blue line (from origin to player)
    if (lineRef.current && lineRef.current.geometry) {
      const positions = new Float32Array([
        0, 0, 0,
        pos.x, pos.y, pos.z
      ])
      lineRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      lineRef.current.geometry.attributes.position.needsUpdate = true
    }
  })
  
  return (
    <>
      {/* Green box above player - updates every frame */}
      <mesh ref={greenBoxRef}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={5} />
      </mesh>
      {/* Yellow box at exact player position */}
      <mesh ref={yellowBoxRef}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={5} />
      </mesh>
      {/* Blue line from origin to player */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#0000ff" linewidth={3} />
      </line>
    </>
  )
}

function SceneContent({ spellProjectiles = [] }: SceneContentProps) {
  const { player, enemies, resourceNodes, otherPlayers, lootDrops, cameraMode } = useGameStore()
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const frustumCuller = useMemo(() => createFrustumCuller(), [])
  const qualitySettings = useMemo(() => getQualitySettings(), [])
  const mobileFlags = useMemo(() => getMobileOptimizationFlags(), [])
  const frameCountRef = useRef(0)
  const visibleEntities = useRef<{
    enemies: Set<string>
    otherPlayers: Set<string>
    resourceNodes: Set<string>
    lootDrops: Set<string>
  }>({
    enemies: new Set(),
    otherPlayers: new Set(),
    resourceNodes: new Set(),
    lootDrops: new Set()
  })

  // Log player state - only log when player ID changes, not on every position update
  useEffect(() => {
    if (player?.id && import.meta.env.DEV) {
      console.log('EnhancedScene SceneContent: Player state changed', { 
        hasPlayer: !!player, 
        playerId: player.id, 
        playerName: player.name,
        playerPosition: player.position
      })
    }
  }, [player?.id]) // Only log when player ID changes

  // Preload assets on mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('EnhancedScene: Preloading assets...')
    }
    assetManager.preloadAssets().catch(err => {
      console.error('Failed to preload assets:', err)
    }).then(() => {
      if (import.meta.env.DEV) {
        console.log('EnhancedScene: Assets preloaded')
      }
    }).catch(() => {
      // Silently fail if assets don't load - we'll use fallbacks
      if (import.meta.env.DEV) {
        console.warn('EnhancedScene: Asset preloading failed, using fallbacks')
      }
    })
  }, [])

  // Filter enemies and loot based on quality settings
  const filteredEnemies = useMemo(() => {
    const enemyArray = Array.from(enemies.values())
    return new Map(enemyArray.slice(0, qualitySettings.maxEnemies).map(e => [e.id, e]))
  }, [enemies, qualitySettings.maxEnemies])
  
  const filteredLootDrops = useMemo(() => {
    const lootArray = Array.from(lootDrops.values())
    return new Map(lootArray.slice(0, qualitySettings.maxLootDrops).map(l => [l.id, l]))
  }, [lootDrops, qualitySettings.maxLootDrops])

  // Initialize camera position on mount
  useEffect(() => {
    if (cameraRef.current) {
      const camera = cameraRef.current
      if (player) {
        camera.position.set(player.position.x, player.position.y + 10, player.position.z + 10)
        camera.lookAt(player.position.x, player.position.y, player.position.z)
      } else {
        // Default camera position when no player
        camera.position.set(0, 10, 10)
        camera.lookAt(0, 0, 0)
      }
      camera.updateProjectionMatrix()
    }
  }, [player?.id]) // Initialize when player is first set

  // Camera follow player and update frustum culling
  // On mobile, update non-critical systems less frequently
  useFrame(() => {
    frameCountRef.current++
    const shouldUpdateCulling = !mobileFlags.isMobile || frameCountRef.current % 2 === 0 // Every 2 frames on mobile
    
    if (cameraRef.current) {
      const camera = cameraRef.current
      
      // Get fresh player state and camera mode from store every frame
      const currentPlayer = useGameStore.getState().player
      const cameraMode = useGameStore.getState().cameraMode
      
      if (currentPlayer) {
        const oldCamX = camera.position.x
        const oldCamZ = camera.position.z
        
        if (cameraMode === 'first-person') {
          // First person: camera at player eye level, looking forward
          const targetX = currentPlayer.position.x
          const targetY = currentPlayer.position.y + 1.6 // Eye level
          const targetZ = currentPlayer.position.z
          
          // Camera follows player position exactly (no lerp for first person)
          camera.position.set(targetX, targetY, targetZ)
          
          // Look in the direction player is facing
          const lookX = targetX + Math.sin(currentPlayer.rotation) * 5
          const lookZ = targetZ + Math.cos(currentPlayer.rotation) * 5
          camera.lookAt(lookX, targetY, lookZ)
          
          // Debug: Log camera updates in first person (every significant move)
          if (import.meta.env.DEV && (Math.abs(oldCamX - targetX) > 0.01 || Math.abs(oldCamZ - targetZ) > 0.01)) {
            console.log('📷 First-person camera:', {
              mode: 'first-person',
              pos: { x: targetX.toFixed(3), y: targetY.toFixed(3), z: targetZ.toFixed(3) },
              lookAt: { x: lookX.toFixed(3), z: lookZ.toFixed(3) },
              playerPos: { x: currentPlayer.position.x.toFixed(3), z: currentPlayer.position.z.toFixed(3) },
              rotation: currentPlayer.rotation.toFixed(3)
            })
          }
        } else {
          // Third person: camera behind and above player
          const targetX = currentPlayer.position.x
          const targetY = currentPlayer.position.y + 10
          const targetZ = currentPlayer.position.z + 10

          // Smooth camera follow (always update) - faster lerp for responsiveness
          camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.2) // Increased lerp speed
          camera.lookAt(currentPlayer.position.x, currentPlayer.position.y, currentPlayer.position.z)
          
          // Debug: Log camera updates in third person (every significant move)
          if (import.meta.env.DEV && (Math.abs(oldCamX - targetX) > 0.01 || Math.abs(oldCamZ - targetZ) > 0.01)) {
            console.log('📷 Third-person camera:', {
              mode: 'third-person',
              actualPos: { x: camera.position.x.toFixed(3), y: camera.position.y.toFixed(3), z: camera.position.z.toFixed(3) },
              target: { x: targetX.toFixed(3), y: targetY.toFixed(3), z: targetZ.toFixed(3) },
              playerPos: { x: currentPlayer.position.x.toFixed(3), z: currentPlayer.position.z.toFixed(3) }
            })
          }
        }
        
        // Force camera matrix update
        camera.updateMatrixWorld(true)
      } else {
        // Default camera position when no player
        camera.position.lerp(new THREE.Vector3(0, 10, 10), 0.05)
        camera.lookAt(0, 0, 0)
      }

      // Update frustum culling (less frequently on mobile)
      if (shouldUpdateCulling && currentPlayer) {
        frustumCuller.updateFrustum(camera)

        // Cull enemies with LOD integration
        visibleEntities.current.enemies.clear()
        enemies.forEach((enemy, id) => {
          const distance = Math.sqrt(
            Math.pow(enemy.position.x - currentPlayer.position.x, 2) +
            Math.pow(enemy.position.y - currentPlayer.position.y, 2) +
            Math.pow(enemy.position.z - currentPlayer.position.z, 2)
          )
          const renderDistance = qualitySettings.renderDistance
          const result = frustumCuller.isInFrustumWithLOD(enemy.position, 2, camera, distance, renderDistance)
          if (result.visible) {
            visibleEntities.current.enemies.add(id)
          }
        })

        // Cull other players
        visibleEntities.current.otherPlayers.clear()
        otherPlayers.forEach((otherPlayer, id) => {
          if (frustumCuller.isInFrustum(otherPlayer.position, 1, camera)) {
            visibleEntities.current.otherPlayers.add(id)
          }
        })

        // Cull resource nodes (every 3 frames on mobile)
        if (!mobileFlags.isMobile || frameCountRef.current % 3 === 0) {
          visibleEntities.current.resourceNodes.clear()
          resourceNodes.forEach((node, id) => {
            if (frustumCuller.isInFrustum(node.position, 1, camera)) {
              visibleEntities.current.resourceNodes.add(id)
            }
          })
        }

        // Cull loot drops (every 3 frames on mobile)
        if (!mobileFlags.isMobile || frameCountRef.current % 3 === 0) {
          visibleEntities.current.lootDrops.clear()
          lootDrops.forEach((loot, id) => {
            if (frustumCuller.isInFrustum(loot.position, 0.5, camera)) {
              visibleEntities.current.lootDrops.add(id)
            }
          })
        }
      }
    }
  })

  // Always render scene, even without player (for debugging)
  // The minimal scene will help diagnose rendering issues
  if (!player) {
    if (import.meta.env.DEV) {
      console.warn('EnhancedScene: No player found, rendering minimal scene with debug objects')
      console.log('EnhancedScene: Player state:', { player, hasPlayer: !!player })
    }
    return (
      <>
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[0, 10, 10]}
          fov={75}
        />
        <ambientLight intensity={2.0} />
        <pointLight position={[10, 10, 10]} intensity={3.0} color="#00ffff" />
        <pointLight position={[-10, 10, -10]} intensity={3.0} color="#ff00ff" />
        <pointLight position={[0, 20, 0]} intensity={2.0} color="#ffffff" />
        <directionalLight position={[0, 30, 0]} intensity={1.0} />
        
        {/* Ground plane - larger and more visible with brighter colors */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[200, 200, 32, 32]} />
          <meshStandardMaterial
            color="#4a4a7e"
            emissive="#002244"
            emissiveIntensity={2.0}
            roughness={0.7}
            metalness={0.2}
          />
        </mesh>
        
        {/* Grid lines for visibility - brighter */}
        {Array.from({ length: 21 }).map((_, i) => {
          const pos = (i - 10) * 10
          const points1 = [
            new THREE.Vector3(-100, 0.02, pos),
            new THREE.Vector3(100, 0.02, pos)
          ]
          const points2 = [
            new THREE.Vector3(pos, 0.02, -100),
            new THREE.Vector3(pos, 0.02, 100)
          ]
          const geometry1 = new THREE.BufferGeometry().setFromPoints(points1)
          const geometry2 = new THREE.BufferGeometry().setFromPoints(points2)
          return (
            <group key={`grid-${i}`}>
              <primitive 
                object={new THREE.Line(
                  geometry1, 
                  new THREE.LineBasicMaterial({ 
                    color: '#00ffff', 
                    opacity: 1.0, 
                    transparent: false
                  })
                )} 
              />
              <primitive 
                object={new THREE.Line(
                  geometry2, 
                  new THREE.LineBasicMaterial({ 
                    color: '#00ffff', 
                    opacity: 1.0, 
                    transparent: false
                  })
                )} 
              />
            </group>
          )
        })}
        
        {/* Large visible test cubes - should always be visible - made even brighter */}
        <mesh position={[0, 2, 0]}>
          <boxGeometry args={[4, 4, 4]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} />
        </mesh>
        <mesh position={[5, 2, 0]}>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={3} />
        </mesh>
        <mesh position={[-5, 2, 0]}>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial color="#0000ff" emissive="#0000ff" emissiveIntensity={3} />
        </mesh>
        <mesh position={[0, 2, 5]}>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={3} />
        </mesh>
        <mesh position={[0, 2, -5]}>
          <boxGeometry args={[3, 3, 3]} />
          <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={3} />
        </mesh>
      </>
    )
  }

  // Get textures with fallback
  const groundTexture = useMemo(() => {
    try {
      const texture = assetManager.getTexture('ground') || assetManager.generateGroundTexture()
      if (texture) {
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(10, 10)
      }
      return texture
    } catch (error) {
      console.error('Failed to generate ground texture:', error)
      return undefined
    }
  }, [])

  // Log when we're about to render the main scene - only once when player is set
  useEffect(() => {
    if (player?.id && import.meta.env.DEV) {
      console.log('EnhancedScene SceneContent: Rendering main scene with player', {
        hasPlayer: !!player,
        playerId: player.id,
        playerName: player.name
      })
    }
  }, [player?.id]) // Only log when player ID changes

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 10, 10]}
        fov={qualitySettings.preset === 'low' ? 60 : 75}
      />

      {/* Enhanced Cyberpunk Sky - Commented out temporarily to debug black screen */}
      {/* <Sky
        distance={450000}
        sunPosition={[0, 1, 0]}
        inclination={0}
        azimuth={0.25}
        turbidity={10}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      /> */}

      {/* Enhanced Lighting - Increased intensity for better visibility */}
      <ambientLight intensity={qualitySettings.preset === 'low' ? 1.2 : 1.5} />
      <pointLight 
        position={[10, 10, 10]} 
        intensity={qualitySettings.preset === 'low' ? 2.0 : 2.5} 
        color="#00ffff"
        distance={50}
        decay={2}
      />
      <pointLight 
        position={[-10, 10, -10]} 
        intensity={qualitySettings.preset === 'low' ? 2.0 : 2.5} 
        color="#ff00ff"
        distance={50}
        decay={2}
      />
      <pointLight 
        position={[0, 20, 0]} 
        intensity={0.8} 
        color="#9d00ff"
        distance={100}
        decay={2}
      />
      {qualitySettings.shadows && (
        <directionalLight 
          position={[0, 30, 0]} 
          intensity={0.6} 
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={100}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
      )}

      {/* Enhanced Ground with Texture - Cyberpunk dark ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 32, 32]} />
        <meshStandardMaterial
          {...(groundTexture ? { map: groundTexture } : {})}
          color="#1a1a2e"
          emissive="#000011"
          emissiveIntensity={0.3}
          roughness={0.8}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Debug cubes removed - no longer needed */}

      {/* Enhanced Grid Lines with Glow - Always visible for better ground visibility - Brighter */}
      {Array.from({ length: 21 }).map((_, i) => {
        const pos = (i - 10) * 10
        const points1 = [
          new THREE.Vector3(-100, 0.02, pos),
          new THREE.Vector3(100, 0.02, pos)
        ]
        const points2 = [
          new THREE.Vector3(pos, 0.02, -100),
          new THREE.Vector3(pos, 0.02, 100)
        ]
        const geometry1 = new THREE.BufferGeometry().setFromPoints(points1)
        const geometry2 = new THREE.BufferGeometry().setFromPoints(points2)
        return (
          <group key={`grid-${i}`}>
            <primitive 
              object={new THREE.Line(
                geometry1, 
                new THREE.LineBasicMaterial({ 
                  color: '#00ffff', 
                  opacity: qualitySettings.preset === 'low' ? 0.7 : 0.8, 
                  transparent: true,
                  linewidth: 2
                })
              )} 
            />
            <primitive 
              object={new THREE.Line(
                geometry2, 
                new THREE.LineBasicMaterial({ 
                  color: '#00ffff', 
                  opacity: qualitySettings.preset === 'low' ? 0.7 : 0.8, 
                  transparent: true,
                  linewidth: 2
                })
              )} 
            />
          </group>
        )
      })}

      {/* Debug cube removed - was causing visual issues */}

      {/* Enhanced Player */}
      {player && (
        <>
          <EnhancedPlayerMesh />
          {/* Debug: Visual indicators at player position - always visible */}
          {import.meta.env.DEV && (
            <>
              {/* Green box above player */}
              <mesh position={[player.position.x, player.position.y + 4, player.position.z]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={5} />
              </mesh>
              {/* Yellow box at exact player position */}
              <mesh position={[player.position.x, player.position.y, player.position.z]}>
                <boxGeometry args={[0.5, 0.5, 0.5]} />
                <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={5} />
              </mesh>
              {/* Blue line from origin to player */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([
                      0, 0, 0,
                      player.position.x, player.position.y, player.position.z
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color="#0000ff" linewidth={3} />
              </line>
            </>
          )}
        </>
      )}

      {/* Other Players - Only render visible ones */}
      {Array.from(otherPlayers.values())
        .filter(otherPlayer => visibleEntities.current.otherPlayers.has(otherPlayer.id))
        .map(otherPlayer => (
          <OtherPlayer key={otherPlayer.id} player={otherPlayer} />
        ))}

      {/* Enhanced Enemies - Use instanced rendering if enabled, otherwise individual */}
      {qualitySettings.instancedRendering ? (
        <InstancedEnemies enemies={filteredEnemies} />
      ) : (
        Array.from(filteredEnemies.values())
          .filter(enemy => visibleEntities.current.enemies.has(enemy.id))
          .map(enemy => (
            <EnhancedEnemy key={enemy.id} enemy={enemy} />
          ))
      )}

      {/* Resource Nodes - Only render visible ones */}
      {Array.from(resourceNodes.values())
        .filter(node => visibleEntities.current.resourceNodes.has(node.id))
        .map(node => (
          <ResourceNode key={node.id} node={node} />
        ))}

      {/* Loot Drops - Use instanced rendering if enabled, otherwise individual */}
      {qualitySettings.instancedRendering ? (
        <InstancedLootDrops lootDrops={filteredLootDrops} />
      ) : (
        Array.from(filteredLootDrops.values())
          .filter(loot => visibleEntities.current.lootDrops.has(loot.id))
          .map(loot => (
            <LootDrop key={loot.id} loot={loot} />
          ))
      )}

      {/* Dungeon Portals */}
      {getDungeonPortals().map(portal => (
        <DungeonPortal key={portal.id} portal={portal} />
      ))}

      {/* Particles */}
      <Particles />

      {/* Spell Projectiles */}
      {spellProjectiles.map(projectile => (
        <SpellProjectile key={projectile.id} projectile={projectile} />
      ))}

      {/* FPS Tracker - Must be inside Canvas */}
      <FPSTracker />

      {/* Weather System - Render before post-processing */}
      <WeatherSystem weatherType="cyber-rain" intensity={0.5} />

      {/* Day/Night Cycle - Render before post-processing */}
      <DayNightCycleComponent enabled={qualitySettings.preset !== 'low'} />

      {/* Post-Processing Effects - Render last */}
      <PostProcessingSimple enabled={qualitySettings.preset !== 'low'} />
    </>
  )
}

interface EnhancedSceneProps {
  spellProjectiles?: any[]
}

export default function EnhancedScene({ spellProjectiles = [] }: EnhancedSceneProps) {
  // Memoize these values to prevent re-renders
  const mobileFlags = useMemo(() => getMobileOptimizationFlags(), [])
  const isMobile = useMemo(() => isMobileDevice(), [])
  
  // Mobile-optimized WebGL context settings - memoized to prevent recreation
  const glConfig = useMemo(() => isMobile ? {
    antialias: false, // Disable antialiasing on mobile
    alpha: false,
    powerPreference: 'high-performance' as const,
    stencil: false,
    depth: true,
    precision: 'mediump' as const, // Lower precision on mobile for better performance
    failIfMajorPerformanceCaveat: false
  } : {
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance' as const,
    stencil: false,
    depth: true
  }, [isMobile])

  // Use mobile-specific DPR (1 on mobile, [1, 2] on desktop) - memoized
  const dpr: number | [number, number] = useMemo(() => 
    isMobile ? mobileFlags.devicePixelRatio : [1, 2], 
    [isMobile, mobileFlags.devicePixelRatio]
  )

  // Log when EnhancedScene component mounts (only once)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('EnhancedScene: Component mounted', {
        isMobile,
        dpr
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount, not on every update

  return (
    <div 
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'hidden',
        backgroundColor: '#1a1a2e', // Fallback background color
        pointerEvents: 'auto'
      }}
    >
      <Canvas
        gl={glConfig}
        dpr={dpr}
        shadows={!isMobile || mobileFlags.enableShadows}
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          pointerEvents: 'auto'
        }}
        onCreated={({ gl, scene, camera }) => {
        if (import.meta.env.DEV) {
          console.log('EnhancedScene: Canvas created', { gl, scene, camera })
        }
        
        // Use a lighter background color for better visibility - changed from #001133 to #1a1a2e
        const bgColor = new THREE.Color('#1a1a2e')
        gl.setClearColor(bgColor, 1)
        scene.background = bgColor
        
        // Force a render to ensure something is visible
        gl.render(scene, camera)
        
        // Force canvas to be visible and properly sized
        const canvas = gl.domElement
        canvas.style.position = 'absolute'
        canvas.style.top = '0'
        canvas.style.left = '0'
        canvas.style.right = '0'
        canvas.style.bottom = '0'
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        canvas.style.display = 'block'
        canvas.style.zIndex = '1'
        canvas.style.visibility = 'visible'
        canvas.style.opacity = '1'
        canvas.style.pointerEvents = 'auto'
        
        // Set canvas size explicitly
        const setSize = () => {
          const width = window.innerWidth
          const height = window.innerHeight
          gl.setSize(width, height, false)
        }
        setSize()
        window.addEventListener('resize', setSize)
        
        // Enable performance profiling
        performanceProfiler.enable()
        performanceProfiler.enableThreeInspector(gl)
        startReactProfiling()
        
        // Log metrics every 5 seconds in development
        if (import.meta.env.DEV) {
          setInterval(() => {
            const metrics = performanceProfiler.getMetrics()
            if (metrics.fps < 30) {
              console.warn('Low FPS detected:', metrics)
            }
          }, 5000)
        }
      }}
      onError={(error) => {
        console.error('EnhancedScene: Canvas error:', error)
        console.error('EnhancedScene: Error details:', {
          message: error?.message,
          stack: error?.stack,
          error
        })
        // Try to recover by forcing a re-render
        setTimeout(() => {
          console.log('EnhancedScene: Attempting recovery after error')
        }, 1000)
      }}
    >
        <SceneContent spellProjectiles={spellProjectiles} />
      </Canvas>
    </div>
  )
}

