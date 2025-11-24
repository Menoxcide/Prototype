import { Spell } from '../types'

import { SpellCategory } from './magicTraditions'

export const SPELLS: Spell[] = [
  {
    id: 'quantum_bolt',
    name: 'Quantum Bolt',
    description: 'A basic energy projectile that deals moderate damage.',
    manaCost: 20,
    cooldown: 1000,
    damage: 50,
    range: 15,
    castTime: 0.3,
    icon: '⚡',
    color: '#00ffff',
    category: 'combat' as SpellCategory
  },
  {
    id: 'plasma_burst',
    name: 'Plasma Burst',
    description: 'Explodes on impact, dealing area damage to nearby enemies.',
    manaCost: 35,
    cooldown: 2000,
    damage: 80,
    range: 12,
    castTime: 0.5,
    icon: '💥',
    color: '#ff00ff',
    category: 'combat' as SpellCategory
  },
  {
    id: 'void_strike',
    name: 'Void Strike',
    description: 'A dark energy beam that pierces through enemies.',
    manaCost: 40,
    cooldown: 2500,
    damage: 100,
    range: 18,
    castTime: 0.6,
    icon: '🌑',
    color: '#9d00ff',
    category: 'combat' as SpellCategory
  },
  {
    id: 'heal_circuit',
    name: 'Heal Circuit',
    description: 'Restores health over time.',
    manaCost: 30,
    cooldown: 3000,
    damage: -50, // Negative = healing
    range: 0, // Self-cast
    castTime: 0.4,
    icon: '💚',
    color: '#00ff00',
    category: 'health' as SpellCategory
  },
  {
    id: 'quantum_slash',
    name: 'Quantum Slash',
    description: 'A melee dash attack that deals high damage.',
    manaCost: 25,
    cooldown: 1500,
    damage: 120,
    range: 3,
    castTime: 0.2,
    icon: '⚔️',
    color: '#0099ff',
    category: 'combat' as SpellCategory
  },
  {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    description: 'Lightning that jumps between multiple enemies.',
    manaCost: 50,
    cooldown: 4000,
    damage: 60,
    range: 15,
    castTime: 0.7,
    icon: '⚡',
    color: '#00ffff',
    category: 'combat' as SpellCategory
  },
  {
    id: 'shield_matrix',
    name: 'Shield Matrix',
    description: 'Creates a temporary energy shield that absorbs damage.',
    manaCost: 45,
    cooldown: 5000,
    damage: 0,
    range: 0,
    castTime: 0.5,
    icon: '🛡️',
    color: '#0099ff',
    category: 'health' as SpellCategory
  },
  {
    id: 'teleport',
    name: 'Quantum Teleport',
    description: 'Instantly teleport to a nearby location.',
    manaCost: 30,
    cooldown: 6000,
    damage: 0,
    range: 10,
    castTime: 0.3,
    icon: '🌀',
    color: '#9d00ff',
    category: 'manipulation' as SpellCategory
  },
  {
    id: 'meteor_strike',
    name: 'Meteor Strike',
    description: 'Calls down a devastating meteor from orbit.',
    manaCost: 80,
    cooldown: 8000,
    damage: 200,
    range: 20,
    castTime: 1.5,
    icon: '☄️',
    color: '#ff00ff',
    category: 'combat' as SpellCategory
  },
  {
    id: 'energy_drain',
    name: 'Energy Drain',
    description: 'Steals mana from enemies and restores your own.',
    manaCost: 0,
    cooldown: 3000,
    damage: 30,
    range: 8,
    castTime: 0.4,
    icon: '🔋',
    color: '#00ff00',
    category: 'manipulation' as SpellCategory
  }
]

export const SPELL_MAP = new Map(SPELLS.map(spell => [spell.id, spell]))

export function getSpell(id: string): Spell | undefined {
  return SPELL_MAP.get(id)
}

