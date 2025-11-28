/**
 * Shadowrun Magic Traditions
 * Maps Shadowrun traditions to MARS://NEXUS's Quantum Slash "neon sorcery"
 */

export type MagicTradition = 'hermetic' | 'shamanic' | 'technomancer' | 'adept' | 'none'

export type SpellCategory = 'combat' | 'manipulation' | 'detection' | 'health' | 'illusion'

export interface MagicTraditionData {
  id: MagicTradition
  name: string
  description: string
  color: string
  icon: string
  spellModifiers: {
    damageMultiplier: number
    manaCostMultiplier: number
    cooldownMultiplier: number
  }
  preferredCategories: SpellCategory[]
}

export const MAGIC_TRADITIONS: Record<MagicTradition, MagicTraditionData> = {
  hermetic: {
    id: 'hermetic',
    name: 'Hermetic',
    description: 'Academic magic focused on logic and formulas. Excels at combat and manipulation spells.',
    color: '#00ffff',
    icon: '📐',
    spellModifiers: {
      damageMultiplier: 1.2,
      manaCostMultiplier: 0.9,
      cooldownMultiplier: 0.95
    },
    preferredCategories: ['combat', 'manipulation']
  },
  shamanic: {
    id: 'shamanic',
    name: 'Shamanic',
    description: 'Spirit-based magic connected to nature and the void. Strong in health and detection.',
    color: '#00ff00',
    icon: '🌿',
    spellModifiers: {
      damageMultiplier: 1.0,
      manaCostMultiplier: 1.0,
      cooldownMultiplier: 1.0
    },
    preferredCategories: ['health', 'detection']
  },
  technomancer: {
    id: 'technomancer',
    name: 'Technomancer',
    description: 'Digital magic merging with technology. Specializes in illusion and manipulation.',
    color: '#ff00ff',
    icon: '💻',
    spellModifiers: {
      damageMultiplier: 0.9,
      manaCostMultiplier: 0.85,
      cooldownMultiplier: 0.9
    },
    preferredCategories: ['illusion', 'manipulation']
  },
  adept: {
    id: 'adept',
    name: 'Adept',
    description: 'Physical enhancement through magic. Focuses on combat and health spells.',
    color: '#ff9900',
    icon: '⚔️',
    spellModifiers: {
      damageMultiplier: 1.3,
      manaCostMultiplier: 1.1,
      cooldownMultiplier: 1.05
    },
    preferredCategories: ['combat', 'health']
  },
  none: {
    id: 'none',
    name: 'No Tradition',
    description: 'No magical tradition selected.',
    color: '#888888',
    icon: '⚪',
    spellModifiers: {
      damageMultiplier: 1.0,
      manaCostMultiplier: 1.0,
      cooldownMultiplier: 1.0
    },
    preferredCategories: []
  }
}

/**
 * Spell categories for organizing spells in the spell wheel
 */
export const SPELL_CATEGORIES: Record<SpellCategory, { name: string; color: string; icon: string }> = {
  combat: {
    name: 'Combat',
    color: '#ff0000',
    icon: '⚔️'
  },
  manipulation: {
    name: 'Manipulation',
    color: '#00ffff',
    icon: '🌀'
  },
  detection: {
    name: 'Detection',
    color: '#ffff00',
    icon: '👁️'
  },
  health: {
    name: 'Health',
    color: '#00ff00',
    icon: '💚'
  },
  illusion: {
    name: 'Illusion',
    color: '#ff00ff',
    icon: '✨'
  }
}

/**
 * Get tradition data by ID
 */
export function getTradition(traditionId: MagicTradition): MagicTraditionData {
  return MAGIC_TRADITIONS[traditionId] || MAGIC_TRADITIONS.none
}

/**
 * Get all available traditions
 */
export function getAllTraditions(): MagicTraditionData[] {
  return Object.values(MAGIC_TRADITIONS).filter(t => t.id !== 'none')
}

