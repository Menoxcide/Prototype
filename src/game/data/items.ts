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
  },
  // New world items
  {
    id: 'sunflower_seed',
    name: 'Sunflower Seed',
    description: 'A seed from a giant sunflower.',
    type: 'resource',
    rarity: 'common',
    value: 5,
    icon: '🌻',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'honey',
    name: 'Honey',
    description: 'Sweet, delicious honey from friendly bees.',
    type: 'consumable',
    rarity: 'common',
    value: 20,
    icon: '🍯',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'wild_berry',
    name: 'Wild Berry',
    description: 'A juicy wild berry.',
    type: 'consumable',
    rarity: 'common',
    value: 10,
    icon: '🫐',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'soft_clay',
    name: 'Soft Clay',
    description: 'Malleable clay perfect for crafting.',
    type: 'resource',
    rarity: 'common',
    value: 15,
    icon: '🪨',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'crystal_shard',
    name: 'Crystal Shard',
    description: 'A shard of magical crystal.',
    type: 'resource',
    rarity: 'uncommon',
    value: 50,
    icon: '💎',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'magic_mushroom',
    name: 'Magic Mushroom',
    description: 'A mushroom that glows with magic.',
    type: 'resource',
    rarity: 'uncommon',
    value: 75,
    icon: '🍄',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'glowing_berry',
    name: 'Glowing Berry',
    description: 'A berry that glows in the dark.',
    type: 'consumable',
    rarity: 'uncommon',
    value: 30,
    icon: '🫐',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'crystal_sap',
    name: 'Crystal Sap',
    description: 'Sap from a crystal tree.',
    type: 'resource',
    rarity: 'uncommon',
    value: 60,
    icon: '💧',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'rainbow_gem',
    name: 'Rainbow Gem',
    description: 'A gem that shimmers with all colors.',
    type: 'resource',
    rarity: 'rare',
    value: 150,
    icon: '💎',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'cloud_cotton',
    name: 'Cloud Cotton',
    description: 'Fluffy cotton from clouds.',
    type: 'resource',
    rarity: 'uncommon',
    value: 80,
    icon: '☁️',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'prism_shard',
    name: 'Prism Shard',
    description: 'A shard that splits light into rainbows.',
    type: 'resource',
    rarity: 'rare',
    value: 120,
    icon: '🌈',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'colorful_flower',
    name: 'Colorful Flower',
    description: 'A beautiful, colorful flower.',
    type: 'resource',
    rarity: 'common',
    value: 25,
    icon: '🌸',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'sugar_crystal',
    name: 'Sugar Crystal',
    description: 'A crystal made of pure sugar.',
    type: 'resource',
    rarity: 'common',
    value: 30,
    icon: '🍬',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'chocolate_bar',
    name: 'Chocolate Bar',
    description: 'A delicious chocolate bar.',
    type: 'consumable',
    rarity: 'common',
    value: 40,
    icon: '🍫',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'candy_cane',
    name: 'Candy Cane',
    description: 'A sweet, striped candy cane.',
    type: 'consumable',
    rarity: 'common',
    value: 20,
    icon: '🍭',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'gumdrop',
    name: 'Gumdrop',
    description: 'A chewy, colorful gumdrop.',
    type: 'consumable',
    rarity: 'common',
    value: 15,
    icon: '🍬',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'pearl',
    name: 'Pearl',
    description: 'A beautiful pearl from the ocean.',
    type: 'resource',
    rarity: 'rare',
    value: 200,
    icon: '🪸',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'sea_shell',
    name: 'Sea Shell',
    description: 'A beautiful seashell.',
    type: 'resource',
    rarity: 'common',
    value: 30,
    icon: '🐚',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'coral_fragment',
    name: 'Coral Fragment',
    description: 'A piece of colorful coral.',
    type: 'resource',
    rarity: 'uncommon',
    value: 80,
    icon: '🪸',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'seaweed',
    name: 'Seaweed',
    description: 'Underwater plant life.',
    type: 'resource',
    rarity: 'common',
    value: 10,
    icon: '🌿',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'star_sand',
    name: 'Star Sand',
    description: 'Sand that glows like stars.',
    type: 'resource',
    rarity: 'uncommon',
    value: 100,
    icon: '⭐',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'desert_crystal',
    name: 'Desert Crystal',
    description: 'A crystal found in the desert.',
    type: 'resource',
    rarity: 'rare',
    value: 150,
    icon: '💎',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'cactus_fruit',
    name: 'Cactus Fruit',
    description: 'A juicy fruit from a cactus.',
    type: 'consumable',
    rarity: 'common',
    value: 25,
    icon: '🌵',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'moonstone',
    name: 'Moonstone',
    description: 'A stone that glows like the moon.',
    type: 'resource',
    rarity: 'rare',
    value: 180,
    icon: '🌙',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'ice_crystal',
    name: 'Ice Crystal',
    description: 'A crystal made of pure ice.',
    type: 'resource',
    rarity: 'uncommon',
    value: 90,
    icon: '❄️',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    description: 'A unique, beautiful snowflake.',
    type: 'resource',
    rarity: 'common',
    value: 20,
    icon: '❄️',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'frozen_berry',
    name: 'Frozen Berry',
    description: 'A berry preserved in ice.',
    type: 'consumable',
    rarity: 'uncommon',
    value: 35,
    icon: '🫐',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'warm_wool',
    name: 'Warm Wool',
    description: 'Soft, warm wool for crafting.',
    type: 'resource',
    rarity: 'common',
    value: 40,
    icon: '🧶',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'lava_crystal',
    name: 'Lava Crystal',
    description: 'A crystal formed from lava.',
    type: 'resource',
    rarity: 'rare',
    value: 250,
    icon: '🌋',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'volcanic_rock',
    name: 'Volcanic Rock',
    description: 'Rock from a volcano.',
    type: 'resource',
    rarity: 'uncommon',
    value: 70,
    icon: '🪨',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'fire_flower',
    name: 'Fire Flower',
    description: 'A flower that burns with eternal flame.',
    type: 'resource',
    rarity: 'rare',
    value: 200,
    icon: '🔥',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'magma_essence',
    name: 'Magma Essence',
    description: 'Pure essence of magma.',
    type: 'resource',
    rarity: 'epic',
    value: 400,
    icon: '🌋',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'cloud_essence',
    name: 'Cloud Essence',
    description: 'Pure essence of clouds.',
    type: 'resource',
    rarity: 'rare',
    value: 300,
    icon: '☁️',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'sky_gem',
    name: 'Sky Gem',
    description: 'A gem from the sky.',
    type: 'resource',
    rarity: 'epic',
    value: 500,
    icon: '💎',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'wind_crystal',
    name: 'Wind Crystal',
    description: 'A crystal that captures the wind.',
    type: 'resource',
    rarity: 'rare',
    value: 280,
    icon: '💨',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'feather',
    name: 'Feather',
    description: 'A light, airy feather.',
    type: 'resource',
    rarity: 'common',
    value: 15,
    icon: '🪶',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'magic_essence',
    name: 'Magic Essence',
    description: 'Pure essence of magic.',
    type: 'resource',
    rarity: 'epic',
    value: 600,
    icon: '✨',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'ancient_wood',
    name: 'Ancient Wood',
    description: 'Wood from an ancient tree.',
    type: 'resource',
    rarity: 'rare',
    value: 350,
    icon: '🪵',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'fairy_dust',
    name: 'Fairy Dust',
    description: 'Sparkling dust from fairies.',
    type: 'resource',
    rarity: 'epic',
    value: 450,
    icon: '✨',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'enchanted_berry',
    name: 'Enchanted Berry',
    description: 'A berry infused with magic.',
    type: 'consumable',
    rarity: 'rare',
    value: 100,
    icon: '🫐',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'neon_crystal',
    name: 'Neon Crystal',
    description: 'A crystal that glows with neon light.',
    type: 'resource',
    rarity: 'epic',
    value: 700,
    icon: '💎',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'tech_scrap',
    name: 'Tech Scrap',
    description: 'Scrap from advanced technology.',
    type: 'resource',
    rarity: 'common',
    value: 20,
    icon: '🔩',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'energy_cell',
    name: 'Energy Cell',
    description: 'A cell full of energy.',
    type: 'resource',
    rarity: 'uncommon',
    value: 120,
    icon: '🔋',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'circuit_board',
    name: 'Circuit Board',
    description: 'An advanced circuit board.',
    type: 'material',
    rarity: 'rare',
    value: 300,
    icon: '🔌',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'hover_board',
    name: 'Hover Board',
    description: 'A futuristic hover board for faster travel.',
    type: 'material',
    rarity: 'legendary',
    value: 2000,
    icon: '🛹',
    stackable: false
  },
  {
    id: 'star_dust',
    name: 'Star Dust',
    description: 'Dust from the stars.',
    type: 'resource',
    rarity: 'epic',
    value: 800,
    icon: '⭐',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'planet_seed',
    name: 'Planet Seed',
    description: 'A seed that grows into a planet.',
    type: 'resource',
    rarity: 'legendary',
    value: 1500,
    icon: '🌍',
    stackable: true,
    maxStack: 10
  },
  {
    id: 'comet_fragment',
    name: 'Comet Fragment',
    description: 'A fragment from a comet.',
    type: 'resource',
    rarity: 'epic',
    value: 600,
    icon: '☄️',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'cosmic_essence',
    name: 'Cosmic Essence',
    description: 'Pure essence of the cosmos.',
    type: 'resource',
    rarity: 'legendary',
    value: 1000,
    icon: '🌌',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'bee_wings',
    name: 'Bee Wings',
    description: 'Delicate wings from a bee.',
    type: 'resource',
    rarity: 'uncommon',
    value: 60,
    icon: '🦋',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'honey_cake',
    name: 'Honey Cake',
    description: 'A delicious cake made with honey.',
    type: 'consumable',
    rarity: 'uncommon',
    value: 100,
    icon: '🍰',
    stackable: true,
    maxStack: 50
  },
  {
    id: 'underwater_breath_potion',
    name: 'Underwater Breath Potion',
    description: 'Allows breathing underwater for 10 minutes.',
    type: 'consumable',
    rarity: 'rare',
    value: 500,
    icon: '💧',
    stackable: true,
    maxStack: 20
  },
  {
    id: 'fish',
    name: 'Fish',
    description: 'A fresh fish from the ocean.',
    type: 'consumable',
    rarity: 'common',
    value: 30,
    icon: '🐟',
    stackable: true,
    maxStack: 99
  },
  {
    id: 'ore',
    name: 'Ore',
    description: 'Raw ore from mining.',
    type: 'resource',
    rarity: 'common',
    value: 25,
    icon: '⛏️',
    stackable: true,
    maxStack: 999
  },
  {
    id: 'pet_kitty',
    name: 'Pet Kitty',
    description: 'An adorable pet kitty companion.',
    type: 'material',
    rarity: 'rare',
    value: 500,
    icon: '🐱',
    stackable: false
  },
  {
    id: 'pet_puppy',
    name: 'Pet Puppy',
    description: 'A cute pet puppy companion.',
    type: 'material',
    rarity: 'rare',
    value: 500,
    icon: '🐶',
    stackable: false
  },
  {
    id: 'pet_bunny',
    name: 'Pet Bunny',
    description: 'A fluffy pet bunny companion.',
    type: 'material',
    rarity: 'uncommon',
    value: 300,
    icon: '🐰',
    stackable: false
  },
  {
    id: 'pet_dragon',
    name: 'Pet Dragon',
    description: 'A friendly pet dragon companion.',
    type: 'material',
    rarity: 'legendary',
    value: 2000,
    icon: '🐉',
    stackable: false
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

