/**
 * Shadowrun Rigger System
 * Quantum Rig archetype with Control Rig, RCC, and drone swarms
 */

export interface ControlRig {
  id: string
  name: string
  rating: number // 1-6
  bonus: {
    jumpedInPiloting: number
    jumpedInReaction: number
  }
}

export interface RCC {
  id: string
  name: string
  dataProcessing: number
  maxDrones: number // rating * 3
  autoSoftSharing: boolean
}

export interface Drone {
  id: string
  name: string
  type: 'combat' | 'recon' | 'utility'
  position: { x: number; y: number; z: number }
  rotation: number
  health: number
  maxHealth: number
  piloting: number
  sensor: number
  autosoft: {
    evasion?: number
    targeting?: number
    maneuvering?: number
  }
  controlMode: 'autopilot' | 'remote' | 'jumpedIn'
  controllerId?: string
}

export interface DroneSwarm {
  id: string
  name: string
  drones: Drone[]
  rccId: string
  controllerId: string
}

export type ControlTier = 'autopilot' | 'remote' | 'jumpedIn'

/**
 * Control tier hierarchy: Higher tier overrides lower
 */
export function canOverrideControl(currentTier: ControlTier, newTier: ControlTier): boolean {
  const tierOrder: Record<ControlTier, number> = {
    autopilot: 1,
    remote: 2,
    jumpedIn: 3
  }
  return tierOrder[newTier] > tierOrder[currentTier]
}

/**
 * Calculate drone defense based on control mode
 */
export function calculateDroneDefense(drone: Drone): number {
  switch (drone.controlMode) {
    case 'jumpedIn':
      return drone.piloting + 3 // Mental attributes override physical
    case 'remote':
      return drone.piloting + 2
    case 'autopilot':
      return drone.piloting + drone.autosoft.evasion || 0
    default:
      return drone.piloting
  }
}

/**
 * Check if player can jump into drone (requires Control Rig)
 */
export function canJumpIn(controlRig: ControlRig | null): boolean {
  return controlRig !== null && controlRig.rating > 0
}

