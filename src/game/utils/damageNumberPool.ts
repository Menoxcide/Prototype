/**
 * Damage Number Pool - Object pooling for damage numbers
 * Reduces garbage collection by reusing damage number instances
 */

import { createObjectPool } from '../../../shared/src/utils/objectPool'

export interface DamageNumber {
  id: string
  damage: number
  position: { x: number; y: number; z: number }
  isCrit: boolean
  createdAt: number
  opacity: number
  yOffset: number
}

function createDamageNumber(): DamageNumber {
  return {
    id: '',
    damage: 0,
    position: { x: 0, y: 0, z: 0 },
    isCrit: false,
    createdAt: 0,
    opacity: 1,
    yOffset: 0
  }
}

function resetDamageNumber(dn: DamageNumber): void {
  dn.id = ''
  dn.damage = 0
  dn.position = { x: 0, y: 0, z: 0 }
  dn.isCrit = false
  dn.createdAt = 0
  dn.opacity = 1
  dn.yOffset = 0
}

export const damageNumberPool = createObjectPool<DamageNumber>({
  factory: createDamageNumber,
  reset: resetDamageNumber,
  initialSize: 20,
  maxSize: 100
})

