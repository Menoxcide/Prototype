/**
 * Status Effect Types - Shared between client and server
 */

export type StatusEffectType = 
  | 'poison'
  | 'burn'
  | 'freeze'
  | 'stun'
  | 'slow'
  | 'haste'
  | 'shield'
  | 'regeneration'
  | 'vulnerability'
  | 'armor'

export interface StatusEffect {
  id: string
  type: StatusEffectType
  duration: number // milliseconds
  startTime: number
  stacks?: number
  sourceId?: string // Player or enemy ID that applied the effect
}

export interface StatusEffectData {
  type: StatusEffectType
  name: string
  description: string
  color: string
  icon: string
  maxStacks?: number
  canStack: boolean
}

export const STATUS_EFFECT_DATA: Record<StatusEffectType, StatusEffectData> = {
  poison: {
    type: 'poison',
    name: 'Poison',
    description: 'Takes damage over time',
    color: '#00ff00',
    icon: '💚',
    maxStacks: 5,
    canStack: true
  },
  burn: {
    type: 'burn',
    name: 'Burn',
    description: 'Takes fire damage over time',
    color: '#ff6600',
    icon: '🔥',
    maxStacks: 3,
    canStack: true
  },
  freeze: {
    type: 'freeze',
    name: 'Frozen',
    description: 'Cannot move or act',
    color: '#00ffff',
    icon: '❄️',
    canStack: false
  },
  stun: {
    type: 'stun',
    name: 'Stunned',
    description: 'Cannot act',
    color: '#ffff00',
    icon: '⚡',
    canStack: false
  },
  slow: {
    type: 'slow',
    name: 'Slowed',
    description: 'Movement speed reduced',
    color: '#8888ff',
    icon: '🐌',
    maxStacks: 3,
    canStack: true
  },
  haste: {
    type: 'haste',
    name: 'Haste',
    description: 'Movement and attack speed increased',
    color: '#ff00ff',
    icon: '⚡',
    maxStacks: 3,
    canStack: true
  },
  shield: {
    type: 'shield',
    name: 'Shield',
    description: 'Absorbs damage',
    color: '#00ffff',
    icon: '🛡️',
    canStack: false
  },
  regeneration: {
    type: 'regeneration',
    name: 'Regeneration',
    description: 'Restores health over time',
    color: '#00ff00',
    icon: '💚',
    maxStacks: 3,
    canStack: true
  },
  vulnerability: {
    type: 'vulnerability',
    name: 'Vulnerable',
    description: 'Takes increased damage',
    color: '#ff0000',
    icon: '💔',
    maxStacks: 5,
    canStack: true
  },
  armor: {
    type: 'armor',
    name: 'Armor',
    description: 'Reduces damage taken',
    color: '#888888',
    icon: '🛡️',
    maxStacks: 5,
    canStack: true
  }
}

