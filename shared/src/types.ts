/**
 * Shared types used across client and server
 */

export interface Vector3 {
  x: number
  y: number
  z: number
}

export interface Vector2 {
  x: number
  y: number
}

export interface Entity {
  id: string
  position: Vector3
  rotation?: number
}

export interface BoundingBox {
  min: Vector3
  max: Vector3
}

export interface DeltaUpdate {
  path: string
  value: any
  operation: 'set' | 'delete' | 'add' | 'remove'
}

export interface PlayerState {
  id: string
  position: Vector3
  rotation: number
  velocity?: Vector3
  timestamp: number
}

export interface NetworkMessage {
  type: string
  data: any
  timestamp: number
  priority: number
}

export interface NetworkPacket {
  messages: NetworkMessage[]
  timestamp: number
}

export interface LODLevel {
  level: number
  distance: number
  geometry?: any
  material?: any
}

export interface LODConfig {
  levels: LODLevel[]
  switchHysteresis: number
}

