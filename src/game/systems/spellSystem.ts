import { Spell } from '../types'
import { getSpell } from '../data/spells'
import { projectilePool } from '../utils/projectilePool'

export interface SpellCast {
  spellId: string
  casterId: string
  position: { x: number; y: number; z: number }
  rotation: number
  timestamp: number
}

export interface SpellProjectile {
  id: string
  spell: Spell
  position: { x: number; y: number; z: number }
  direction: { x: number; y: number; z: number }
  speed: number
  lifetime: number
  casterId: string
}

export function createSpellProjectile(
  spellId: string,
  casterId: string,
  position: { x: number; y: number; z: number },
  rotation: number
): SpellProjectile | null {
  const spell = getSpell(spellId)
  if (!spell) return null

  // Get projectile from pool
  const projectile = projectilePool.get()
  
  const direction = {
    x: Math.sin(rotation),
    y: 0,
    z: Math.cos(rotation)
  }

  // Initialize projectile
  projectile.id = `projectile_${Date.now()}_${Math.random()}`
  projectile.spell = spell
  projectile.position = { ...position }
  projectile.direction = direction
  projectile.speed = 10
  projectile.lifetime = spell.range / 10 * 1000 // Convert range to time
  projectile.casterId = casterId

  return projectile
}

export function releaseSpellProjectile(projectile: SpellProjectile): void {
  projectilePool.release(projectile)
}

export function updateSpellProjectile(
  projectile: SpellProjectile,
  deltaTime: number
): SpellProjectile | null {
  const newLifetime = projectile.lifetime - deltaTime
  if (newLifetime <= 0) {
    // Release projectile back to pool
    releaseSpellProjectile(projectile)
    return null
  }

  const moveDistance = projectile.speed * (deltaTime / 1000)
  projectile.position.x += projectile.direction.x * moveDistance
  projectile.position.y += projectile.direction.y * moveDistance
  projectile.position.z += projectile.direction.z * moveDistance
  projectile.lifetime = newLifetime

  return projectile
}

export function checkSpellHit(
  projectile: SpellProjectile,
  enemyPosition: { x: number; y: number; z: number },
  hitRadius: number = 1
): boolean {
  const dx = projectile.position.x - enemyPosition.x
  const dy = projectile.position.y - enemyPosition.y
  const dz = projectile.position.z - enemyPosition.z
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
  return distance <= hitRadius
}

