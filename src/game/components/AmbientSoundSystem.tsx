/**
 * Ambient Sound System
 * Plays ambient sounds based on biome, weather, and time of day
 */

import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import { BIOMES } from '../data/biomes'
import { soundManager } from '../assets/soundManager'

export default function AmbientSoundSystem() {
  const { player, currentZone } = useGameStore()
  const ambientSoundRef = useRef<HTMLAudioElement | null>(null)
  const lastBiomeRef = useRef<string | null>(null)

  useEffect(() => {
    if (!player) return

    // Determine current biome (simplified - would use actual position)
    const biome = BIOMES.find(b => b.id === currentZone) || BIOMES[0]
    
    if (biome.id !== lastBiomeRef.current) {
      lastBiomeRef.current = biome.id

      // Stop previous ambient sound
      if (ambientSoundRef.current) {
        ambientSoundRef.current.pause()
        ambientSoundRef.current = null
      }

      // Play biome-specific ambient sounds
      if (biome.ambientSounds && biome.ambientSounds.length > 0) {
        // Generate or load ambient sound
        const ambientSound = soundManager.generateSound(`ambient_${biome.id}`, 'ui')
        
        // Set up looping ambient sound
        ambientSound.loop = true
        ambientSound.volume = 0.2 // Low volume for ambient
        ambientSound.play().catch(() => {
          // Ignore autoplay errors
        })

        ambientSoundRef.current = ambientSound
      }
    }

    return () => {
      if (ambientSoundRef.current) {
        ambientSoundRef.current.pause()
        ambientSoundRef.current = null
      }
    }
  }, [player, currentZone])

  return null // This component doesn't render anything
}

