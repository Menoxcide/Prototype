import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import PlayerMesh from './PlayerMesh'
import Enemy from './Enemy'
import InstancedEnemies from './InstancedEnemies'
import InstancedLootDrops from './InstancedLootDrops'
import ResourceNode from './ResourceNode'
import Particles from './Particles'
import SpellProjectile from './SpellProjectile'
import OtherPlayer from './OtherPlayer'
import LootDrop from './LootDrop'
import DungeonPortal from './DungeonPortal'
import FPSTracker from './FPSTracker'
import DamageNumber from './DamageNumber'
import { getDungeonPortals } from '../systems/dungeonSystem'
import { createFrustumCuller } from '../utils/frustumCulling'
import { getQualitySettings } from '../utils/qualitySettings'

/**
 * GridLines component with proper resource cleanup
 */
function GridLines() {
  const gridGeometries = useMemo(() => {
    const geometries: THREE.BufferGeometry[] = []
    const materials: THREE.LineBasicMaterial[] = []
    
    for (let i = 0; i < 21; i++) {
      const pos = (i - 10) * 5
      const points1 = [
        new THREE.Vector3(-50, 0.01, pos),
        new THREE.Vector3(50, 0.01, pos)
      ]
      const points2 = [
        new THREE.Vector3(pos, 0.01, -50),
        new THREE.Vector3(pos, 0.01, 50)
      ]
      geometries.push(new THREE.BufferGeometry().setFromPoints(points1))
      geometries.push(new THREE.BufferGeometry().setFromPoints(points2))
      materials.push(new THREE.LineBasicMaterial({ color: '#00ffff', opacity: 0.2, transparent: true }))
      materials.push(new THREE.LineBasicMaterial({ color: '#00ffff', opacity: 0.2, transparent: true }))
    }
    
    return { geometries, materials }
  }, [])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      gridGeometries.geometries.forEach(geo => geo.dispose())
      gridGeometries.materials.forEach(mat => mat.dispose())
    }
  }, [gridGeometries])
  
  return (
    <>
      {Array.from({ length: 21 }).map((_, i) => {
        const geoIndex = i * 2
        return (
          <group key={`grid-${i}`}>
            <primitive object={new THREE.Line(gridGeometries.geometries[geoIndex], gridGeometries.materials[geoIndex])} />
            <primitive object={new THREE.Line(gridGeometries.geometries[geoIndex + 1], gridGeometries.materials[geoIndex + 1])} />
          </group>
        )
      })}
    </>
  )
}

interface SceneContentProps {
  spellProjectiles?: any[]
}

function SceneContent({ spellProjectiles = [] }: SceneContentProps) {
  const { player, enemies, resourceNodes, otherPlayers, lootDrops } = useGameStore()
  const cameraRef = useRef<THREE.PerspectiveCamera>(null)
  const frustumCuller = useMemo(() => createFrustumCuller(), [])
  const qualitySettings = useMemo(() => getQualitySettings(), [])
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
  
  // Filter enemies and loot based on quality settings
  const filteredEnemies = useMemo(() => {
    const enemyArray = Array.from(enemies.values())
    return new Map(enemyArray.slice(0, qualitySettings.maxEnemies).map(e => [e.id, e]))
  }, [enemies, qualitySettings.maxEnemies])
  
  const filteredLootDrops = useMemo(() => {
    const lootArray = Array.from(lootDrops.values())
    return new Map(lootArray.slice(0, qualitySettings.maxLootDrops).map(l => [l.id, l]))
  }, [lootDrops, qualitySettings.maxLootDrops])

  // Camera follow player and update frustum culling
  useFrame(() => {
    if (cameraRef.current && player) {
      const camera = cameraRef.current
      const targetX = player.position.x
      const targetY = player.position.y + 10
      const targetZ = player.position.z + 10

      // Smooth camera follow
      camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.05)
      camera.lookAt(player.position.x, player.position.y, player.position.z)

      // Update frustum culling
      frustumCuller.updateFrustum(camera)

      // Cull enemies
      visibleEntities.current.enemies.clear()
      enemies.forEach((enemy, id) => {
        if (frustumCuller.isInFrustum(enemy.position, 2, camera)) {
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

      // Cull resource nodes
      visibleEntities.current.resourceNodes.clear()
      resourceNodes.forEach((node, id) => {
        if (frustumCuller.isInFrustum(node.position, 1, camera)) {
          visibleEntities.current.resourceNodes.add(id)
        }
      })

      // Cull loot drops
      visibleEntities.current.lootDrops.clear()
      lootDrops.forEach((loot, id) => {
        if (frustumCuller.isInFrustum(loot.position, 0.5, camera)) {
          visibleEntities.current.lootDrops.add(id)
        }
      })
    }
  })

  if (!player) return null

  return (
    <>
      <PerspectiveCamera
        ref={cameraRef}
        makeDefault
        position={[0, 10, 10]}
        fov={qualitySettings.preset === 'low' ? 60 : 75}
      />

      {/* Lighting */}
      <ambientLight intensity={qualitySettings.preset === 'low' ? 0.5 : 0.3} />
      <pointLight position={[10, 10, 10]} intensity={qualitySettings.preset === 'low' ? 0.8 : 1} color="#00ffff" />
      <pointLight position={[-10, 10, -10]} intensity={qualitySettings.preset === 'low' ? 0.8 : 1} color="#ff00ff" />
      {qualitySettings.shadows && (
        <directionalLight position={[0, 20, 0]} intensity={0.5} castShadow />
      )}

      {/* Neon grid floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#0a0a0a"
          emissive="#001122"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Grid lines - memoized to prevent recreation */}
      <GridLines />

      {/* Player */}
      <PlayerMesh />

      {/* Other Players - Only render visible ones */}
      {Array.from(otherPlayers.values())
        .filter(otherPlayer => visibleEntities.current.otherPlayers.has(otherPlayer.id))
        .map(otherPlayer => (
          <OtherPlayer key={otherPlayer.id} player={otherPlayer} />
        ))}

      {/* Enemies - Use instanced rendering if enabled, otherwise individual */}
      {qualitySettings.instancedRendering ? (
        <InstancedEnemies enemies={filteredEnemies} />
      ) : (
        Array.from(filteredEnemies.values())
          .filter(enemy => visibleEntities.current.enemies.has(enemy.id))
          .map(enemy => (
            <Enemy key={enemy.id} enemy={enemy} />
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
      
      {/* Damage Numbers */}
      {Array.from(useGameStore.getState().damageNumbers.values()).map(dn => (
        <DamageNumber
          key={dn.id}
          id={dn.id}
          damage={dn.damage}
          position={dn.position}
          isCrit={dn.isCrit}
        />
      ))}
    </>
  )
}

interface SceneProps {
  spellProjectiles?: any[]
}

export default function Scene({ spellProjectiles = [] }: SceneProps) {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent spellProjectiles={spellProjectiles} />
    </Canvas>
  )
}

