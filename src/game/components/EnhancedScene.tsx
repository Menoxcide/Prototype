// src/game/components/EnhancedScene.tsx — WORKING WORLD VERSION
import { useMemo, Suspense } from 'react'
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
import { useLoadingPhase } from '../hooks/useLoadingPhase'
import DungeonMap from '../ui/DungeonMap'
import { useGameStore } from '../store/useGameStore'

import { SpellProjectile } from '../systems/spellSystem'

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

      {/* Dungeon Map and UI (if active dungeon) */}
      {currentDungeon && isDungeonMapOpen && (
        <DungeonMap dungeon={currentDungeon} progress={dungeonProgress.get(currentDungeon.id)} />
      )}
    </>
  )
}

export default function EnhancedScene({ spellProjectiles = [] }: EnhancedSceneProps) {
  const { phase } = useLoadingPhase()
  
  // Determine which components to render based on loading phase
  const showPhase1 = phase === 'phase1' || phase === 'phase2' || phase === 'phase3' || phase === 'complete'
  const showPhase2 = phase === 'phase2' || phase === 'phase3' || phase === 'complete'
  const showPhase3 = phase === 'phase3' || phase === 'complete'

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas shadows>
        {/* Phase 1: Critical components - always render once phase system is active */}
        {showPhase1 && (
          <>
            {/* Mars Sky & Atmosphere */}
            <Suspense fallback={null}>
              <SpaceSkybox />
            </Suspense>

            {/* Basic Lighting System - minimal for Phase 1 */}
            <ambientLight intensity={0.25} />
            
            {/* Basic directional light (no shadows in Phase 1 to reduce load) */}
            {showPhase2 && getQualitySettings().shadows && (
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
            {showPhase2 && <ShadowOptimizer />}
            
            {/* Enhanced Cyberpunk Terrain (ground) - Phase 1 */}
            <Suspense fallback={null}>
              <EnhancedTerrain />
            </Suspense>

            {/* Player & Controls - Phase 1 (critical for entering world) */}
            <PlayerCamera />
            <Player />
            <MinecraftControls />
            <BuildingGrappleSystem />
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
            <PortalZone 
              centerPosition={[0, 0, 0]}
              radius={30}
              onBiomeEnter={(biomeId) => {
                teleportToBiome(biomeId)
              }}
            />

            {/* Basic fog - Phase 2 */}
            <fogExp2 attach="fog" args={['#1a1a2a', 0.025]} />

            {/* Mars Day/Night Cycle - Phase 2 */}
            <DayNightCycleComponent enabled={true} cycleDuration={300} />
          </>
        )}

        {/* Phase 3: Background components - weather, post-processing, biome environment */}
        {showPhase3 && (
          <>
            {/* Biome Environment - Updates sky, fog, and lighting based on current biome */}
            <Suspense fallback={null}>
              <BiomeEnvironment />
            </Suspense>
            
            {/* Enhanced Weather System - Rain with intensity levels */}
            <Suspense fallback={null}>
              <WeatherSystem weatherType="rain" intensity={1.0} rainIntensity="medium" />
            </Suspense>

            {/* Post-Processing Effects for Mars atmosphere - conditional based on quality */}
            {getQualitySettings().postProcessing && (
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
        {(import.meta.env.DEV || getQualitySettings().preset === 'ultra') && <FPSTracker />}
      </Canvas>
    </div>
  )
}
