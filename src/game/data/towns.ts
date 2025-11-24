/**
 * Town System - Settlements with buildings, shops, and safe zones
 * Kid-friendly towns for tablet MMO
 */

export interface Building {
  id: string
  type: 'house' | 'shop' | 'inn' | 'town_hall' | 'crafting_station' | 'pet_shop' | 'library' | 'park' | 'fountain' | 'statue'
  position: { x: number; y: number; z: number }
  rotation: number
  size: { width: number; height: number; depth: number }
  color: string
  npcId?: string
  services?: string[]
}

export interface Town {
  id: string
  name: string
  description: string
  biome: string
  position: { x: number; y: number; z: number }
  size: number // Radius of the town
  level: number
  isSafeZone: boolean
  buildings: Building[]
  npcs: string[] // NPC IDs in this town
  shops: string[] // Shop types available
  services: string[] // Services like 'heal', 'repair', 'teleport', 'craft'
  icon: string
  color: string
  musicTheme?: string
  specialFeatures: string[]
}

export const TOWNS: Town[] = [
  {
    id: 'honey_hollow',
    name: 'Honey Hollow',
    description: 'A cozy village surrounded by sunflower fields, known for its sweet honey.',
    biome: 'sunflower_meadows',
    position: { x: 0, y: 0, z: 0 },
    size: 50,
    level: 1,
    isSafeZone: true,
    buildings: [
      {
        id: 'town_hall_honey',
        type: 'town_hall',
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        size: { width: 10, height: 8, depth: 10 },
        color: '#FFD700'
      },
      {
        id: 'pet_shop_honey',
        type: 'pet_shop',
        position: { x: 15, y: 0, z: 5 },
        rotation: 0,
        size: { width: 8, height: 6, depth: 8 },
        color: '#FFB6C1',
        npcId: 'pet_shop_owner'
      },
      {
        id: 'inn_honey',
        type: 'inn',
        position: { x: -15, y: 0, z: 5 },
        rotation: 0,
        size: { width: 10, height: 7, depth: 10 },
        color: '#90EE90',
        services: ['heal', 'rest']
      },
      {
        id: 'crafting_honey',
        type: 'crafting_station',
        position: { x: 0, y: 0, z: 15 },
        rotation: 0,
        size: { width: 6, height: 5, depth: 6 },
        color: '#DDA0DD',
        services: ['craft']
      },
      {
        id: 'fountain_honey',
        type: 'fountain',
        position: { x: 0, y: 0, z: -10 },
        rotation: 0,
        size: { width: 4, height: 3, depth: 4 },
        color: '#87CEEB'
      }
    ],
    npcs: ['farmer_npc', 'beekeeper_npc', 'pet_shop_owner'],
    shops: ['general', 'pet'],
    services: ['heal', 'rest', 'craft', 'pet_adoption'],
    icon: '🍯',
    color: '#FFD700',
    musicTheme: 'peaceful',
    specialFeatures: ['sunflower_gardens', 'honey_fountains', 'bee_hives']
  },
  {
    id: 'crystal_grove',
    name: 'Crystal Grove',
    description: 'A mystical village built among crystal trees, where magic flows freely.',
    biome: 'crystal_forest',
    position: { x: 50, y: 0, z: 30 },
    size: 60,
    level: 3,
    isSafeZone: true,
    buildings: [
      {
        id: 'town_hall_crystal',
        type: 'town_hall',
        position: { x: 50, y: 0, z: 30 },
        rotation: 0,
        size: { width: 12, height: 10, depth: 12 },
        color: '#00CED1'
      },
      {
        id: 'library_crystal',
        type: 'library',
        position: { x: 65, y: 0, z: 30 },
        rotation: 0,
        size: { width: 10, height: 8, depth: 10 },
        color: '#9370DB'
      },
      {
        id: 'crafting_crystal',
        type: 'crafting_station',
        position: { x: 35, y: 0, z: 30 },
        rotation: 0,
        size: { width: 8, height: 6, depth: 8 },
        color: '#DDA0DD',
        services: ['craft', 'enchant']
      },
      {
        id: 'inn_crystal',
        type: 'inn',
        position: { x: 50, y: 0, z: 45 },
        rotation: 0,
        size: { width: 10, height: 7, depth: 10 },
        color: '#90EE90',
        services: ['heal', 'rest']
      }
    ],
    npcs: ['crystal_keeper', 'forest_ranger'],
    shops: ['general', 'magic'],
    services: ['heal', 'rest', 'craft', 'enchant'],
    icon: '🔮',
    color: '#00CED1',
    musicTheme: 'mystical',
    specialFeatures: ['crystal_trees', 'magic_springs', 'ancient_stones']
  },
  {
    id: 'prism_village',
    name: 'Prism Village',
    description: 'A colorful village where every building is a different color of the rainbow.',
    biome: 'rainbow_hills',
    position: { x: 100, y: 0, z: 50 },
    size: 55,
    level: 2,
    isSafeZone: true,
    buildings: [
      {
        id: 'town_hall_prism',
        type: 'town_hall',
        position: { x: 100, y: 0, z: 50 },
        rotation: 0,
        size: { width: 10, height: 8, depth: 10 },
        color: '#FF69B4'
      },
      {
        id: 'shop_prism',
        type: 'shop',
        position: { x: 115, y: 0, z: 50 },
        rotation: 0,
        size: { width: 8, height: 6, depth: 8 },
        color: '#FF1493',
        npcId: 'cloud_merchant'
      },
      {
        id: 'crafting_prism',
        type: 'crafting_station',
        position: { x: 85, y: 0, z: 50 },
        rotation: 0,
        size: { width: 6, height: 5, depth: 6 },
        color: '#FFB6C1',
        services: ['craft']
      },
      {
        id: 'park_prism',
        type: 'park',
        position: { x: 100, y: 0, z: 35 },
        rotation: 0,
        size: { width: 20, height: 1, depth: 20 },
        color: '#90EE90'
      }
    ],
    npcs: ['color_master', 'cloud_merchant'],
    shops: ['general', 'color'],
    services: ['heal', 'craft'],
    icon: '🌈',
    color: '#FF69B4',
    musicTheme: 'joyful',
    specialFeatures: ['rainbow_bridges', 'color_fountains', 'floating_islands']
  },
  {
    id: 'sugar_town',
    name: 'Sugar Town',
    description: 'A sweet town made entirely of candy, where everything is edible!',
    biome: 'candy_canyon',
    position: { x: 200, y: 0, z: 100 },
    size: 70,
    level: 8,
    isSafeZone: true,
    buildings: [
      {
        id: 'town_hall_sugar',
        type: 'town_hall',
        position: { x: 200, y: 0, z: 100 },
        rotation: 0,
        size: { width: 12, height: 10, depth: 12 },
        color: '#FF1493'
      },
      {
        id: 'shop_sugar',
        type: 'shop',
        position: { x: 220, y: 0, z: 100 },
        rotation: 0,
        size: { width: 10, height: 7, depth: 10 },
        color: '#FF69B4',
        npcId: 'sweet_tooth_merchant'
      },
      {
        id: 'crafting_sugar',
        type: 'crafting_station',
        position: { x: 180, y: 0, z: 100 },
        rotation: 0,
        size: { width: 8, height: 6, depth: 8 },
        color: '#FFB6C1',
        npcId: 'candy_chef',
        services: ['craft']
      },
      {
        id: 'inn_sugar',
        type: 'inn',
        position: { x: 200, y: 0, z: 120 },
        rotation: 0,
        size: { width: 10, height: 7, depth: 10 },
        color: '#FFC0CB',
        services: ['heal', 'rest']
      }
    ],
    npcs: ['candy_chef', 'sweet_tooth_merchant'],
    shops: ['general', 'candy'],
    services: ['heal', 'rest', 'craft'],
    icon: '🍭',
    color: '#FF1493',
    musicTheme: 'playful',
    specialFeatures: ['chocolate_rivers', 'candy_caves', 'gingerbread_castles']
  },
  {
    id: 'coral_city',
    name: 'Coral City',
    description: 'An underwater city built among coral reefs, home to friendly sea creatures.',
    biome: 'ocean_reef',
    position: { x: 0, y: -10, z: 200 },
    size: 80,
    level: 10,
    isSafeZone: true,
    buildings: [
      {
        id: 'town_hall_coral',
        type: 'town_hall',
        position: { x: 0, y: -10, z: 200 },
        rotation: 0,
        size: { width: 15, height: 12, depth: 15 },
        color: '#00BFFF'
      },
      {
        id: 'shop_coral',
        type: 'shop',
        position: { x: 20, y: -10, z: 200 },
        rotation: 0,
        size: { width: 10, height: 8, depth: 10 },
        color: '#4682B4',
        npcId: 'mermaid_merchant'
      },
      {
        id: 'fishing_station_coral',
        type: 'crafting_station',
        position: { x: -20, y: -10, z: 200 },
        rotation: 0,
        size: { width: 8, height: 6, depth: 8 },
        color: '#87CEEB',
        npcId: 'fishing_master',
        services: ['fishing']
      },
      {
        id: 'inn_coral',
        type: 'inn',
        position: { x: 0, y: -10, z: 220 },
        rotation: 0,
        size: { width: 12, height: 9, depth: 12 },
        color: '#B0E0E6',
        services: ['heal', 'rest']
      }
    ],
    npcs: ['mermaid_merchant', 'diver_npc', 'fishing_master'],
    shops: ['general', 'ocean'],
    services: ['heal', 'rest', 'fishing'],
    icon: '🧜‍♀️',
    color: '#00BFFF',
    musicTheme: 'oceanic',
    specialFeatures: ['underwater_caves', 'treasure_chests', 'coral_gardens']
  },
  {
    id: 'frost_village',
    name: 'Frost Village',
    description: 'A cozy village in the snowy peaks, warmed by hot springs.',
    biome: 'frosty_peaks',
    position: { x: 300, y: 20, z: 400 },
    size: 65,
    level: 12,
    isSafeZone: true,
    buildings: [
      {
        id: 'town_hall_frost',
        type: 'town_hall',
        position: { x: 300, y: 20, z: 400 },
        rotation: 0,
        size: { width: 12, height: 10, depth: 12 },
        color: '#B0E0E6'
      },
      {
        id: 'shop_frost',
        type: 'shop',
        position: { x: 320, y: 20, z: 400 },
        rotation: 0,
        size: { width: 10, height: 7, depth: 10 },
        color: '#FFFFFF',
        npcId: 'ice_merchant'
      },
      {
        id: 'inn_frost',
        type: 'inn',
        position: { x: 280, y: 20, z: 400 },
        rotation: 0,
        size: { width: 10, height: 7, depth: 10 },
        color: '#E0F6FF',
        services: ['heal', 'rest']
      },
      {
        id: 'hot_spring_frost',
        type: 'fountain',
        position: { x: 300, y: 20, z: 415 },
        rotation: 0,
        size: { width: 15, height: 2, depth: 15 },
        color: '#FF6347',
        services: ['heal']
      }
    ],
    npcs: ['snowman_npc', 'ice_merchant'],
    shops: ['general', 'winter'],
    services: ['heal', 'rest'],
    icon: '⛄',
    color: '#B0E0E6',
    musicTheme: 'winter',
    specialFeatures: ['ice_caves', 'hot_springs', 'snow_forts']
  },
  {
    id: 'sky_city',
    name: 'Sky City',
    description: 'A magnificent floating city in the clouds, accessible by rainbow bridges.',
    biome: 'cloud_kingdom',
    position: { x: 500, y: 100, z: 500 },
    size: 100,
    level: 25,
    isSafeZone: true,
    buildings: [
      {
        id: 'palace_sky',
        type: 'town_hall',
        position: { x: 500, y: 100, z: 500 },
        rotation: 0,
        size: { width: 20, height: 15, depth: 20 },
        color: '#FFE4E1'
      },
      {
        id: 'shop_sky',
        type: 'shop',
        position: { x: 530, y: 100, z: 500 },
        rotation: 0,
        size: { width: 12, height: 10, depth: 12 },
        color: '#F0F8FF',
        npcId: 'sky_merchant'
      },
      {
        id: 'library_sky',
        type: 'library',
        position: { x: 470, y: 100, z: 500 },
        rotation: 0,
        size: { width: 15, height: 12, depth: 15 },
        color: '#E0F6FF'
      },
      {
        id: 'inn_sky',
        type: 'inn',
        position: { x: 500, y: 100, z: 530 },
        rotation: 0,
        size: { width: 12, height: 10, depth: 12 },
        color: '#FFE4E1',
        services: ['heal', 'rest', 'teleport']
      }
    ],
    npcs: ['cloud_king', 'sky_merchant'],
    shops: ['general', 'cloud'],
    services: ['heal', 'rest', 'teleport'],
    icon: '☁️',
    color: '#FFE4E1',
    musicTheme: 'epic',
    specialFeatures: ['cloud_castles', 'rainbow_bridges', 'wind_mills']
  },
  {
    id: 'nexus_city',
    name: 'Nexus City',
    description: 'A futuristic city with neon lights, friendly robots, and hover vehicles.',
    biome: 'neon_city',
    position: { x: 1000, y: 0, z: 0 },
    size: 150,
    level: 28,
    isSafeZone: true,
    buildings: [
      {
        id: 'city_hall_nexus',
        type: 'town_hall',
        position: { x: 1000, y: 0, z: 0 },
        rotation: 0,
        size: { width: 25, height: 20, depth: 25 },
        color: '#00FFFF'
      },
      {
        id: 'shop_nexus',
        type: 'shop',
        position: { x: 1040, y: 0, z: 0 },
        rotation: 0,
        size: { width: 15, height: 12, depth: 15 },
        color: '#FF00FF',
        npcId: 'robot_merchant'
      },
      {
        id: 'crafting_nexus',
        type: 'crafting_station',
        position: { x: 960, y: 0, z: 0 },
        rotation: 0,
        size: { width: 12, height: 10, depth: 12 },
        color: '#00FF00',
        services: ['craft', 'repair']
      },
      {
        id: 'inn_nexus',
        type: 'inn',
        position: { x: 1000, y: 0, z: 40 },
        rotation: 0,
        size: { width: 15, height: 12, depth: 15 },
        color: '#FF1493',
        services: ['heal', 'rest', 'teleport']
      }
    ],
    npcs: ['robot_merchant', 'tech_master'],
    shops: ['general', 'tech'],
    services: ['heal', 'rest', 'teleport', 'craft', 'repair'],
    icon: '🌃',
    color: '#00FFFF',
    musicTheme: 'cyberpunk',
    specialFeatures: ['neon_buildings', 'hover_pads', 'tech_labs']
  }
]

export const TOWN_MAP = new Map(TOWNS.map(town => [town.id, town]))

export function getTown(id: string): Town | undefined {
  return TOWN_MAP.get(id)
}

export function getTownsByBiome(biomeId: string): Town[] {
  return TOWNS.filter(town => town.biome === biomeId)
}

export function isInSafeZone(position: { x: number; y: number; z: number }): boolean {
  for (const town of TOWNS) {
    if (!town.isSafeZone) continue
    
    const distance = Math.sqrt(
      Math.pow(position.x - town.position.x, 2) +
      Math.pow(position.z - town.position.z, 2)
    )
    
    if (distance <= town.size) {
      return true
    }
  }
  return false
}

export function getNearestTown(position: { x: number; y: number; z: number }): Town | null {
  let nearest: Town | null = null
  let minDistance = Infinity
  
  for (const town of TOWNS) {
    const distance = Math.sqrt(
      Math.pow(position.x - town.position.x, 2) +
      Math.pow(position.z - town.position.z, 2)
    )
    
    if (distance < minDistance) {
      minDistance = distance
      nearest = town
    }
  }
  
  return nearest
}

