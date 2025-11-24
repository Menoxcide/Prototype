/**
 * Skill definitions for the game
 */

import { Skill } from '../../../shared/src/types/skills'

export const SKILLS: Skill[] = [
  // Combat Skills
  {
    id: 'combat_mastery',
    name: 'Combat Mastery',
    description: 'Increases damage dealt by all weapons and spells',
    category: 'combat',
    type: 'passive',
    maxLevel: 50,
    requirements: [{ type: 'level', value: 1 }],
    effects: [
      { level: 1, stat: 'damage', modifier: 2, description: '+2% damage' },
      { level: 10, stat: 'damage', modifier: 5, description: '+5% damage' },
      { level: 25, stat: 'damage', modifier: 10, description: '+10% damage' },
      { level: 50, stat: 'damage', modifier: 25, description: '+25% damage' }
    ],
    icon: '⚔️',
    color: '#ff0000'
  },
  {
    id: 'critical_strike',
    name: 'Critical Strike',
    description: 'Increases critical hit chance and damage',
    category: 'combat',
    type: 'passive',
    maxLevel: 30,
    requirements: [{ type: 'level', value: 5 }, { type: 'skill', value: 'combat_mastery' }],
    effects: [
      { level: 1, stat: 'critChance', modifier: 1, description: '+1% crit chance' },
      { level: 10, stat: 'critChance', modifier: 5, description: '+5% crit chance' },
      { level: 30, stat: 'critChance', modifier: 15, description: '+15% crit chance' }
    ],
    icon: '💥',
    color: '#ff6600'
  },
  {
    id: 'berserker_rage',
    name: 'Berserker Rage',
    description: 'Active ability: Temporarily increases damage and attack speed',
    category: 'combat',
    type: 'active',
    maxLevel: 20,
    requirements: [{ type: 'level', value: 10 }, { type: 'skill', value: 'combat_mastery' }],
    effects: [
      { level: 1, stat: 'damage', modifier: 20, description: '+20% damage for 10s' },
      { level: 10, stat: 'damage', modifier: 50, description: '+50% damage for 15s' },
      { level: 20, stat: 'damage', modifier: 100, description: '+100% damage for 20s' }
    ],
    icon: '🔥',
    color: '#ff0000'
  },
  
  // Magic Skills
  {
    id: 'spell_power',
    name: 'Spell Power',
    description: 'Increases spell damage and reduces mana costs',
    category: 'magic',
    type: 'passive',
    maxLevel: 50,
    requirements: [{ type: 'level', value: 1 }],
    effects: [
      { level: 1, stat: 'spellDamage', modifier: 3, description: '+3% spell damage' },
      { level: 10, stat: 'spellDamage', modifier: 10, description: '+10% spell damage' },
      { level: 25, stat: 'spellDamage', modifier: 25, description: '+25% spell damage' },
      { level: 50, stat: 'spellDamage', modifier: 50, description: '+50% spell damage' }
    ],
    icon: '✨',
    color: '#00ffff'
  },
  {
    id: 'mana_efficiency',
    name: 'Mana Efficiency',
    description: 'Reduces mana cost of all spells',
    category: 'magic',
    type: 'passive',
    maxLevel: 30,
    requirements: [{ type: 'level', value: 3 }, { type: 'skill', value: 'spell_power' }],
    effects: [
      { level: 1, stat: 'manaCost', modifier: -2, description: '-2% mana cost' },
      { level: 10, stat: 'manaCost', modifier: -10, description: '-10% mana cost' },
      { level: 30, stat: 'manaCost', modifier: -30, description: '-30% mana cost' }
    ],
    icon: '🔮',
    color: '#0099ff'
  },
  {
    id: 'arcane_shield',
    name: 'Arcane Shield',
    description: 'Active ability: Creates a shield that absorbs damage',
    category: 'magic',
    type: 'active',
    maxLevel: 20,
    requirements: [{ type: 'level', value: 8 }, { type: 'skill', value: 'spell_power' }],
    effects: [
      { level: 1, stat: 'shield', modifier: 100, description: 'Absorbs 100 damage' },
      { level: 10, stat: 'shield', modifier: 500, description: 'Absorbs 500 damage' },
      { level: 20, stat: 'shield', modifier: 1000, description: 'Absorbs 1000 damage' }
    ],
    icon: '🛡️',
    color: '#00ffff'
  },
  
  // Crafting Skills
  {
    id: 'crafting_expertise',
    name: 'Crafting Expertise',
    description: 'Increases success rate and quality of crafted items',
    category: 'crafting',
    type: 'passive',
    maxLevel: 50,
    requirements: [{ type: 'level', value: 2 }],
    effects: [
      { level: 1, stat: 'craftSuccess', modifier: 2, description: '+2% success rate' },
      { level: 10, stat: 'craftSuccess', modifier: 10, description: '+10% success rate' },
      { level: 25, stat: 'craftSuccess', modifier: 25, description: '+25% success rate' },
      { level: 50, stat: 'craftSuccess', modifier: 50, description: '+50% success rate' }
    ],
    icon: '🔨',
    color: '#ffaa00'
  },
  {
    id: 'master_crafter',
    name: 'Master Crafter',
    description: 'Allows crafting of higher tier items',
    category: 'crafting',
    type: 'passive',
    maxLevel: 30,
    requirements: [{ type: 'level', value: 10 }, { type: 'skill', value: 'crafting_expertise' }],
    effects: [
      { level: 1, stat: 'craftTier', modifier: 1, description: 'Unlock tier 2 items' },
      { level: 10, stat: 'craftTier', modifier: 2, description: 'Unlock tier 3 items' },
      { level: 30, stat: 'craftTier', modifier: 3, description: 'Unlock tier 4 items' }
    ],
    icon: '⭐',
    color: '#ffaa00'
  },
  
  // Survival Skills
  {
    id: 'vitality',
    name: 'Vitality',
    description: 'Increases maximum health',
    category: 'survival',
    type: 'passive',
    maxLevel: 50,
    requirements: [{ type: 'level', value: 1 }],
    effects: [
      { level: 1, stat: 'maxHealth', modifier: 10, description: '+10 max health' },
      { level: 10, stat: 'maxHealth', modifier: 100, description: '+100 max health' },
      { level: 25, stat: 'maxHealth', modifier: 250, description: '+250 max health' },
      { level: 50, stat: 'maxHealth', modifier: 500, description: '+500 max health' }
    ],
    icon: '❤️',
    color: '#ff0000'
  },
  {
    id: 'mana_capacity',
    name: 'Mana Capacity',
    description: 'Increases maximum mana',
    category: 'survival',
    type: 'passive',
    maxLevel: 50,
    requirements: [{ type: 'level', value: 1 }],
    effects: [
      { level: 1, stat: 'maxMana', modifier: 10, description: '+10 max mana' },
      { level: 10, stat: 'maxMana', modifier: 100, description: '+100 max mana' },
      { level: 25, stat: 'maxMana', modifier: 250, description: '+250 max mana' },
      { level: 50, stat: 'maxMana', modifier: 500, description: '+500 max mana' }
    ],
    icon: '💙',
    color: '#0099ff'
  },
  {
    id: 'regeneration',
    name: 'Regeneration',
    description: 'Passively regenerates health and mana over time',
    category: 'survival',
    type: 'passive',
    maxLevel: 30,
    requirements: [{ type: 'level', value: 5 }, { type: 'skill', value: 'vitality' }],
    effects: [
      { level: 1, stat: 'healthRegen', modifier: 1, description: '+1 HP/sec' },
      { level: 10, stat: 'healthRegen', modifier: 5, description: '+5 HP/sec' },
      { level: 30, stat: 'healthRegen', modifier: 15, description: '+15 HP/sec' }
    ],
    icon: '💚',
    color: '#00ff00'
  },
  
  // Social Skills
  {
    id: 'charisma',
    name: 'Charisma',
    description: 'Increases rewards from quests and improves trading prices',
    category: 'social',
    type: 'passive',
    maxLevel: 30,
    requirements: [{ type: 'level', value: 3 }],
    effects: [
      { level: 1, stat: 'questReward', modifier: 2, description: '+2% quest rewards' },
      { level: 10, stat: 'questReward', modifier: 10, description: '+10% quest rewards' },
      { level: 30, stat: 'questReward', modifier: 30, description: '+30% quest rewards' }
    ],
    icon: '💬',
    color: '#ff00ff'
  },
  {
    id: 'leadership',
    name: 'Leadership',
    description: 'Increases experience gained in parties and guilds',
    category: 'social',
    type: 'passive',
    maxLevel: 30,
    requirements: [{ type: 'level', value: 5 }, { type: 'skill', value: 'charisma' }],
    effects: [
      { level: 1, stat: 'partyXP', modifier: 5, description: '+5% party XP' },
      { level: 10, stat: 'partyXP', modifier: 15, description: '+15% party XP' },
      { level: 30, stat: 'partyXP', modifier: 50, description: '+50% party XP' }
    ],
    icon: '👑',
    color: '#ff00ff'
  }
]

export function getSkill(skillId: string): Skill | undefined {
  return SKILLS.find(s => s.id === skillId)
}

export function getSkillsByCategory(category: string): Skill[] {
  return SKILLS.filter(s => s.category === category)
}

