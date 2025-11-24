/**
 * Status Effect System - Manages status effects on entities
 */

import { StatusEffect, StatusEffectType, STATUS_EFFECT_DATA } from '../../../shared/src/types/statusEffects'

export interface StatusEffectManager {
  applyEffect(entityId: string, effect: StatusEffect): void
  removeEffect(entityId: string, effectId: string): void
  getEffects(entityId: string): StatusEffect[]
  updateEffects(entityId: string, deltaTime: number): { expired: string[]; damage: number; healing: number }
  clearEffects(entityId: string): void
}

class StatusEffectManagerImpl implements StatusEffectManager {
  private entityEffects: Map<string, Map<string, StatusEffect>> = new Map()

  applyEffect(entityId: string, effect: StatusEffect): void {
    if (!this.entityEffects.has(entityId)) {
      this.entityEffects.set(entityId, new Map())
    }

    const effects = this.entityEffects.get(entityId)!
    const effectData = STATUS_EFFECT_DATA[effect.type]

    // Check if effect already exists
    const existing = Array.from(effects.values()).find(e => e.type === effect.type)

    if (existing && effectData.canStack && effectData.maxStacks) {
      // Stack the effect
      const newStacks = (existing.stacks || 1) + (effect.stacks || 1)
      if (newStacks <= effectData.maxStacks) {
        existing.stacks = newStacks
        existing.duration = Math.max(existing.duration, effect.duration)
        existing.startTime = Date.now()
      }
    } else if (existing && !effectData.canStack) {
      // Replace existing effect
      effects.delete(existing.id)
      effects.set(effect.id, effect)
    } else {
      // New effect
      effects.set(effect.id, effect)
    }
  }

  removeEffect(entityId: string, effectId: string): void {
    const effects = this.entityEffects.get(entityId)
    if (effects) {
      effects.delete(effectId)
      if (effects.size === 0) {
        this.entityEffects.delete(entityId)
      }
    }
  }

  getEffects(entityId: string): StatusEffect[] {
    const effects = this.entityEffects.get(entityId)
    return effects ? Array.from(effects.values()) : []
  }

  updateEffects(entityId: string, deltaTime: number): { expired: string[]; damage: number; healing: number } {
    const effects = this.entityEffects.get(entityId)
    if (!effects) {
      return { expired: [], damage: 0, healing: 0 }
    }

    const now = Date.now()
    const expired: string[] = []
    let damage = 0
    let healing = 0

    for (const [id, effect] of effects.entries()) {
      const elapsed = now - effect.startTime
      if (elapsed >= effect.duration) {
        expired.push(id)
        continue
      }

      // Apply damage/healing over time
      const stacks = effect.stacks || 1
      const tickRate = 1000 // Every second

      if (elapsed % tickRate < deltaTime) {
        switch (effect.type) {
          case 'poison':
            damage += 5 * stacks
            break
          case 'burn':
            damage += 10 * stacks
            break
          case 'regeneration':
            healing += 10 * stacks
            break
        }
      }
    }

    // Remove expired effects
    expired.forEach(id => effects.delete(id))
    if (effects.size === 0) {
      this.entityEffects.delete(entityId)
    }

    return { expired, damage, healing }
  }

  clearEffects(entityId: string): void {
    this.entityEffects.delete(entityId)
  }

  hasEffect(entityId: string, type: StatusEffectType): boolean {
    const effects = this.entityEffects.get(entityId)
    if (!effects) return false
    return Array.from(effects.values()).some(e => e.type === type)
  }

  isImmobilized(entityId: string): boolean {
    return this.hasEffect(entityId, 'freeze') || this.hasEffect(entityId, 'stun')
  }

  getSpeedMultiplier(entityId: string): number {
    const effects = this.entityEffects.get(entityId)
    if (!effects) return 1

    let multiplier = 1
    for (const effect of effects.values()) {
      const stacks = effect.stacks || 1
      switch (effect.type) {
        case 'slow':
          multiplier *= 1 - (0.2 * stacks) // 20% reduction per stack
          break
        case 'haste':
          multiplier *= 1 + (0.2 * stacks) // 20% increase per stack
          break
      }
    }

    return Math.max(0.1, Math.min(3, multiplier)) // Clamp between 0.1x and 3x
  }

  getDamageMultiplier(entityId: string): number {
    const effects = this.entityEffects.get(entityId)
    if (!effects) return 1

    let multiplier = 1
    for (const effect of effects.values()) {
      const stacks = effect.stacks || 1
      switch (effect.type) {
        case 'vulnerability':
          multiplier *= 1 + (0.1 * stacks) // 10% increase per stack
          break
        case 'armor':
          multiplier *= 1 - (0.05 * stacks) // 5% reduction per stack
          break
      }
    }

    return Math.max(0.1, Math.min(5, multiplier)) // Clamp between 0.1x and 5x
  }
}

export const statusEffectManager = new StatusEffectManagerImpl()

