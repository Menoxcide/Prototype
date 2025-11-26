import { Recipe } from '../types'

export const RECIPES: Recipe[] = [
  {
    id: 'health_pack_craft',
    name: 'Health Pack',
    description: 'Craft a health pack from basic materials.',
    ingredients: [
      { itemId: 'cyber_scrap', quantity: 5 },
      { itemId: 'neural_interface', quantity: 1 }
    ],
    result: { itemId: 'health_pack', quantity: 3 },
    craftingTime: 5000,
    level: 1
  },
  {
    id: 'mana_cell_craft',
    name: 'Mana Cell',
    description: 'Craft a mana cell from quantum materials.',
    ingredients: [
      { itemId: 'quantum_crystal', quantity: 2 },
      { itemId: 'quantum_circuit', quantity: 1 }
    ],
    result: { itemId: 'mana_cell', quantity: 3 },
    craftingTime: 5000,
    level: 2
  },
  {
    id: 'quantum_blade_craft',
    name: 'Quantum Blade',
    description: 'Forge a powerful quantum blade.',
    ingredients: [
      { itemId: 'quantum_crystal', quantity: 10 },
      { itemId: 'quantum_circuit', quantity: 5 },
      { itemId: 'cyber_scrap', quantity: 20 }
    ],
    result: { itemId: 'quantum_blade', quantity: 1 },
    craftingTime: 30000,
    level: 5
  },
  {
    id: 'plasma_rifle_craft',
    name: 'Plasma Rifle',
    description: 'Assemble an advanced plasma rifle.',
    ingredients: [
      { itemId: 'plasma_core', quantity: 5 },
      { itemId: 'quantum_circuit', quantity: 10 },
      { itemId: 'cyber_scrap', quantity: 50 },
      { itemId: 'neural_interface', quantity: 3 }
    ],
    result: { itemId: 'plasma_rifle', quantity: 1 },
    craftingTime: 60000,
    level: 10
  },
  {
    id: 'quantum_armor_craft',
    name: 'Quantum Armor',
    description: 'Craft advanced quantum armor.',
    ingredients: [
      { itemId: 'void_essence', quantity: 3 },
      { itemId: 'quantum_crystal', quantity: 15 },
      { itemId: 'quantum_circuit', quantity: 8 },
      { itemId: 'cyber_scrap', quantity: 30 }
    ],
    result: { itemId: 'quantum_armor', quantity: 1 },
    craftingTime: 90000,
    level: 15
  },
  {
    id: 'energy_drink_craft',
    name: 'Energy Drink',
    description: 'Brew an energy-boosting drink.',
    ingredients: [
      { itemId: 'plasma_core', quantity: 1 },
      { itemId: 'cyber_scrap', quantity: 3 }
    ],
    result: { itemId: 'energy_drink', quantity: 2 },
    craftingTime: 10000,
    level: 3
  },
  {
    id: 'void_shield_craft',
    name: 'Void Shield',
    description: 'Craft a powerful void shield.',
    ingredients: [
      { itemId: 'void_essence', quantity: 5 },
      { itemId: 'quantum_circuit', quantity: 8 },
      { itemId: 'cyber_scrap', quantity: 25 }
    ],
    result: { itemId: 'void_shield', quantity: 1 },
    craftingTime: 45000,
    level: 8
  },
  {
    id: 'plasma_grenade_craft',
    name: 'Plasma Grenade',
    description: 'Craft explosive plasma grenades.',
    ingredients: [
      { itemId: 'plasma_core', quantity: 3 },
      { itemId: 'quantum_crystal', quantity: 2 },
      { itemId: 'cyber_scrap', quantity: 10 }
    ],
    result: { itemId: 'plasma_grenade', quantity: 5 },
    craftingTime: 20000,
    level: 6
  },
  {
    id: 'neural_enhancer_craft',
    name: 'Neural Enhancer',
    description: 'Enhance your neural interface.',
    ingredients: [
      { itemId: 'neural_interface', quantity: 5 },
      { itemId: 'quantum_circuit', quantity: 3 },
      { itemId: 'void_essence', quantity: 2 }
    ],
    result: { itemId: 'neural_enhancer', quantity: 1 },
    craftingTime: 35000,
    level: 12
  },
  {
    id: 'quantum_boots_craft',
    name: 'Quantum Boots',
    description: 'Craft boots with quantum speed enhancement.',
    ingredients: [
      { itemId: 'quantum_crystal', quantity: 8 },
      { itemId: 'quantum_circuit', quantity: 4 },
      { itemId: 'cyber_scrap', quantity: 15 }
    ],
    result: { itemId: 'quantum_boots', quantity: 1 },
    craftingTime: 25000,
    level: 7
  },
  {
    id: 'repair_kit_craft',
    name: 'Repair Kit',
    description: 'Craft a kit to repair damaged equipment.',
    ingredients: [
      { itemId: 'cyber_scrap', quantity: 10 },
      { itemId: 'quantum_circuit', quantity: 2 }
    ],
    result: { itemId: 'repair_kit', quantity: 3 },
    craftingTime: 15000,
    level: 4
  },
  {
    id: 'energy_core_craft',
    name: 'Energy Core',
    description: 'Craft a powerful energy core.',
    ingredients: [
      { itemId: 'plasma_core', quantity: 10 },
      { itemId: 'quantum_crystal', quantity: 5 },
      { itemId: 'void_essence', quantity: 3 }
    ],
    result: { itemId: 'energy_core', quantity: 1 },
    craftingTime: 60000,
    level: 20
  }
]

export const RECIPE_MAP = new Map(RECIPES.map(recipe => [recipe.id, recipe]))

export function getRecipe(id: string): Recipe | undefined {
  return RECIPE_MAP.get(id)
}

export function getRecipesByLevel(level: number): Recipe[] {
  return RECIPES.filter(recipe => recipe.level <= level)
}

