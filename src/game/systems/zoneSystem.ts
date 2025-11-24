import { Zone } from '../types'
import { getZone, getZoneByLevel, ZONES } from '../data/zones'

export interface ZoneTransition {
  fromZone: string
  toZone: string
  position: { x: number; y: number; z: number }
  requiredLevel: number
}

export function canEnterZone(playerLevel: number, zoneId: string): boolean {
  const zone = getZone(zoneId)
  if (!zone) return false
  return playerLevel >= zone.levelRange[0] && playerLevel <= zone.levelRange[1]
}

export function getAvailableZones(playerLevel: number): Zone[] {
  // Return all zones the player can access
  return ZONES.filter((zone: Zone) => 
    playerLevel >= zone.levelRange[0] && playerLevel <= zone.levelRange[1]
  )
}

export function getRecommendedZone(playerLevel: number): Zone | undefined {
  return getZoneByLevel(playerLevel)
}

export function checkZoneTransition(
  playerPosition: { x: number; y: number; z: number },
  currentZone: string
): string | null {
  // Check if player is at zone boundary
  // Zone transitions happen at specific coordinates
  const transitions: ZoneTransition[] = [
    {
      fromZone: 'nexus_city',
      toZone: 'quantum_peak',
      position: { x: 50, y: 0, z: 0 },
      requiredLevel: 10
    },
    {
      fromZone: 'quantum_peak',
      toZone: 'void_depths',
      position: { x: 100, y: 0, z: 0 },
      requiredLevel: 20
    }
  ]

  for (const transition of transitions) {
    if (transition.fromZone !== currentZone) continue

    const distance = Math.sqrt(
      Math.pow(playerPosition.x - transition.position.x, 2) +
      Math.pow(playerPosition.z - transition.position.z, 2)
    )

    if (distance < 5) {
      return transition.toZone
    }
  }

  return null
}

