/**
 * World Assets - Textures, sprites, and visual definitions for the game world
 * Kid-friendly, colorful assets for tablet MMO
 */

export interface TextureAsset {
  id: string
  name: string
  type: 'ground' | 'sky' | 'water' | 'wall' | 'object' | 'particle'
  color: string
  pattern?: string
  url?: string
  size?: { width: number; height: number }
}

export interface SpriteAsset {
  id: string
  name: string
  type: 'npc' | 'monster' | 'object' | 'item' | 'effect'
  icon: string
  color: string
  size: { width: number; height: number }
  frames?: number
  animationSpeed?: number
}

export interface ModelAsset {
  id: string
  name: string
  type: 'building' | 'tree' | 'rock' | 'decoration' | 'character'
  color: string
  size: { width: number; height: number; depth: number }
  url?: string
}

// Ground textures
export const GROUND_TEXTURES: TextureAsset[] = [
  {
    id: 'grass_bright',
    name: 'Bright Grass',
    type: 'ground',
    color: '#90EE90',
    pattern: 'grass'
  },
  {
    id: 'sand_golden',
    name: 'Golden Sand',
    type: 'ground',
    color: '#F4A460',
    pattern: 'sand'
  },
  {
    id: 'snow_white',
    name: 'White Snow',
    type: 'ground',
    color: '#FFFFFF',
    pattern: 'snow'
  },
  {
    id: 'crystal_ground',
    name: 'Crystal Ground',
    type: 'ground',
    color: '#00CED1',
    pattern: 'crystal'
  },
  {
    id: 'candy_ground',
    name: 'Candy Ground',
    type: 'ground',
    color: '#FFB6C1',
    pattern: 'candy'
  },
  {
    id: 'cloud_ground',
    name: 'Cloud Ground',
    type: 'ground',
    color: '#FFE4E1',
    pattern: 'cloud'
  },
  {
    id: 'neon_ground',
    name: 'Neon Ground',
    type: 'ground',
    color: '#2F2F2F',
    pattern: 'neon'
  },
  {
    id: 'cosmic_ground',
    name: 'Cosmic Ground',
    type: 'ground',
    color: '#191970',
    pattern: 'stars'
  }
]

// Sky textures
export const SKY_TEXTURES: TextureAsset[] = [
  {
    id: 'sky_blue',
    name: 'Blue Sky',
    type: 'sky',
    color: '#87CEEB',
    pattern: 'clouds'
  },
  {
    id: 'sky_sunset',
    name: 'Sunset Sky',
    type: 'sky',
    color: '#FF6347',
    pattern: 'sunset'
  },
  {
    id: 'sky_night',
    name: 'Night Sky',
    type: 'sky',
    color: '#191970',
    pattern: 'stars'
  },
  {
    id: 'sky_rainbow',
    name: 'Rainbow Sky',
    type: 'sky',
    color: '#FF69B4',
    pattern: 'rainbow'
  },
  {
    id: 'sky_cosmic',
    name: 'Cosmic Sky',
    type: 'sky',
    color: '#000000',
    pattern: 'galaxy'
  }
]

// Water textures
export const WATER_TEXTURES: TextureAsset[] = [
  {
    id: 'water_blue',
    name: 'Blue Water',
    type: 'water',
    color: '#00BFFF',
    pattern: 'waves'
  },
  {
    id: 'water_crystal',
    name: 'Crystal Water',
    type: 'water',
    color: '#00CED1',
    pattern: 'sparkle'
  },
  {
    id: 'water_chocolate',
    name: 'Chocolate River',
    type: 'water',
    color: '#8B4513',
    pattern: 'smooth'
  },
  {
    id: 'water_lava',
    name: 'Lava Flow',
    type: 'water',
    color: '#FF4500',
    pattern: 'lava'
  }
]

// NPC Sprites
export const NPC_SPRITES: SpriteAsset[] = [
  {
    id: 'farmer_sprite',
    name: 'Farmer',
    type: 'npc',
    icon: '👨‍🌾',
    color: '#FFD700',
    size: { width: 32, height: 32 },
    frames: 4,
    animationSpeed: 0.1
  },
  {
    id: 'beekeeper_sprite',
    name: 'Beekeeper',
    type: 'npc',
    icon: '🍯',
    color: '#FFD700',
    size: { width: 32, height: 32 },
    frames: 4,
    animationSpeed: 0.1
  },
  {
    id: 'crystal_keeper_sprite',
    name: 'Crystal Keeper',
    type: 'npc',
    icon: '🔮',
    color: '#00CED1',
    size: { width: 32, height: 32 },
    frames: 4,
    animationSpeed: 0.1
  },
  {
    id: 'mermaid_sprite',
    name: 'Mermaid',
    type: 'npc',
    icon: '🧜‍♀️',
    color: '#00BFFF',
    size: { width: 32, height: 32 },
    frames: 4,
    animationSpeed: 0.1
  },
  {
    id: 'robot_sprite',
    name: 'Robot',
    type: 'npc',
    icon: '🤖',
    color: '#00FFFF',
    size: { width: 32, height: 32 },
    frames: 4,
    animationSpeed: 0.1
  }
]

// Monster Sprites
export const MONSTER_SPRITES: SpriteAsset[] = [
  {
    id: 'bee_sprite',
    name: 'Bee',
    type: 'monster',
    icon: '🐝',
    color: '#FFD700',
    size: { width: 24, height: 24 },
    frames: 6,
    animationSpeed: 0.15
  },
  {
    id: 'butterfly_sprite',
    name: 'Butterfly',
    type: 'monster',
    icon: '🦋',
    color: '#FF69B4',
    size: { width: 24, height: 24 },
    frames: 8,
    animationSpeed: 0.2
  },
  {
    id: 'slime_sprite',
    name: 'Slime',
    type: 'monster',
    icon: '🟣',
    color: '#FF1493',
    size: { width: 32, height: 32 },
    frames: 4,
    animationSpeed: 0.1
  },
  {
    id: 'dragon_sprite',
    name: 'Dragon',
    type: 'monster',
    icon: '🐉',
    color: '#FF6347',
    size: { width: 64, height: 64 },
    frames: 6,
    animationSpeed: 0.1
  },
  {
    id: 'robot_sprite',
    name: 'Robot',
    type: 'monster',
    icon: '🤖',
    color: '#00FFFF',
    size: { width: 32, height: 32 },
    frames: 4,
    animationSpeed: 0.1
  }
]

// Object Sprites
export const OBJECT_SPRITES: SpriteAsset[] = [
  {
    id: 'tree_sprite',
    name: 'Tree',
    type: 'object',
    icon: '🌳',
    color: '#228B22',
    size: { width: 48, height: 64 },
    frames: 1
  },
  {
    id: 'flower_sprite',
    name: 'Flower',
    type: 'object',
    icon: '🌸',
    color: '#FF69B4',
    size: { width: 24, height: 24 },
    frames: 1
  },
  {
    id: 'rock_sprite',
    name: 'Rock',
    type: 'object',
    icon: '🪨',
    color: '#808080',
    size: { width: 32, height: 32 },
    frames: 1
  },
  {
    id: 'crystal_sprite',
    name: 'Crystal',
    type: 'object',
    icon: '💎',
    color: '#00CED1',
    size: { width: 32, height: 32 },
    frames: 4,
    animationSpeed: 0.2
  },
  {
    id: 'fountain_sprite',
    name: 'Fountain',
    type: 'object',
    icon: '⛲',
    color: '#87CEEB',
    size: { width: 48, height: 48 },
    frames: 8,
    animationSpeed: 0.15
  }
]

// Building Models
export const BUILDING_MODELS: ModelAsset[] = [
  {
    id: 'house_simple',
    name: 'Simple House',
    type: 'building',
    color: '#FFD700',
    size: { width: 8, height: 6, depth: 8 }
  },
  {
    id: 'shop_building',
    name: 'Shop',
    type: 'building',
    color: '#FF1493',
    size: { width: 10, height: 7, depth: 10 }
  },
  {
    id: 'inn_building',
    name: 'Inn',
    type: 'building',
    color: '#90EE90',
    size: { width: 12, height: 8, depth: 12 }
  },
  {
    id: 'town_hall',
    name: 'Town Hall',
    type: 'building',
    color: '#00CED1',
    size: { width: 15, height: 12, depth: 15 }
  },
  {
    id: 'crystal_tower',
    name: 'Crystal Tower',
    type: 'building',
    color: '#9370DB',
    size: { width: 8, height: 20, depth: 8 }
  }
]

// Particle Effects
export const PARTICLE_EFFECTS: TextureAsset[] = [
  {
    id: 'sparkle',
    name: 'Sparkle',
    type: 'particle',
    color: '#FFFF00',
    pattern: 'star'
  },
  {
    id: 'magic_glow',
    name: 'Magic Glow',
    type: 'particle',
    color: '#9370DB',
    pattern: 'glow'
  },
  {
    id: 'healing',
    name: 'Healing',
    type: 'particle',
    color: '#90EE90',
    pattern: 'heart'
  },
  {
    id: 'damage',
    name: 'Damage',
    type: 'particle',
    color: '#FF6347',
    pattern: 'burst'
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    type: 'particle',
    color: '#FF69B4',
    pattern: 'rainbow'
  }
]

// Asset Maps
export const TEXTURE_MAP = new Map([
  ...GROUND_TEXTURES,
  ...SKY_TEXTURES,
  ...WATER_TEXTURES,
  ...PARTICLE_EFFECTS
].map(tex => [tex.id, tex]))

export const SPRITE_MAP = new Map([
  ...NPC_SPRITES,
  ...MONSTER_SPRITES,
  ...OBJECT_SPRITES
].map(sprite => [sprite.id, sprite]))

export const MODEL_MAP = new Map(BUILDING_MODELS.map(model => [model.id, model]))

// Helper functions
export function getTexture(id: string): TextureAsset | undefined {
  return TEXTURE_MAP.get(id)
}

export function getSprite(id: string): SpriteAsset | undefined {
  return SPRITE_MAP.get(id)
}

export function getModel(id: string): ModelAsset | undefined {
  return MODEL_MAP.get(id)
}

export function getTextureByBiome(biomeId: string, type: 'ground' | 'sky' | 'water'): TextureAsset | undefined {
  const biomeTextures: Record<string, { ground: string; sky: string; water: string }> = {
    'sunflower_meadows': { ground: 'grass_bright', sky: 'sky_blue', water: 'water_blue' },
    'crystal_forest': { ground: 'crystal_ground', sky: 'sky_blue', water: 'water_crystal' },
    'rainbow_hills': { ground: 'grass_bright', sky: 'sky_rainbow', water: 'water_blue' },
    'candy_canyon': { ground: 'candy_ground', sky: 'sky_blue', water: 'water_chocolate' },
    'ocean_reef': { ground: 'sand_golden', sky: 'sky_blue', water: 'water_blue' },
    'starlight_desert': { ground: 'sand_golden', sky: 'sky_night', water: 'water_blue' },
    'frosty_peaks': { ground: 'snow_white', sky: 'sky_blue', water: 'water_blue' },
    'volcano_islands': { ground: 'sand_golden', sky: 'sky_sunset', water: 'water_lava' },
    'cloud_kingdom': { ground: 'cloud_ground', sky: 'sky_blue', water: 'water_blue' },
    'enchanted_grove': { ground: 'grass_bright', sky: 'sky_blue', water: 'water_crystal' },
    'neon_city': { ground: 'neon_ground', sky: 'sky_night', water: 'water_blue' },
    'cosmic_garden': { ground: 'cosmic_ground', sky: 'sky_cosmic', water: 'water_blue' }
  }
  
  const textureId = biomeTextures[biomeId]?.[type]
  return textureId ? getTexture(textureId) : undefined
}

