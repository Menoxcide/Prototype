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

function SceneContent({ spellProjectiles = [] }: SceneContentProps) {
  const { player, enemies, resourceNodes, otherPlayers, lootDrops } = useGameStore()
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

  // Log player state
  useEffect(() => {
    console.log('EnhancedScene SceneContent: Player state changed', { 
      hasPlayer: !!player, 
      playerId: player?.id, 
      playerName: player?.name,
      playerPosition: player?.position 
    })
  }, [player?.id, player?.name])

  // Preload assets on mount
  useEffect(() => {
    console.log('EnhancedScene: Preloading assets...')
    assetManager.preloadAssets().catch(err => {
      console.error('Failed to preload assets:', err)
    }).then(() => {
      console.log('EnhancedScene: Assets preloaded')
    }).catch(() => {
      // Silently fail if assets don't load - we'll use fallbacks
      console.warn('EnhancedScene: Asset preloading failed, using fallbacks')
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
    if (cameraRef.current && player) {
      const camera = cameraRef.current
      camera.position.set(player.position.x, player.position.y + 10, player.position.z + 10)
      camera.lookAt(player.position.x, player.position.y, player.position.z)
      camera.updateProjectionMatrix()
    }
  }, [player?.id]) // Initialize when player is first set

  // Camera follow player and update frustum culling
  // On mobile, update non-critical systems less frequently
  useFrame(() => {
    frameCountRef.current++
    const shouldUpdateCulling = !mobileFlags.isMobile || frameCountRef.current % 2 === 0 // Every 2 frames on mobile
    
    if (cameraRef.current && player) {
      const camera = cameraRef.current
      const targetX = player.position.x
      const targetY = player.position.y + 10
      const targetZ = player.position.z + 10

      // Smooth camera follow (always update)
      camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.05)
      camera.lookAt(player.position.x, player.position.y, player.position.z)

      // Update frustum culling (less frequently on mobile)
      if (shouldUpdateCulling) {
        frustumCuller.updateFrustum(camera)

        // Cull enemies with LOD integration
        visibleEntities.current.enemies.clear()
        enemies.forEach((enemy, id) => {
          const distance = Math.sqrt(
            Math.pow(enemy.position.x - player.position.x, 2) +
            Math.pow(enemy.position.y - player.position.y, 2) +
            Math.pow(enemy.position.z - player.position.z, 2)
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

  if (!player) {
    console.warn('EnhancedScene: No player found, rendering minimal scene')
    // Return minimal scene instead of null to help debug
    return (
      <>
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[0, 10, 10]}
          fov={75}
        />
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00ffff" />
        <pointLight position={[-10, 10, -10]} intensity={1.5} color="#ff00ff" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshStandardMaterial
            color="#1a1a2e"
            emissive="#001122"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* Visible test cubes */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={1} />
        </mesh>
        <mesh position={[3, 1, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
        </mesh>
        <mesh position={[-3, 1, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#0000ff" emissive="#0000ff" emissiveIntensity={1} />
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

      {/* Enhanced Lighting */}
      <ambientLight intensity={qualitySettings.preset === 'low' ? 0.9 : 1.0} />
      <pointLight 
        position={[10, 10, 10]} 
        intensity={qualitySettings.preset === 'low' ? 1.5 : 2.0} 
        color="#00ffff"
        distance={50}
        decay={2}
      />
      <pointLight 
        position={[-10, 10, -10]} 
        intensity={qualitySettings.preset === 'low' ? 1.5 : 2.0} 
        color="#ff00ff"
        distance={50}
        decay={2}
      />
      <pointLight 
        position={[0, 20, 0]} 
        intensity={0.3} 
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

      {/* Enhanced Ground with Texture */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 32, 32]} />
        <meshStandardMaterial
          {...(groundTexture ? { map: groundTexture } : {})}
          color="#3a3a5e"
          emissive="#001144"
          emissiveIntensity={1.0}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Debug: Always visible test cube to verify rendering */}
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
      </mesh>
      {/* Additional debug cubes for visibility */}
      <mesh position={[5, 2, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={1} />
      </mesh>
      <mesh position={[-5, 2, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1} />
      </mesh>

      {/* Enhanced Grid Lines with Glow - Always visible for better ground visibility */}
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
                  opacity: qualitySettings.preset === 'low' ? 0.4 : 0.5, 
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
                  opacity: qualitySettings.preset === 'low' ? 0.4 : 0.5, 
                  transparent: true,
                  linewidth: 2
                })
              )} 
            />
          </group>
        )
      })}

      {/* Enhanced Player */}
      <EnhancedPlayerMesh />

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

      {/* Post-Processing Effects */}
      <PostProcessingSimple enabled={qualitySettings.preset !== 'low'} />

      {/* Weather System */}
      <WeatherSystem weatherType="cyber-rain" intensity={0.5} />

      {/* Day/Night Cycle */}
      <DayNightCycleComponent enabled={qualitySettings.preset !== 'low'} />
    </>
  )
}

interface EnhancedSceneProps {
  spellProjectiles?: any[]
}

export default function EnhancedScene({ spellProjectiles = [] }: EnhancedSceneProps) {
  const mobileFlags = getMobileOptimizationFlags()
  const isMobile = isMobileDevice()
  
  // Mobile-optimized WebGL context settings
  const glConfig = isMobile ? {
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
  }

  // Use mobile-specific DPR (1 on mobile, [1, 2] on desktop)
  const dpr: number | [number, number] = isMobile ? mobileFlags.devicePixelRatio : [1, 2]

  return (
    <Canvas
      gl={glConfig}
      dpr={dpr}
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'block',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 0
      }}
      shadows={!isMobile || mobileFlags.enableShadows}
      onCreated={({ gl, scene, camera }) => {
        console.log('EnhancedScene: Canvas created', { gl, scene, camera })
        gl.setClearColor('#000022', 1)
        scene.background = new THREE.Color('#000022')
        console.log('EnhancedScene: Clear color set, background set')
        console.log('EnhancedScene: Canvas size:', gl.domElement.width, gl.domElement.height)
        
        // Force canvas to be visible
        const canvas = gl.domElement
        canvas.style.position = 'absolute'
        canvas.style.top = '0'
        canvas.style.left = '0'
        canvas.style.width = '100%'
        canvas.style.height = '100%'
        canvas.style.display = 'block'
        
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
      }}
    >
      <SceneContent spellProjectiles={spellProjectiles} />
    </Canvas>
  )
}

