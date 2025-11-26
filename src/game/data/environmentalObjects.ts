/**
 * Environmental Objects - Trees, rocks, flowers, and other world decorations
 * Kid-friendly, colorful objects for tablet MMO
 */

export interface EnvironmentalObject {
  id: string
  name: string
  description: string
  type: 'tree' | 'rock' | 'flower' | 'bush' | 'crystal' | 'fountain' | 'statue' | 'building' | 'decoration' | 'resource'
  biome: string[]
  position?: { x: number; y: number; z: number } // Optional default position
  size: { width: number; height: number; depth: number }
  color: string
  icon: string
  model?: string
  harvestable: boolean
  harvestItem?: string
  harvestTime?: number // milliseconds
  respawnTime?: number // milliseconds
  interactable: boolean
  interactionType?: 'examine' | 'harvest' | 'climb' | 'enter' | 'activate'
  spawnRate: number // 0-1, how common this object is
  minLevel?: number
  maxLevel?: number
}

export const ENVIRONMENTAL_OBJECTS: EnvironmentalObject[] = [
  // Trees
  {
    id: 'sunflower_tree',
    name: 'Giant Sunflower',
    description: 'A massive sunflower that towers over everything.',
    type: 'tree',
    biome: ['sunflower_meadows'],
    size: { width: 3, height: 8, depth: 3 },
    color: '#FFD700',
    icon: '🌻',
    harvestable: true,
    harvestItem: 'sunflower_seed',
    harvestTime: 2000,
    respawnTime: 60000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.4
  },
  {
    id: 'crystal_tree',
    name: 'Crystal Tree',
    description: 'A magical tree with crystal leaves that sparkle.',
    type: 'tree',
    biome: ['crystal_forest', 'enchanted_grove'],
    size: { width: 4, height: 10, depth: 4 },
    color: '#00CED1',
    icon: '🌳',
    harvestable: true,
    harvestItem: 'crystal_shard',
    harvestTime: 3000,
    respawnTime: 120000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.3
  },
  {
    id: 'rainbow_tree',
    name: 'Rainbow Tree',
    description: 'A tree that changes colors like a rainbow.',
    type: 'tree',
    biome: ['rainbow_hills'],
    size: { width: 3, height: 9, depth: 3 },
    color: '#FF69B4',
    icon: '🌈',
    harvestable: true,
    harvestItem: 'rainbow_gem',
    harvestTime: 2500,
    respawnTime: 90000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.35
  },
  {
    id: 'candy_tree',
    name: 'Candy Tree',
    description: 'A tree made of candy that grows sweet treats.',
    type: 'tree',
    biome: ['candy_canyon'],
    size: { width: 3, height: 7, depth: 3 },
    color: '#FF1493',
    icon: '🍭',
    harvestable: true,
    harvestItem: 'candy_cane',
    harvestTime: 2000,
    respawnTime: 60000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.4
  },
  {
    id: 'coral_tree',
    name: 'Coral Tree',
    description: 'A beautiful underwater tree made of coral.',
    type: 'tree',
    biome: ['ocean_reef'],
    size: { width: 4, height: 8, depth: 4 },
    color: '#FF6347',
    icon: '🪸',
    harvestable: true,
    harvestItem: 'coral_fragment',
    harvestTime: 3000,
    respawnTime: 120000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.3
  },
  {
    id: 'ice_tree',
    name: 'Ice Tree',
    description: 'A tree made of ice that never melts.',
    type: 'tree',
    biome: ['frosty_peaks'],
    size: { width: 3, height: 9, depth: 3 },
    color: '#B0E0E6',
    icon: '❄️',
    harvestable: true,
    harvestItem: 'ice_crystal',
    harvestTime: 3000,
    respawnTime: 150000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.25
  },
  {
    id: 'ancient_tree',
    name: 'Ancient Tree',
    description: 'An ancient tree that has stood for thousands of years.',
    type: 'tree',
    biome: ['enchanted_grove'],
    size: { width: 6, height: 15, depth: 6 },
    color: '#228B22',
    icon: '🌲',
    harvestable: true,
    harvestItem: 'ancient_wood',
    harvestTime: 5000,
    respawnTime: 300000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.1,
    minLevel: 20
  },
  // Rocks
  {
    id: 'colorful_rock',
    name: 'Colorful Rock',
    description: 'A bright, colorful rock that sparkles.',
    type: 'rock',
    biome: ['rainbow_hills', 'sunflower_meadows'],
    size: { width: 1, height: 1, depth: 1 },
    color: '#FF69B4',
    icon: '🪨',
    harvestable: false,
    interactable: true,
    interactionType: 'examine',
    spawnRate: 0.5
  },
  {
    id: 'crystal_rock',
    name: 'Crystal Rock',
    description: 'A rock embedded with crystals.',
    type: 'rock',
    biome: ['crystal_forest', 'starlight_desert'],
    size: { width: 1.5, height: 1.5, depth: 1.5 },
    color: '#00CED1',
    icon: '💎',
    harvestable: true,
    harvestItem: 'crystal_shard',
    harvestTime: 4000,
    respawnTime: 180000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.2
  },
  {
    id: 'volcanic_rock',
    name: 'Volcanic Rock',
    description: 'A rock that glows with inner fire.',
    type: 'rock',
    biome: ['volcano_islands'],
    size: { width: 2, height: 2, depth: 2 },
    color: '#FF4500',
    icon: '🌋',
    harvestable: true,
    harvestItem: 'volcanic_rock',
    harvestTime: 5000,
    respawnTime: 240000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.25,
    minLevel: 15
  },
  // Flowers
  {
    id: 'wild_flower',
    name: 'Wild Flower',
    description: 'A beautiful wildflower that grows in meadows.',
    type: 'flower',
    biome: ['sunflower_meadows', 'rainbow_hills'],
    size: { width: 0.5, height: 0.5, depth: 0.5 },
    color: '#FF69B4',
    icon: '🌸',
    harvestable: true,
    harvestItem: 'colorful_flower',
    harvestTime: 1000,
    respawnTime: 30000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.6
  },
  {
    id: 'magic_flower',
    name: 'Magic Flower',
    description: 'A flower that glows with magical energy.',
    type: 'flower',
    biome: ['crystal_forest', 'enchanted_grove'],
    size: { width: 0.6, height: 0.6, depth: 0.6 },
    color: '#9370DB',
    icon: '🌺',
    harvestable: true,
    harvestItem: 'magic_essence',
    harvestTime: 2000,
    respawnTime: 90000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.3
  },
  {
    id: 'fire_flower',
    name: 'Fire Flower',
    description: 'A flower that burns with eternal flame.',
    type: 'flower',
    biome: ['volcano_islands'],
    size: { width: 0.7, height: 0.7, depth: 0.7 },
    color: '#FF6347',
    icon: '🔥',
    harvestable: true,
    harvestItem: 'fire_flower',
    harvestTime: 2500,
    respawnTime: 120000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.25,
    minLevel: 15
  },
  // Bushes
  {
    id: 'berry_bush',
    name: 'Berry Bush',
    description: 'A bush full of delicious berries.',
    type: 'bush',
    biome: ['sunflower_meadows', 'crystal_forest', 'rainbow_hills'],
    size: { width: 2, height: 2, depth: 2 },
    color: '#FF1493',
    icon: '🫐',
    harvestable: true,
    harvestItem: 'wild_berry',
    harvestTime: 2000,
    respawnTime: 60000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.4
  },
  {
    id: 'cactus',
    name: 'Desert Cactus',
    description: 'A tall cactus that grows in the desert.',
    type: 'bush',
    biome: ['starlight_desert'],
    size: { width: 1.5, height: 4, depth: 1.5 },
    color: '#90EE90',
    icon: '🌵',
    harvestable: true,
    harvestItem: 'cactus_fruit',
    harvestTime: 3000,
    respawnTime: 120000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.3
  },
  // Crystals
  {
    id: 'small_crystal',
    name: 'Small Crystal',
    description: 'A small crystal that glows softly.',
    type: 'crystal',
    biome: ['crystal_forest', 'starlight_desert', 'frosty_peaks'],
    size: { width: 0.8, height: 1, depth: 0.8 },
    color: '#00CED1',
    icon: '💎',
    harvestable: true,
    harvestItem: 'crystal_shard',
    harvestTime: 3000,
    respawnTime: 120000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.35
  },
  {
    id: 'large_crystal',
    name: 'Large Crystal',
    description: 'A large crystal formation that sparkles brightly.',
    type: 'crystal',
    biome: ['crystal_forest', 'enchanted_grove'],
    size: { width: 2, height: 3, depth: 2 },
    color: '#9370DB',
    icon: '🔮',
    harvestable: true,
    harvestItem: 'crystal_shard',
    harvestTime: 5000,
    respawnTime: 300000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.1,
    minLevel: 10
  },
  // Fountains
  {
    id: 'magic_fountain',
    name: 'Magic Fountain',
    description: 'A fountain that flows with magical water.',
    type: 'fountain',
    biome: ['crystal_forest', 'enchanted_grove', 'rainbow_hills'],
    size: { width: 3, height: 2, depth: 3 },
    color: '#87CEEB',
    icon: '⛲',
    harvestable: false,
    interactable: true,
    interactionType: 'activate',
    spawnRate: 0.05
  },
  {
    id: 'healing_fountain',
    name: 'Healing Fountain',
    description: 'A fountain that restores health when you drink from it.',
    type: 'fountain',
    biome: ['sunflower_meadows', 'crystal_forest'],
    size: { width: 2, height: 1.5, depth: 2 },
    color: '#90EE90',
    icon: '💧',
    harvestable: false,
    interactable: true,
    interactionType: 'activate',
    spawnRate: 0.08
  },
  // Statues
  {
    id: 'hero_statue',
    name: 'Hero Statue',
    description: 'A statue of a legendary hero.',
    type: 'statue',
    biome: ['sunflower_meadows', 'crystal_forest', 'rainbow_hills'],
    size: { width: 2, height: 4, depth: 2 },
    color: '#C0C0C0',
    icon: '🗿',
    harvestable: false,
    interactable: true,
    interactionType: 'examine',
    spawnRate: 0.02
  },
  {
    id: 'magic_statue',
    name: 'Magic Statue',
    description: 'An ancient statue that radiates magical energy.',
    type: 'statue',
    biome: ['enchanted_grove', 'crystal_forest'],
    size: { width: 3, height: 5, depth: 3 },
    color: '#9370DB',
    icon: '🪦',
    harvestable: false,
    interactable: true,
    interactionType: 'examine',
    spawnRate: 0.01,
    minLevel: 20
  },
  // Decorations
  {
    id: 'butterfly_swarm',
    name: 'Butterfly Swarm',
    description: 'A beautiful swarm of colorful butterflies.',
    type: 'decoration',
    biome: ['sunflower_meadows', 'rainbow_hills'],
    size: { width: 2, height: 2, depth: 2 },
    color: '#FF69B4',
    icon: '🦋',
    harvestable: false,
    interactable: false,
    spawnRate: 0.3
  },
  {
    id: 'firefly_swarm',
    name: 'Firefly Swarm',
    description: 'A swarm of glowing fireflies.',
    type: 'decoration',
    biome: ['crystal_forest', 'enchanted_grove'],
    size: { width: 2, height: 2, depth: 2 },
    color: '#FFFF00',
    icon: '✨',
    harvestable: false,
    interactable: false,
    spawnRate: 0.25
  },
  {
    id: 'floating_island',
    name: 'Floating Island',
    description: 'A small island that floats in the sky.',
    type: 'decoration',
    biome: ['rainbow_hills', 'cloud_kingdom'],
    size: { width: 10, height: 3, depth: 10 },
    color: '#90EE90',
    icon: '☁️',
    harvestable: false,
    interactable: true,
    interactionType: 'climb',
    spawnRate: 0.05
  },
  {
    id: 'rainbow_bridge',
    name: 'Rainbow Bridge',
    description: 'A beautiful bridge made of rainbow light.',
    type: 'decoration',
    biome: ['rainbow_hills', 'cloud_kingdom'],
    size: { width: 5, height: 1, depth: 20 },
    color: '#FF69B4',
    icon: '🌈',
    harvestable: false,
    interactable: true,
    interactionType: 'examine',
    spawnRate: 0.03
  },
  // Resource nodes
  {
    id: 'honey_hive',
    name: 'Honey Hive',
    description: 'A beehive full of delicious honey.',
    type: 'resource',
    biome: ['sunflower_meadows'],
    size: { width: 1.5, height: 2, depth: 1.5 },
    color: '#FFD700',
    icon: '🍯',
    harvestable: true,
    harvestItem: 'honey',
    harvestTime: 3000,
    respawnTime: 120000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.2
  },
  {
    id: 'mining_node',
    name: 'Mining Node',
    description: 'A rich deposit of minerals and gems.',
    type: 'resource',
    biome: ['volcano_islands', 'starlight_desert', 'frosty_peaks'],
    size: { width: 2, height: 2, depth: 2 },
    color: '#8B4513',
    icon: '⛏️',
    harvestable: true,
    harvestItem: 'ore',
    harvestTime: 5000,
    respawnTime: 300000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.15,
    minLevel: 10
  },
  {
    id: 'fishing_spot',
    name: 'Fishing Spot',
    description: 'A good spot for fishing.',
    type: 'resource',
    biome: ['ocean_reef'],
    size: { width: 3, height: 1, depth: 3 },
    color: '#00BFFF',
    icon: '🎣',
    harvestable: true,
    harvestItem: 'fish',
    harvestTime: 4000,
    respawnTime: 60000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.3
  },
  // Cyberpunk biome objects
  {
    id: 'cyberpunk_fountain',
    name: 'Neon Fountain',
    description: 'A cyberpunk fountain with glowing neon water and holographic effects.',
    type: 'fountain',
    biome: ['neon_city'],
    size: { width: 3, height: 2.5, depth: 3 },
    color: '#00ffff',
    icon: '⛲',
    harvestable: false,
    interactable: true,
    interactionType: 'activate',
    spawnRate: 0.06
  },
  {
    id: 'cyberpunk_garden',
    name: 'Synthetic Garden',
    description: 'A garden filled with neon-lit synthetic plants and cybernetic flowers.',
    type: 'decoration',
    biome: ['neon_city'],
    size: { width: 5, height: 1.5, depth: 5 },
    color: '#00ff88',
    icon: '🌿',
    harvestable: true,
    harvestItem: 'neon_flower',
    harvestTime: 3000,
    respawnTime: 90000,
    interactable: true,
    interactionType: 'harvest',
    spawnRate: 0.08
  }
]

export const ENVIRONMENTAL_OBJECT_MAP = new Map(
  ENVIRONMENTAL_OBJECTS.map(obj => [obj.id, obj])
)

export function getEnvironmentalObject(id: string): EnvironmentalObject | undefined {
  return ENVIRONMENTAL_OBJECT_MAP.get(id)
}

export function getEnvironmentalObjectsByBiome(biomeId: string): EnvironmentalObject[] {
  return ENVIRONMENTAL_OBJECTS.filter(obj => obj.biome.includes(biomeId))
}

export function getHarvestableObjects(): EnvironmentalObject[] {
  return ENVIRONMENTAL_OBJECTS.filter(obj => obj.harvestable)
}

export function getObjectsByType(type: EnvironmentalObject['type']): EnvironmentalObject[] {
  return ENVIRONMENTAL_OBJECTS.filter(obj => obj.type === type)
}

