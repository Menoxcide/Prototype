/**
 * Minimap Component - Shows world map with player location and markers
 */

import { useState, useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { BIOMES } from '../data/biomes'
import { getAllBiomeSpawnPoints } from '../data/biomeSpawns'
import DraggableResizable from '../components/DraggableResizable'

const MINIMAP_SIZE = 200
const WORLD_SIZE = 1000 // Approximate world size
const SCALE = MINIMAP_SIZE / WORLD_SIZE // Scale factor for converting world coordinates to minimap coordinates

interface MapMarker {
  id: string
  x: number
  z: number
  type: 'player' | 'quest' | 'enemy' | 'loot' | 'town' | 'portal'
  label?: string
  color?: string
}

export default function Minimap() {
  const { player, activeQuests, enemies: _enemies, lootDrops: _lootDrops, isMinimapOpen, toggleMinimap } = useGameStore()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoom, setZoom] = useState(1.0)

  // Get biome spawn points for map
  const biomeSpawns = useMemo(() => getAllBiomeSpawnPoints(), [])

  // Calculate player position on map
  const playerMarker: MapMarker | null = useMemo(() => {
    if (!player) return null
    return {
      id: 'player',
      x: player.position.x,
      z: player.position.z,
      type: 'player',
      label: player.name
    }
  }, [player])

  // Quest markers
  const questMarkers: MapMarker[] = useMemo(() => {
    if (!activeQuests || activeQuests.length === 0) return []
    
    // For now, show quest markers at biome centers
    // In a full implementation, this would use actual quest objective locations
    return activeQuests.map(quest => {
      // Find biome for quest level
      const questLevel = quest.objectives[0]?.target || 'sunflower_meadows'
      const spawn = biomeSpawns.get(questLevel) || biomeSpawns.values().next().value
      
      return {
        id: `quest_${quest.questId}`,
        x: spawn?.x || 0,
        z: spawn?.z || 0,
        type: 'quest',
        label: `Quest: ${quest.questId}`,
        color: '#00ff00'
      }
    })
  }, [activeQuests, biomeSpawns])

  // Convert world coordinates to minimap coordinates
  const worldToMap = (worldX: number, worldZ: number) => {
    // Use scale constant for clarity and consistency
    const mapX = worldX * SCALE * zoom + MINIMAP_SIZE / 2
    const mapZ = worldZ * SCALE * zoom + MINIMAP_SIZE / 2
    return { x: mapX, z: mapZ }
  }

  // Render biome zones
  const renderBiomes = () => {
    return Array.from(biomeSpawns.entries()).map(([biomeId, spawn]) => {
      const biome = BIOMES.find(b => b.id === biomeId)
      if (!biome) return null
      
      const { x, z } = worldToMap(spawn.x, spawn.z)
      const size = 20 * zoom
      
      return (
        <div
          key={biomeId}
          className="absolute rounded-full border-2 opacity-30"
          style={{
            left: `${x - size / 2}px`,
            top: `${z - size / 2}px`,
            width: `${size}px`,
            height: `${size}px`,
            borderColor: biome.color,
            backgroundColor: `${biome.color}20`
          }}
          title={biome.name}
        />
      )
    })
  }

  // Render markers
  const renderMarker = (marker: MapMarker) => {
    const { x, z } = worldToMap(marker.x, marker.z)
    const markerSize = marker.type === 'player' ? 8 : 6
    
    const colors: Record<MapMarker['type'], string> = {
      player: '#00ffff',
      quest: '#00ff00',
      enemy: '#ff0000',
      loot: '#ffff00',
      town: '#0099ff',
      portal: '#ff00ff'
    }

    return (
      <div
        key={marker.id}
        className="absolute transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: `${x}px`,
          top: `${z}px`,
          width: `${markerSize}px`,
          height: `${markerSize}px`,
          backgroundColor: marker.color || colors[marker.type],
          borderRadius: '50%',
          border: '2px solid #000',
          boxShadow: `0 0 4px ${marker.color || colors[marker.type]}`,
          zIndex: marker.type === 'player' ? 10 : 5
        }}
        title={marker.label}
      >
        {marker.type === 'player' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </div>
    )
  }

  if (!isMinimapOpen) return null

  const content = (
    <div className="relative w-full h-full bg-gray-900 border-2 border-cyan-500 rounded-lg overflow-hidden">
      {/* Map background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          {Array.from({ length: 10 }).map((_, i) => (
            <g key={i}>
              <line
                x1={0}
                y1={(i * MINIMAP_SIZE) / 10}
                x2={MINIMAP_SIZE}
                y2={(i * MINIMAP_SIZE) / 10}
                stroke="#00ffff"
                strokeWidth="0.5"
              />
              <line
                x1={(i * MINIMAP_SIZE) / 10}
                y1={0}
                x2={(i * MINIMAP_SIZE) / 10}
                y2={MINIMAP_SIZE}
                stroke="#00ffff"
                strokeWidth="0.5"
              />
            </g>
          ))}
        </svg>

        {/* Biome zones */}
        {renderBiomes()}

        {/* Markers */}
        {playerMarker && renderMarker(playerMarker)}
        {questMarkers.map(renderMarker)}

        {/* Center indicator (origin) */}
        <div
          className="absolute w-1 h-1 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: '50%',
            top: '50%'
          }}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-2 right-2 flex gap-2">
        <button
          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
          className="bg-gray-800 hover:bg-gray-700 text-cyan-400 px-2 py-1 rounded text-sm"
        >
          −
        </button>
        <button
          onClick={() => setZoom(Math.min(2.0, zoom + 0.25))}
          className="bg-gray-800 hover:bg-gray-700 text-cyan-400 px-2 py-1 rounded text-sm"
        >
          +
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="bg-gray-800 hover:bg-gray-700 text-cyan-400 px-2 py-1 rounded text-sm"
        >
          {isFullscreen ? '⊟' : '⊞'}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-2 left-2 bg-gray-900/90 border border-cyan-500 rounded p-2 text-xs">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-gray-300">You</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-gray-300">Quest</span>
        </div>
      </div>
    </div>
  )

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center pointer-events-auto">
        <div className="w-[80vw] h-[80vh] max-w-4xl max-h-4xl">
          {content}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded"
          >
            Close Fullscreen
          </button>
        </div>
      </div>
    )
  }

  return (
    <DraggableResizable
      id="minimap"
      storageKey="minimap"
      defaultPosition={{ x: 20, y: 20 }}
      defaultSize={{ width: MINIMAP_SIZE + 40, height: MINIMAP_SIZE + 60 }}
      minWidth={MINIMAP_SIZE}
      minHeight={MINIMAP_SIZE + 60}
      className="pointer-events-auto z-30"
      header={
        <div className="flex justify-between items-center px-2 py-1 bg-gray-900 border-b border-cyan-500">
          <span className="text-cyan-400 font-bold text-sm">Minimap</span>
          <button
            onClick={toggleMinimap}
            className="text-gray-400 hover:text-white text-lg"
          >
            ×
          </button>
        </div>
      }
    >
      {content}
    </DraggableResizable>
  )
}

