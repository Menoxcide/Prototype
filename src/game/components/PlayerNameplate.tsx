import { Html } from '@react-three/drei'
import { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'

interface PlayerNameplateProps {
  playerId: string
  position: [number, number, number] // Relative position to parent group
}

/**
 * PlayerNameplate - Renders player name and health bar
 * When used as child of Player group, position is relative to group
 * Html component automatically handles world transform from parent
 * 
 * Hides own player's nameplate in first-person view to avoid blocking vision
 */
export default function PlayerNameplate({ playerId, position }: PlayerNameplateProps) {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
  const player = useGameStore((state) => 
    playerId === state.player?.id ? state.player : state.otherPlayers.get(playerId)
  )
  const cameraMode = useGameStore((state) => state.cameraMode)
  const isOwnPlayer = useGameStore((state) => playerId === state.player?.id)
  const isFirstPerson = cameraMode === 'first-person'
  
  // Create unique key for Html component to prevent React from reusing wrong instances
  // MUST be called before any early returns
  const htmlKey = useMemo(() => `nameplate-${playerId}`, [playerId])

  // Early return if player doesn't exist or playerId doesn't match
  // This prevents nameplates from showing for wrong players
  if (!player) return null
  
  // Double-check the playerId matches (prevent showing wrong player's nameplate)
  if (player.id !== playerId) {
    if (import.meta.env.DEV) {
      console.warn(`PlayerNameplate: playerId mismatch. Expected ${playerId}, got ${player.id}`)
    }
    return null
  }

  // Hide nameplate for own player in first-person view (to avoid blocking vision)
  // Show in third-person or for other players/enemies
  if (isOwnPlayer && isFirstPerson) return null

  const healthPercent = (player.health / player.maxHealth) * 100
  const healthColor = healthPercent > 60 ? '#00ff00' : healthPercent > 30 ? '#ffaa00' : '#ff0000'

  return (
    <Html
      key={htmlKey}
      position={position}
      center
      distanceFactor={10}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
        transform: 'translate3d(-50%, -50%, 0)',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.9) 0%, rgba(20, 20, 40, 0.9) 100%)',
          border: '2px solid #00ffff',
          borderRadius: '8px',
          padding: '8px 12px',
          minWidth: '150px',
          boxShadow: '0 4px 12px rgba(0, 255, 255, 0.3)',
          fontFamily: 'monospace',
          textAlign: 'center',
        }}
      >
        {/* Player Name */}
        <div
          style={{
            color: '#00ffff',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '4px',
            textShadow: '0 0 8px rgba(0, 255, 255, 0.8)',
          }}
        >
          {player.name}
        </div>

        {/* Level */}
        <div
          style={{
            color: '#ffff00',
            fontSize: '11px',
            marginBottom: '6px',
            opacity: 0.9,
          }}
        >
          Lv.{player.level}
        </div>

        {/* HP Bar */}
        <div
          style={{
            width: '100%',
            height: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            marginBottom: '2px',
          }}
        >
          <div
            style={{
              width: `${healthPercent}%`,
              height: '100%',
              backgroundColor: healthColor,
              background: `linear-gradient(90deg, ${healthColor} 0%, ${healthColor}dd 100%)`,
              boxShadow: `0 0 8px ${healthColor}`,
              transition: 'width 0.2s ease-out',
            }}
          />
        </div>

        {/* HP Text */}
        <div
          style={{
            color: '#ffffff',
            fontSize: '10px',
            marginTop: '2px',
            opacity: 0.8,
          }}
        >
          {Math.ceil(player.health)} / {player.maxHealth} HP
        </div>

        {/* Guild Tag */}
        {player.guildTag && (
          <div
            style={{
              color: '#9d00ff',
              fontSize: '10px',
              marginTop: '4px',
              opacity: 0.9,
            }}
          >
            [{player.guildTag}]
          </div>
        )}
      </div>
    </Html>
  )
}

