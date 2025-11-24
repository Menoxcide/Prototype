export interface Cosmetic {
  id: string
  name: string
  description: string
  type: 'skin' | 'weapon_trail' | 'death_effect' | 'name_glow' | 'aura' | 'pet'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  price: number
  premiumOnly: boolean
  icon: string
  preview?: string
}

export const COSMETICS: Cosmetic[] = [
  // Skins
  {
    id: 'chroma_skin_rainbow',
    name: 'Rainbow Chroma',
    description: 'A skin that pulses with rainbow colors',
    type: 'skin',
    rarity: 'legendary',
    price: 2000,
    premiumOnly: false,
    icon: '🌈'
  },
  {
    id: 'void_skin',
    name: 'Void Black Hole',
    description: 'A dark skin with void energy aura',
    type: 'skin',
    rarity: 'epic',
    price: 1500,
    premiumOnly: false,
    icon: '🌑'
  },
  {
    id: 'neon_glow',
    name: 'Neon Glow',
    description: 'Enhanced neon glow effect',
    type: 'skin',
    rarity: 'rare',
    price: 800,
    premiumOnly: false,
    icon: '💡'
  },
  // Weapon Trails
  {
    id: 'weapon_trail_blue',
    name: 'Blue Energy Trail',
    description: 'Blue energy trail for weapons',
    type: 'weapon_trail',
    rarity: 'common',
    price: 300,
    premiumOnly: false,
    icon: '💙'
  },
  {
    id: 'weapon_trail_pink',
    name: 'Pink Energy Trail',
    description: 'Pink energy trail for weapons',
    type: 'weapon_trail',
    rarity: 'common',
    price: 300,
    premiumOnly: false,
    icon: '💗'
  },
  {
    id: 'weapon_trail_rainbow',
    name: 'Rainbow Trail',
    description: 'Rainbow energy trail',
    type: 'weapon_trail',
    rarity: 'epic',
    price: 1200,
    premiumOnly: false,
    icon: '🌈'
  },
  // Death Effects
  {
    id: 'death_effect_void',
    name: 'Void Explosion',
    description: 'Void energy explosion on death',
    type: 'death_effect',
    rarity: 'rare',
    price: 600,
    premiumOnly: false,
    icon: '💥'
  },
  {
    id: 'death_effect_neon',
    name: 'Neon Fade',
    description: 'Neon fade-out effect',
    type: 'death_effect',
    rarity: 'uncommon',
    price: 400,
    premiumOnly: false,
    icon: '✨'
  },
  // Name Glows
  {
    id: 'name_glow_purple',
    name: 'Purple Glow',
    description: 'Purple glow for name tag',
    type: 'name_glow',
    rarity: 'common',
    price: 200,
    premiumOnly: false,
    icon: '💜'
  },
  {
    id: 'name_glow_gold',
    name: 'Gold Glow',
    description: 'Gold glow for name tag',
    type: 'name_glow',
    rarity: 'rare',
    price: 700,
    premiumOnly: false,
    icon: '💛'
  },
  // Auras
  {
    id: 'legendary_aura',
    name: 'Legendary Aura',
    description: 'Powerful legendary aura effect',
    type: 'aura',
    rarity: 'legendary',
    price: 2500,
    premiumOnly: true,
    icon: '👑'
  },
  // Pets
  {
    id: 'drone_pet',
    name: 'Companion Drone',
    description: 'A small drone that follows you',
    type: 'pet',
    rarity: 'epic',
    price: 1800,
    premiumOnly: false,
    icon: '🤖'
  }
]

export function getCosmeticsByType(type: Cosmetic['type']): Cosmetic[] {
  return COSMETICS.filter(cosmetic => cosmetic.type === type)
}

export function getCosmetic(id: string): Cosmetic | undefined {
  return COSMETICS.find(cosmetic => cosmetic.id === id)
}

