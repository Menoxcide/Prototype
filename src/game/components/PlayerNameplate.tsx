import { Html } from '@react-three/drei'
import { useGameStore } from '../store/useGameStore'

interface PlayerNameplateProps {
  playerId: string
  position: [number, number, number] // Relative position to parent group
}

/**
 * PlayerNameplate - Renders player name and health bar
 * When used as child of Player group, position is relative to group
 * Html component automatically handles world transform from parent
 */
export default function PlayerNameplate({ playerId, position }: PlayerNameplateProps) {
  const player = useGameStore((state) => 
    playerId === state.player?.id ? state.player : state.otherPlayers.get(playerId)
  )

  if (!player) return null

  const healthPercent = (player.health / player.maxHealth) * 100
  const healthColor = healthPercent > 60 ? '#00ff00' : healthPercent > 30 ? '#ffaa00' : '#ff0000'

  return (
    <Html
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

