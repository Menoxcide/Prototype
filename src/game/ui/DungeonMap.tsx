/**
 * Dungeon Map Component
 * Displays the dungeon layout, player position, cleared rooms, and entities
 */

import React from 'react'
import { Html } from '@react-three/drei'
import { Dungeon, DungeonProgress } from '../../../shared/src/types/dungeons'
import { useGameStore } from '../store/useGameStore'
import { useTranslation } from '../hooks/useTranslation'

interface DungeonMapProps {
  dungeon: Dungeon
  progress?: DungeonProgress
}

const CELL_SIZE = 10 // Size of each cell in the UI map

const DungeonMap: React.FC<DungeonMapProps> = ({ dungeon, progress }) => {
  const { t } = useTranslation()
  const { player } = useGameStore()

  if (!dungeon || !player) return null

  const currentFloor = progress?.currentFloor || 0
  const layout = dungeon.layout.grid[currentFloor]

  if (!layout) return null

  // Find which room the player is currently in
  const playerRoomId = dungeon.rooms.find(room =>
    player.position.x >= room.bounds.minX && player.position.x <= room.bounds.maxX &&
    player.position.z >= room.bounds.minY && player.position.z <= room.bounds.maxY &&
    currentFloor === room.bounds.minZ // Assuming Z corresponds to floor
  )?.id

  return (
    <Html position={[-window.innerWidth / 2 + 200, window.innerHeight / 2 - 200, 0]} transform>
      <div className="bg-gray-900 bg-opacity-80 p-4 rounded-lg shadow-lg text-white font-mono">
        <h3 className="text-xl font-bold mb-2 text-cyan-400">
          {t('dungeon.title')} - {t('dungeon.floor', { number: currentFloor + 1 })}
        </h3>
        <div className="grid gap-0.5" style={{
          gridTemplateColumns: `repeat(${dungeon.layout.width}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${dungeon.layout.height}, ${CELL_SIZE}px)`
        }}>
          {layout.map((row, y) => (
            row.map((cell, x) => {
              const isPlayerHere = player.position.x >= x && player.position.x < x + 1 &&
                                   player.position.z >= y && player.position.z < y + 1 // Simplified check
              const isCleared = progress?.roomsCleared.includes(cell.roomId || '')
              const isCurrentRoom = cell.roomId === playerRoomId

              let bgColor = 'bg-gray-700' // Wall
              if (cell.type === 'floor' || cell.type === 'spawn' || cell.type === 'boss') {
                bgColor = 'bg-gray-800' // Floor
                if (isCurrentRoom) bgColor = 'bg-blue-600' // Current room
                if (isCleared) bgColor = 'bg-green-700' // Cleared room
              }
              if (cell.type === 'door') bgColor = 'bg-yellow-600' // Door
              if (cell.type === 'spawn') bgColor = 'bg-purple-600' // Spawn
              if (cell.type === 'boss') bgColor = 'bg-red-600' // Boss

              return (
                <div
                  key={`${x}-${y}`}
                  className={`w-[${CELL_SIZE}px] h-[${CELL_SIZE}px] ${bgColor} flex items-center justify-center`}
                >
                  {isPlayerHere && <span className="text-yellow-300 text-xs">P</span>}
                </div>
              )
            })
          ))}
        </div>
        <div className="mt-4 text-sm">
          <p>{t('dungeon.roomsCleared', { cleared: progress?.roomsCleared.length || 0, total: dungeon.rooms.length })}</p>
          <p>{t('dungeon.entitiesDefeated', { defeated: progress?.entitiesDefeated.length || 0, total: dungeon.entities.length })}</p>
        </div>
      </div>
    </Html>
  )
}

export default DungeonMap

