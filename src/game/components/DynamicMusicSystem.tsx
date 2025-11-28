/**
 * Dynamic Music System
 * Ambient synthwave OST that ramps during chases and adapts to gameplay state
 */

import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import { audioTrackManager } from '../assets/audioTracks'
import { soundManager } from '../assets/soundManager'

type GameplayState = 'exploration' | 'parkour' | 'combat' | 'chase'

export default function DynamicMusicSystem() {
  const player = useGameStore((s) => s.player)
  const enemies = useGameStore((s) => s.enemies)
  const isPlayerMoving = useGameStore((s) => s.isPlayerMoving)
  const grappledBuilding = useGameStore((s) => s.grappledBuilding)
  const currentStateRef = useRef<GameplayState>('exploration')
  const musicVolumeRef = useRef(0.3)
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!player) return

    // Determine gameplay state
    const isGrappling = grappledBuilding !== null
    const isMoving = isPlayerMoving
    const hasNearbyEnemies = Array.from(enemies.values()).some(enemy => {
      if (!player) return false
      const dx = enemy.position.x - player.position.x
      const dy = enemy.position.y - player.position.y
      const dz = enemy.position.z - player.position.z
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
      return distance < 30 // Within 30 units
    })

    let newState: GameplayState = 'exploration'
    if (hasNearbyEnemies) {
      newState = 'chase' // Chase mode when enemies nearby
    } else if (isGrappling || (isMoving && !hasNearbyEnemies)) {
      newState = 'parkour' // Parkour mode during movement
    }

    // Update music based on state
    if (newState !== currentStateRef.current) {
      currentStateRef.current = newState

      // Ramp volume based on intensity
      const targetVolume = newState === 'chase' ? 0.7 :
                          newState === 'parkour' ? 0.5 :
                          0.3

      // Smooth volume transition
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
      }

      const fadeStep = 0.05
      const fadeInterval = setInterval(() => {
        const currentVolume = musicVolumeRef.current
        if (Math.abs(currentVolume - targetVolume) < fadeStep) {
          musicVolumeRef.current = targetVolume
          clearInterval(fadeInterval)
          fadeIntervalRef.current = null
        } else {
          musicVolumeRef.current += currentVolume < targetVolume ? fadeStep : -fadeStep
        }

        // Update music volume
        // Note: This would need to be integrated with audioTrackManager
        // For now, we'll use the soundManager
        soundManager.setMusicVolume(musicVolumeRef.current)
      }, 50) // Update every 50ms for smooth fade

      fadeIntervalRef.current = fadeInterval
    }

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current)
      }
    }
  }, [player, enemies, isPlayerMoving, grappledBuilding])

  // Initialize ambient synthwave track
  useEffect(() => {
    if (!player) return

    // Play ambient synthwave track
    // In production, this would load an actual synthwave track
    // For now, we'll use the zone track system
    audioTrackManager.playMenuTrack('menu_main', true)

    return () => {
      audioTrackManager.stopTrack(true)
    }
  }, [player])

  return null
}

