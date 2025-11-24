/**
 * Player Housing Types - Shared between client and server
 */

export interface HousingInstance {
  id: string
  playerId: string
  level: number
  size: { width: number; height: number; depth: number }
  furniture: FurnitureItem[]
  upgrades: HousingUpgrade[]
  createdAt: number
  lastVisited: number
}

export interface FurnitureItem {
  id: string
  furnitureId: string
  position: { x: number; y: number; z: number }
  rotation: number
  scale: number
  functional?: {
    type: 'storage' | 'crafting' | 'rest' | 'decoration'
    data?: any
  }
}

export interface HousingUpgrade {
  id: string
  type: 'size' | 'furniture_slots' | 'functional_slots' | 'decoration'
  level: number
  cost: number
  unlockedAt: number
}

export interface HousingTemplate {
  id: string
  name: string
  size: { width: number; height: number; depth: number }
  maxFurniture: number
  maxFunctional: number
}

