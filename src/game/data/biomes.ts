/**
 * Biome System - Defines different terrain types and their properties
 * Kid-friendly, colorful biomes for tablet MMO
 */

export interface Biome {
  id: string
  name: string
  description: string
  color: string
  groundColor: string
  skyColor: string
  levelRange: [number, number]
  temperature: 'cold' | 'temperate' | 'warm' | 'hot'
  humidity: 'dry' | 'moderate' | 'wet'
  resources: string[]
  monsters: string[]
  npcs: string[]
  towns: string[]
  specialFeatures: string[]
  musicTheme?: string
  ambientSounds?: string[]
  weather: 'sunny' | 'rainy' | 'snowy' | 'foggy' | 'windy'
  spawnRate: number // 0-1, how common this biome is
}

export const BIOMES: Biome[] = [
  // Starting biomes - safe and friendly
  {
    id: 'sunflower_meadows',
    name: 'Sunflower Meadows',
    description: 'A bright, cheerful meadow filled with giant sunflowers and friendly creatures.',
    color: '#FFD700',
    groundColor: '#90EE90',
    skyColor: '#87CEEB',
    levelRange: [1, 5],
    temperature: 'temperate',
    humidity: 'moderate',
    resources: ['sunflower_seed', 'honey', 'wild_berry', 'soft_clay'],
    monsters: ['bumblebee', 'butterfly_swarm', 'meadow_sprite'],
    npcs: ['farmer_npc', 'beekeeper_npc'],
    towns: ['honey_hollow'],
    specialFeatures: ['flower_gardens', 'bee_hives', 'windmills'],
    musicTheme: 'peaceful',
    ambientSounds: ['bird_chirp', 'wind_rustle'],
    weather: 'sunny',
    spawnRate: 0.15
  },
  {
    id: 'crystal_forest',
    name: 'Crystal Forest',
    description: 'A magical forest where trees grow crystal leaves that sparkle in the sunlight.',
    color: '#00CED1',
    groundColor: '#228B22',
    skyColor: '#E0F6FF',
    levelRange: [1, 8],
    temperature: 'temperate',
    humidity: 'wet',
    resources: ['crystal_shard', 'magic_mushroom', 'glowing_berry', 'crystal_sap'],
    monsters: ['crystal_sprite', 'forest_guardian', 'glow_worm'],
    npcs: ['crystal_keeper', 'forest_ranger'],
    towns: ['crystal_grove'],
    specialFeatures: ['crystal_trees', 'magic_springs', 'ancient_stones'],
    musicTheme: 'mystical',
    ambientSounds: ['crystal_chime', 'forest_whisper'],
    weather: 'sunny',
    spawnRate: 0.12
  },
  {
    id: 'rainbow_hills',
    name: 'Rainbow Hills',
    description: 'Rolling hills painted in every color of the rainbow, home to friendly cloud creatures.',
    color: '#FF69B4',
    groundColor: '#FFB6C1',
    skyColor: '#FFE4E1',
    levelRange: [2, 6],
    temperature: 'temperate',
    humidity: 'moderate',
    resources: ['rainbow_gem', 'cloud_cotton', 'prism_shard', 'colorful_flower'],
    monsters: ['cloud_bunny', 'rainbow_slime', 'sky_whale'],
    npcs: ['color_master', 'cloud_merchant'],
    towns: ['prism_village'],
    specialFeatures: ['rainbow_bridges', 'floating_islands', 'color_fountains'],
    musicTheme: 'joyful',
    ambientSounds: ['gentle_breeze', 'colorful_chimes'],
    weather: 'sunny',
    spawnRate: 0.10
  },
  // Mid-level biomes
  {
    id: 'candy_canyon',
    name: 'Candy Canyon',
    description: 'A sweet wonderland made of candy, chocolate rivers, and gingerbread houses.',
    color: '#FF1493',
    groundColor: '#FFB6C1',
    skyColor: '#FFC0CB',
    levelRange: [5, 12],
    temperature: 'warm',
    humidity: 'dry',
    resources: ['sugar_crystal', 'chocolate_bar', 'candy_cane', 'gumdrop'],
    monsters: ['gingerbread_guard', 'lollipop_slime', 'candy_golem'],
    npcs: ['candy_chef', 'sweet_tooth_merchant'],
    towns: ['sugar_town'],
    specialFeatures: ['chocolate_rivers', 'candy_caves', 'gingerbread_castles'],
    musicTheme: 'playful',
    ambientSounds: ['sweet_melody', 'candy_crunch'],
    weather: 'sunny',
    spawnRate: 0.08
  },
  {
    id: 'ocean_reef',
    name: 'Ocean Reef',
    description: 'A vibrant underwater world with coral reefs, friendly sea creatures, and hidden treasures.',
    color: '#00BFFF',
    groundColor: '#4682B4',
    skyColor: '#87CEEB',
    levelRange: [6, 15],
    temperature: 'temperate',
    humidity: 'wet',
    resources: ['pearl', 'sea_shell', 'coral_fragment', 'seaweed'],
    monsters: ['jellyfish', 'crab_guard', 'sea_snake'],
    npcs: ['mermaid_merchant', 'diver_npc'],
    towns: ['coral_city'],
    specialFeatures: ['underwater_caves', 'treasure_chests', 'coral_gardens'],
    musicTheme: 'oceanic',
    ambientSounds: ['water_bubbles', 'ocean_waves'],
    weather: 'sunny',
    spawnRate: 0.10
  },
  {
    id: 'starlight_desert',
    name: 'Starlight Desert',
    description: 'A desert that glows at night with starlight, home to friendly scorpions and sandcastles.',
    color: '#FFD700',
    groundColor: '#F4A460',
    skyColor: '#191970',
    levelRange: [8, 18],
    temperature: 'hot',
    humidity: 'dry',
    resources: ['star_sand', 'desert_crystal', 'cactus_fruit', 'moonstone'],
    monsters: ['friendly_scorpion', 'sand_ghost', 'desert_fox'],
    npcs: ['desert_nomad', 'star_gazer'],
    towns: ['oasis_village'],
    specialFeatures: ['star_pools', 'sandcastles', 'ancient_ruins'],
    musicTheme: 'mysterious',
    ambientSounds: ['desert_wind', 'star_chimes'],
    weather: 'sunny',
    spawnRate: 0.08
  },
  {
    id: 'frosty_peaks',
    name: 'Frosty Peaks',
    description: 'Snowy mountains with ice caves, friendly snowmen, and hot springs.',
    color: '#B0E0E6',
    groundColor: '#FFFFFF',
    skyColor: '#E0F6FF',
    levelRange: [10, 20],
    temperature: 'cold',
    humidity: 'moderate',
    resources: ['ice_crystal', 'snowflake', 'frozen_berry', 'warm_wool'],
    monsters: ['snow_sprite', 'ice_golem', 'polar_bear_cub'],
    npcs: ['snowman_npc', 'ice_merchant'],
    towns: ['frost_village'],
    specialFeatures: ['ice_caves', 'hot_springs', 'snow_forts'],
    musicTheme: 'winter',
    ambientSounds: ['snow_crunch', 'wind_howl'],
    weather: 'snowy',
    spawnRate: 0.10
  },
  // Advanced biomes
  {
    id: 'volcano_islands',
    name: 'Volcano Islands',
    description: 'Floating islands around a friendly volcano that shoots colorful lava.',
    color: '#FF4500',
    groundColor: '#8B4513',
    skyColor: '#FF6347',
    levelRange: [15, 25],
    temperature: 'hot',
    humidity: 'dry',
    resources: ['lava_crystal', 'volcanic_rock', 'fire_flower', 'magma_essence'],
    monsters: ['lava_slime', 'fire_sprite', 'volcano_guardian'],
    npcs: ['volcano_explorer', 'fire_mage'],
    towns: ['lava_port'],
    specialFeatures: ['floating_islands', 'lava_falls', 'fire_caves'],
    musicTheme: 'energetic',
    ambientSounds: ['lava_bubble', 'volcano_rumble'],
    weather: 'sunny',
    spawnRate: 0.07
  },
  {
    id: 'cloud_kingdom',
    name: 'Cloud Kingdom',
    description: 'A floating kingdom in the clouds, accessible by rainbow bridges.',
    color: '#FFE4E1',
    groundColor: '#F0F8FF',
    skyColor: '#87CEEB',
    levelRange: [18, 30],
    temperature: 'temperate',
    humidity: 'moderate',
    resources: ['cloud_essence', 'sky_gem', 'wind_crystal', 'feather'],
    monsters: ['cloud_dragon', 'wind_spirit', 'sky_knight'],
    npcs: ['cloud_king', 'sky_merchant'],
    towns: ['sky_city'],
    specialFeatures: ['cloud_castles', 'rainbow_bridges', 'wind_mills'],
    musicTheme: 'epic',
    ambientSounds: ['wind_whistle', 'cloud_rustle'],
    weather: 'windy',
    spawnRate: 0.05
  },
  {
    id: 'enchanted_grove',
    name: 'Enchanted Grove',
    description: 'A mystical forest where magic flows freely and ancient trees whisper secrets.',
    color: '#32CD32',
    groundColor: '#228B22',
    skyColor: '#98FB98',
    levelRange: [20, 35],
    temperature: 'temperate',
    humidity: 'wet',
    resources: ['magic_essence', 'ancient_wood', 'fairy_dust', 'enchanted_berry'],
    monsters: ['forest_dragon', 'tree_guardian', 'magic_wisp'],
    npcs: ['ancient_druid', 'fairy_queen'],
    towns: ['mystic_hollow'],
    specialFeatures: ['magic_fountains', 'ancient_trees', 'fairy_rings'],
    musicTheme: 'mystical',
    ambientSounds: ['forest_magic', 'fairy_whisper'],
    weather: 'foggy',
    spawnRate: 0.08
  },
  // Special biomes
  {
    id: 'neon_city',
    name: 'Neon City',
    description: 'A futuristic city with neon lights, friendly robots, and hover vehicles.',
    color: '#00FFFF',
    groundColor: '#2F2F2F',
    skyColor: '#000033',
    levelRange: [25, 40],
    temperature: 'temperate',
    humidity: 'moderate',
    resources: ['neon_crystal', 'tech_scrap', 'energy_cell', 'circuit_board'],
    monsters: ['friendly_robot', 'cyber_slime', 'neon_guardian'],
    npcs: ['robot_merchant', 'tech_master'],
    towns: ['nexus_city'],
    specialFeatures: ['neon_buildings', 'hover_pads', 'tech_labs'],
    musicTheme: 'cyberpunk',
    ambientSounds: ['neon_hum', 'tech_beep'],
    weather: 'sunny',
    spawnRate: 0.12
  },
  {
    id: 'cosmic_garden',
    name: 'Cosmic Garden',
    description: 'A garden among the stars, where planets grow like flowers and comets are butterflies.',
    color: '#9370DB',
    groundColor: '#191970',
    skyColor: '#000000',
    levelRange: [30, 50],
    temperature: 'cold',
    humidity: 'dry',
    resources: ['star_dust', 'planet_seed', 'comet_fragment', 'cosmic_essence'],
    monsters: ['star_sprite', 'comet_creature', 'cosmic_guardian'],
    npcs: ['star_keeper', 'cosmic_merchant'],
    towns: ['stellar_outpost'],
    specialFeatures: ['planet_gardens', 'star_bridges', 'cosmic_fountains'],
    musicTheme: 'cosmic',
    ambientSounds: ['cosmic_wind', 'star_chimes'],
    weather: 'sunny',
    spawnRate: 0.05
  }
]

export const BIOME_MAP = new Map(BIOMES.map(biome => [biome.id, biome]))

export function getBiome(id: string): Biome | undefined {
  return BIOME_MAP.get(id)
}

export function getBiomesByLevel(level: number): Biome[] {
  return BIOMES.filter(biome => 
    level >= biome.levelRange[0] && level <= biome.levelRange[1]
  )
}

export function getBiomeByPosition(x: number, z: number, seed: number = 0): Biome {
  // Simple biome selection based on position and seed
  // In a real implementation, this would use noise functions
  const normalizedX = Math.abs(x) % 1000
  const normalizedZ = Math.abs(z) % 1000
  const hash = (normalizedX * 73856093) ^ (normalizedZ * 19349663) ^ seed
  
  // Weight biomes by spawn rate
  const weightedBiomes: Biome[] = []
  BIOMES.forEach(biome => {
    const count = Math.floor(biome.spawnRate * 100)
    for (let i = 0; i < count; i++) {
      weightedBiomes.push(biome)
    }
  })
  
  if (weightedBiomes.length === 0) {
    return BIOMES[0] // Fallback to first biome
  }
  
  return weightedBiomes[Math.abs(hash) % weightedBiomes.length]
}

export function getBiomeColor(biomeId: string): string {
  const biome = getBiome(biomeId)
  return biome?.color || '#90EE90'
}

