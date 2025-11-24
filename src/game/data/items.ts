import { Item } from '../types'

export const ITEMS: Item[] = [
  // Weapons
  {
    id: 'quantum_blade',
    name: 'Quantum Blade',
    description: 'A blade infused with quantum energy.',
    type: 'weapon',
    rarity: 'rare',
    value: 500,
    icon: '⚔️',
    stackable: false
  },
  {
    id: 'plasma_rifle',
    name: 'Plasma Rifle',
    description: 'A high-tech rifle that fires plasma bolts.',
    type: 'weapon',
    rarity: 'epic',
    value: 1000,
    icon: '🔫',
    stackable: false
  },
  {
    id: 'void_staff',
    name: 'Void Staff',
    description: 'A staff channeling dark void energy.',
    type: 'weapon',
    rarity: 'legendary',
    value: 2500,
    icon: '🪄',
    stackable: false
  },
  // Armor
  {
    id: 'cyber_helmet',
    name: 'Cyber Helmet',
    description: 'Protective headgear with HUD integration.',
    type: 'armor',
    rarity: 'common',
    value: 200,
    icon: '🪖',
    stackable: false
  },
  {
    id: 'quantum_armor',
    name: 'Quantum Armor',
    description: 'Advanced armor that phases through attacks.',
    type: 'armor',
    rarity: 'epic',
    value: 1500,
    icon: '🛡️',
    stackable: false
  },
  // Consumables
  {
    id: 'health_pack',
    name: 'Health Pack',
    description: 'Restores 100 health instantly.',
    type: 'consumable',
    rarity: 'common',
    value: 50,
    icon: '💉',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'mana_cell',
    name: 'Mana Cell',
    description: 'Restores 100 mana instantly.',
    type: 'consumable',
    rarity: 'common',
    value: 50,
    icon: '🔋',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'energy_drink',
    name: 'Energy Drink',
    description: 'Increases movement speed by 20% for 30 seconds.',
    type: 'consumable',
    rarity: 'uncommon',
    value: 100,
    icon: '🥤',
    stackable: true,
    maxStack: 50
  },
  // Resources
  {
    id: 'quantum_crystal',
    name: 'Quantum Crystal',
    description: 'A rare crystal containing quantum energy.',
    type: 'resource',
    rarity: 'rare',
    value: 200,
    icon: '💎',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'cyber_scrap',
    name: 'Cyber Scrap',
    description: 'Salvaged technology components.',
    type: 'resource',
    rarity: 'common',
    value: 10,
    icon: '🔩',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'void_essence',
    name: 'Void Essence',
    description: 'Pure essence extracted from the void.',
    type: 'resource',
    rarity: 'epic',
    value: 500,
    icon: '🌑',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'plasma_core',
    name: 'Plasma Core',
    description: 'A highly charged plasma energy core.',
    type: 'resource',
    rarity: 'rare',
    value: 300,
    icon: '⚡',
    stackable: true,
    maxStack: 999
  },
  // Materials
  {
    id: 'neural_interface',
    name: 'Neural Interface',
    description: 'Advanced neural connection technology.',
    type: 'material',
    rarity: 'uncommon',
    value: 150,
    icon: '🧠',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'quantum_circuit',
    name: 'Quantum Circuit',
    description: 'A circuit board with quantum properties.',
    type: 'material',
    rarity: 'rare',
    value: 250,
    icon: '🔌',
    stackable: true,
    maxStack: 999
  }
]

export const ITEM_MAP = new Map(ITEMS.map(item => [item.id, item]))

export function getItem(id: string): Item | undefined {
  return ITEM_MAP.get(id)
}

export function getItemsByType(type: Item['type']): Item[] {
  return ITEMS.filter(item => item.type === type)
}

export function getItemsByRarity(rarity: Item['rarity']): Item[] {
  return ITEMS.filter(item => item.rarity === rarity)
}

