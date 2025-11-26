// src/game/components/EnhancedScene.tsx — WORKING WORLD VERSION
import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import MinecraftControls from './MinecraftControls'
import PlayerCamera from './PlayerCamera'
import Player from './Player'
import BuildingGrappleSystem from './BuildingGrappleSystem'
import EnhancedTerrain from './EnhancedTerrain'
import CyberpunkCity from './CyberpunkCity'
import WeatherSystem from './WeatherSystem'
import DayNightCycleComponent from './DayNightCycleComponent'
import PostProcessingSimple from './PostProcessingSimple'
import SpaceSkybox from './SpaceSkybox'
import { useGameStore } from '../store/useGameStore'
import { getQualitySettings } from '../utils/qualitySettings'
import { getDungeonPortals } from '../systems/dungeonSystem'
import Enemy from './Enemy'
import InstancedEnemies from './InstancedEnemies'
import InstancedLootDrops from './InstancedLootDrops'
import InstancedResourceNodes from './InstancedResourceNodes'
import InstancedProjectiles from './InstancedProjectiles'
import EnhancedSpellProjectile from './EnhancedSpellProjectile'
import LootDrop from './LootDrop'
import DungeonPortal from './DungeonPortal'
import ResourceNode from './ResourceNode'
import PortalZone from './PortalZone'
import ShadowOptimizer from './ShadowOptimizer'
import { teleportToBiome } from '../systems/biomeTeleportSystem'
import BiomeEnvironment from './BiomeEnvironment'
import FPSTracker from './FPSTracker'
import QuestObjectiveMarker from './QuestObjectiveMarker'

import { SpellProjectile } from '../systems/spellSystem'

interface EnhancedSceneProps {
  spellProjectiles?: SpellProjectile[]
}

// SceneContent component handles game entities (enemies, loot, portals)
function SceneContent({ spellProjectiles = [] }: EnhancedSceneProps) {
  // Use selective subscriptions to reduce re-renders
  const enemies = useGameStore((state) => state.enemies)
  const resourceNodes = useGameStore((state) => state.resourceNodes)
  const lootDrops = useGameStore((state) => state.lootDrops)
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
    <>
      {/* Enemies - Use instanced rendering if enabled, otherwise individual */}
      {qualitySettings.instancedRendering ? (
        <InstancedEnemies enemies={filteredEnemies} />
      ) : (
        Array.from(filteredEnemies.values()).map(enemy => (
          <Enemy key={enemy.id} enemy={enemy} />
        ))
      )}

      {/* Resource Nodes - Use instanced rendering if enabled and count > 10 */}
      {qualitySettings.instancedRendering && resourceNodes.size > 10 ? (
        <InstancedResourceNodes resourceNodes={resourceNodes} />
      ) : (
        Array.from(resourceNodes.values()).map(node => (
          <ResourceNode key={node.id} node={node} />
        ))
      )}

      {/* Loot Drops - Use instanced rendering if enabled, otherwise individual */}
      {qualitySettings.instancedRendering ? (
        <InstancedLootDrops lootDrops={filteredLootDrops} />
      ) : (
        Array.from(filteredLootDrops.values()).map(loot => (
          <LootDrop key={loot.id} loot={loot} />
        ))
      )}

      {/* Dungeon Portals */}
      {getDungeonPortals().map(portal => (
        <DungeonPortal key={portal.id} portal={portal} />
      ))}

      {/* Spell Projectiles - Use instanced rendering if count > 10 */}
      {qualitySettings.instancedRendering && spellProjectilesMap.size > 10 ? (
        <InstancedProjectiles projectiles={spellProjectilesMap} />
      ) : (
        spellProjectiles.map(proj => (
          <EnhancedSpellProjectile key={proj.id} projectile={proj} />
        ))
      )}

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
    </>
  )
}

export default function EnhancedScene({ spellProjectiles = [] }: EnhancedSceneProps) {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas shadows>
        {/* Mars Sky & Atmosphere */}
        <SpaceSkybox />

        {/* Enhanced Lighting System */}
        <ambientLight intensity={0.25} />
        
        {/* Main directional light with enhanced shadows - optimized update frequency */}
        {getQualitySettings().shadows && (
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
        
        {/* Shadow optimizer - reduces update frequency based on quality */}
        <ShadowOptimizer />
        
        {/* Cyberpunk accent lights - removed castShadow to reduce flickering */}
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

        {/* Enhanced Cyberpunk Terrain (ground) */}
        <EnhancedTerrain />

        {/* Mars Cyberpunk City Buildings */}
        <CyberpunkCity />
        
        {/* Portal Zone - Biome Portals */}
        <PortalZone 
          centerPosition={[0, 0, 0]}
          radius={30}
          onBiomeEnter={(biomeId) => {
            teleportToBiome(biomeId)
          }}
        />

        {/* Biome Environment - Updates sky, fog, and lighting based on current biome */}
        <BiomeEnvironment />
        
        {/* Enhanced Weather System - Rain with intensity levels */}
        <WeatherSystem weatherType="rain" intensity={1.0} rainIntensity="medium" />
        
        {/* Fog System - Atmospheric fog for depth (BiomeEnvironment will update this dynamically) */}
        <fogExp2 attach="fog" args={['#1a1a2a', 0.025]} />

        {/* Mars Day/Night Cycle */}
        <DayNightCycleComponent enabled={true} cycleDuration={300} />

        {/* Post-Processing Effects for Mars atmosphere - conditional based on quality */}
        <PostProcessingSimple enabled={getQualitySettings().postProcessing} />

        {/* Game Entities (Enemies, Loot, Portals) */}
        <SceneContent spellProjectiles={spellProjectiles} />

        {/* Player & Controls */}
        <PlayerCamera />
        <Player />
        <MinecraftControls />
        <BuildingGrappleSystem />
        
        {/* FPS Tracker - Optional based on quality settings or dev mode */}
        {(import.meta.env.DEV || getQualitySettings().preset === 'ultra') && <FPSTracker />}
      </Canvas>
    </div>
  )
}
