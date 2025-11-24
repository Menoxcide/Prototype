/**
 * NPC System - Friendly non-player characters with quests, shops, and interactions
 * Kid-friendly NPCs for tablet MMO
 */

export interface NPC {
  id: string
  name: string
  description: string
  type: 'quest_giver' | 'merchant' | 'crafting' | 'guard' | 'story' | 'pet_shop' | 'fishing' | 'mining'
  position: { x: number; y: number; z: number }
  biome: string
  town?: string
  level: number
  icon: string
  model?: string
  dialogue: string[]
  quests?: string[] // Quest IDs this NPC can give
  shopItems?: { itemId: string; price: number; stock?: number }[]
  services?: string[] // Services like 'heal', 'repair', 'teleport'
  personality: 'friendly' | 'cheerful' | 'wise' | 'playful' | 'mysterious' | 'energetic'
  greeting: string
  farewell: string
}

export const NPCS: NPC[] = [
  // Starting area NPCs
  {
    id: 'farmer_npc',
    name: 'Farmer Sunny',
    description: 'A cheerful farmer who loves growing sunflowers.',
    type: 'quest_giver',
    position: { x: 0, y: 0, z: 0 },
    biome: 'sunflower_meadows',
    town: 'honey_hollow',
    level: 1,
    icon: '👨‍🌾',
    dialogue: [
      'Welcome to Sunflower Meadows!',
      'These flowers grow so tall, don\'t they?',
      'Would you like to help me harvest some seeds?'
    ],
    quests: ['harvest_sunflowers', 'help_bees'],
    personality: 'friendly',
    greeting: 'Hello there, young adventurer!',
    farewell: 'Come back anytime!'
  },
  {
    id: 'beekeeper_npc',
    name: 'Beekeeper Buzz',
    description: 'A friendly beekeeper who knows all about honey.',
    type: 'merchant',
    position: { x: 10, y: 0, z: 5 },
    biome: 'sunflower_meadows',
    town: 'honey_hollow',
    level: 1,
    icon: '🍯',
    dialogue: [
      'Bees are our friends!',
      'Honey makes everything better!',
      'Want to buy some fresh honey?'
    ],
    shopItems: [
      { itemId: 'honey', price: 50 },
      { itemId: 'honey_cake', price: 100 },
      { itemId: 'bee_wings', price: 200 }
    ],
    personality: 'cheerful',
    greeting: 'Buzz buzz! Welcome!',
    farewell: 'Stay sweet!'
  },
  {
    id: 'crystal_keeper',
    name: 'Keeper Luna',
    description: 'The guardian of the crystal forest, wise and kind.',
    type: 'quest_giver',
    position: { x: 50, y: 0, z: 30 },
    biome: 'crystal_forest',
    town: 'crystal_grove',
    level: 3,
    icon: '🔮',
    dialogue: [
      'The crystals whisper secrets to those who listen.',
      'Magic flows through every tree here.',
      'Would you help protect our forest?'
    ],
    quests: ['protect_crystals', 'find_lost_sprite'],
    services: ['heal'],
    personality: 'wise',
    greeting: 'Welcome, seeker of magic.',
    farewell: 'May the crystals guide you.'
  },
  {
    id: 'color_master',
    name: 'Master Prism',
    description: 'A master of colors who can teach you about rainbows.',
    type: 'crafting',
    position: { x: 100, y: 0, z: 50 },
    biome: 'rainbow_hills',
    town: 'prism_village',
    level: 2,
    icon: '🌈',
    dialogue: [
      'Every color tells a story!',
      'Mix them together and see what happens!',
      'I can teach you to craft colorful items!'
    ],
    services: ['craft'],
    personality: 'playful',
    greeting: 'Welcome to the world of colors!',
    farewell: 'Keep shining bright!'
  },
  // Mid-level NPCs
  {
    id: 'candy_chef',
    name: 'Chef Sweet',
    description: 'A master candy maker who creates magical treats.',
    type: 'crafting',
    position: { x: 200, y: 0, z: 100 },
    biome: 'candy_canyon',
    town: 'sugar_town',
    level: 8,
    icon: '🍭',
    dialogue: [
      'Everything tastes better when made with love!',
      'Want to learn to make candy?',
      'My chocolate river never runs dry!'
    ],
    quests: ['make_candy', 'deliver_sweets'],
    services: ['craft'],
    personality: 'cheerful',
    greeting: 'Welcome to my sweet shop!',
    farewell: 'Stay sweet!'
  },
  {
    id: 'mermaid_merchant',
    name: 'Coral',
    description: 'A friendly mermaid who trades ocean treasures.',
    type: 'merchant',
    position: { x: 0, y: -10, z: 200 },
    biome: 'ocean_reef',
    town: 'coral_city',
    level: 10,
    icon: '🧜‍♀️',
    dialogue: [
      'The ocean holds many secrets!',
      'I found these treasures just for you!',
      'Want to go fishing together?'
    ],
    shopItems: [
      { itemId: 'pearl', price: 300 },
      { itemId: 'sea_shell', price: 100 },
      { itemId: 'coral_fragment', price: 150 },
      { itemId: 'underwater_breath_potion', price: 500 }
    ],
    services: ['fishing'],
    personality: 'friendly',
    greeting: 'Welcome to the depths!',
    farewell: 'Swim safely!'
  },
  {
    id: 'snowman_npc',
    name: 'Frosty',
    description: 'A friendly snowman who loves winter games.',
    type: 'quest_giver',
    position: { x: 300, y: 20, z: 400 },
    biome: 'frosty_peaks',
    town: 'frost_village',
    level: 12,
    icon: '⛄',
    dialogue: [
      'Winter is the best season!',
      'Want to build a snow fort?',
      'The hot springs are so warm!'
    ],
    quests: ['build_snow_fort', 'find_ice_crystals'],
    personality: 'playful',
    greeting: 'Brrr... I mean, welcome!',
    farewell: 'Stay warm!'
  },
  // Advanced NPCs
  {
    id: 'cloud_king',
    name: 'King Sky',
    description: 'The ruler of the Cloud Kingdom, wise and powerful.',
    type: 'story',
    position: { x: 500, y: 100, z: 500 },
    biome: 'cloud_kingdom',
    town: 'sky_city',
    level: 25,
    icon: '👑',
    dialogue: [
      'Welcome to my floating kingdom!',
      'The clouds have chosen you.',
      'Great adventures await above!'
    ],
    quests: ['cloud_kingdom_trial', 'defend_sky_city'],
    services: ['teleport', 'heal'],
    personality: 'wise',
    greeting: 'Welcome, honored guest.',
    farewell: 'May the winds guide you.'
  },
  {
    id: 'fairy_queen',
    name: 'Queen Sparkle',
    description: 'The magical ruler of the Enchanted Grove.',
    type: 'quest_giver',
    position: { x: 700, y: 0, z: 600 },
    biome: 'enchanted_grove',
    town: 'mystic_hollow',
    level: 30,
    icon: '🧚‍♀️',
    dialogue: [
      'Magic flows through everything here.',
      'The ancient trees remember all.',
      'You have a special spark, I can see it!'
    ],
    quests: ['restore_magic', 'befriend_dragon'],
    services: ['heal', 'enchant'],
    personality: 'mysterious',
    greeting: 'Welcome, child of magic.',
    farewell: 'May your path be enchanted.'
  },
  {
    id: 'robot_merchant',
    name: 'Robo',
    description: 'A friendly robot who loves technology.',
    type: 'merchant',
    position: { x: 1000, y: 0, z: 0 },
    biome: 'neon_city',
    town: 'nexus_city',
    level: 28,
    icon: '🤖',
    dialogue: [
      'Beep boop! Welcome!',
      'Technology makes life better!',
      'Want to see my latest gadgets?'
    ],
    shopItems: [
      { itemId: 'neon_crystal', price: 400 },
      { itemId: 'tech_scrap', price: 50 },
      { itemId: 'energy_cell', price: 200 },
      { itemId: 'circuit_board', price: 300 },
      { itemId: 'hover_board', price: 2000 }
    ],
    services: ['repair'],
    personality: 'energetic',
    greeting: 'Hello! I am Robo!',
    farewell: 'Stay connected!'
  },
  // Special NPCs
  {
    id: 'star_keeper',
    name: 'Keeper Nova',
    description: 'The guardian of the Cosmic Garden, ancient and wise.',
    type: 'story',
    position: { x: 1500, y: 200, z: 1500 },
    biome: 'cosmic_garden',
    town: 'stellar_outpost',
    level: 40,
    icon: '⭐',
    dialogue: [
      'The stars have watched over this garden for eons.',
      'You are the first visitor in a thousand years.',
      'The cosmos has chosen you for a great purpose.'
    ],
    quests: ['cosmic_trial', 'restore_stars'],
    services: ['teleport', 'heal', 'enchant'],
    personality: 'wise',
    greeting: 'Welcome, child of the stars.',
    farewell: 'May the stars light your path.'
  },
  // Pet shop NPC
  {
    id: 'pet_shop_owner',
    name: 'Pet Master Paws',
    description: 'A friendly animal lover who runs the pet shop.',
    type: 'pet_shop',
    position: { x: 0, y: 0, z: 0 },
    biome: 'sunflower_meadows',
    town: 'honey_hollow',
    level: 1,
    icon: '🐾',
    dialogue: [
      'Pets are the best friends!',
      'Want to adopt a cute companion?',
      'Every pet has a unique personality!'
    ],
    shopItems: [
      { itemId: 'pet_kitty', price: 500 },
      { itemId: 'pet_puppy', price: 500 },
      { itemId: 'pet_bunny', price: 300 },
      { itemId: 'pet_dragon', price: 2000 }
    ],
    personality: 'friendly',
    greeting: 'Welcome to the pet shop!',
    farewell: 'Take good care of your pets!'
  },
  // Fishing NPC
  {
    id: 'fishing_master',
    name: 'Master Angler',
    description: 'A master fisherman who teaches fishing.',
    type: 'fishing',
    position: { x: 0, y: -5, z: 100 },
    biome: 'ocean_reef',
    town: 'coral_city',
    level: 8,
    icon: '🎣',
    dialogue: [
      'Fishing is so peaceful!',
      'Want to learn to catch fish?',
      'The ocean has many surprises!'
    ],
    quests: ['catch_rare_fish', 'fishing_tournament'],
    services: ['fishing'],
    personality: 'friendly',
    greeting: 'Welcome, fellow angler!',
    farewell: 'Tight lines!'
  },
  // Mining NPC
  {
    id: 'mining_expert',
    name: 'Digger Deep',
    description: 'An expert miner who knows all about gems.',
    type: 'mining',
    position: { x: 400, y: -20, z: 300 },
    biome: 'volcano_islands',
    town: 'lava_port',
    level: 18,
    icon: '⛏️',
    dialogue: [
      'Mining is an adventure!',
      'Want to learn to find gems?',
      'The deeper you dig, the better the treasures!'
    ],
    quests: ['mine_rare_gems', 'explore_caves'],
    services: ['mining'],
    personality: 'energetic',
    greeting: 'Ready to dig?',
    farewell: 'Happy mining!'
  }
]

export const NPC_MAP = new Map(NPCS.map(npc => [npc.id, npc]))

export function getNPC(id: string): NPC | undefined {
  return NPC_MAP.get(id)
}

export function getNPCsByBiome(biomeId: string): NPC[] {
  return NPCS.filter(npc => npc.biome === biomeId)
}

export function getNPCsByTown(townId: string): NPC[] {
  return NPCS.filter(npc => npc.town === townId)
}

export function getNPCsByType(type: NPC['type']): NPC[] {
  return NPCS.filter(npc => npc.type === type)
}

