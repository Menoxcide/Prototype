/**
 * Icon Generator - Creates SVG icons for all game items, spells, and UI elements
 * Provides high-quality vector icons that scale perfectly
 */

import React from 'react'

export interface IconProps {
  size?: number
  color?: string
  className?: string
}

/**
 * Generate SVG icon component
 */
export function createIcon(
  _id: string,
  svgPath: string,
  viewBox: string = '0 0 24 24'
): React.FC<IconProps> {
  return ({ size = 24, color = 'currentColor', className = '' }) => (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d={svgPath} fill={color} />
    </svg>
  )
}

/**
 * Weapon Icons
 */
export const WeaponIcons = {
  quantumBlade: createIcon('quantum_blade', 'M12 2L2 7L12 12L22 7L12 2Z M2 17L12 22L22 17 M2 12L12 17L22 12'),
  plasmaRifle: createIcon('plasma_rifle', 'M3 3H21V5H3V3Z M4 5H20V7H4V5Z M5 7H19V9H5V7Z M6 9H18V11H6V9Z M8 11H16V13H8V11Z'),
  voidStaff: createIcon('void_staff', 'M12 2L10 8L12 10L14 8L12 2Z M12 10L8 14L12 18L16 14L12 10Z M12 18L10 20L12 22L14 20L12 18Z'),
}

/**
 * Armor Icons
 */
export const ArmorIcons = {
  cyberHelmet: createIcon('cyber_helmet', 'M12 2C8 2 5 5 5 9C5 11 6 13 8 14V16H16V14C18 13 19 11 19 9C19 5 16 2 12 2Z'),
  quantumArmor: createIcon('quantum_armor', 'M12 2L2 7L12 12L22 7L12 2Z M12 12L7 17L12 22L17 17L12 12Z'),
}

/**
 * Consumable Icons
 */
export const ConsumableIcons = {
  healthPack: createIcon('health_pack', 'M12 2L2 7L12 12L22 7L12 2Z M12 12L7 17L12 22L17 17L12 12Z'),
  manaCell: createIcon('mana_cell', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  energyDrink: createIcon('energy_drink', 'M8 2H16V4H8V2Z M8 4H16V20H8V4Z M10 6H14V8H10V6Z'),
}

/**
 * Resource Icons
 */
export const ResourceIcons = {
  quantumCrystal: createIcon('quantum_crystal', 'M12 2L8 8L12 14L16 8L12 2Z M12 14L8 20L12 22L16 20L12 14Z'),
  cyberScrap: createIcon('cyber_scrap', 'M4 4H20V6H4V4Z M6 6H18V8H6V6Z M8 8H16V10H8V8Z'),
  voidEssence: createIcon('void_essence', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  plasmaCore: createIcon('plasma_core', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  neuralInterface: createIcon('neural_interface', 'M12 2C8 2 5 5 5 9C5 11 6 13 8 14V16H16V14C18 13 19 11 19 9C19 5 16 2 12 2Z'),
  quantumCircuit: createIcon('quantum_circuit', 'M2 2H22V4H2V2Z M4 4H20V6H4V4Z M6 6H18V8H6V6Z M8 8H16V10H8V8Z'),
}

/**
 * Spell Icons
 */
export const SpellIcons = {
  quantumBolt: createIcon('quantum_bolt', 'M12 2L2 12L12 22L22 12L12 2Z'),
  plasmaBurst: createIcon('plasma_burst', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  voidStrike: createIcon('void_strike', 'M12 2L8 8L12 14L16 8L12 2Z'),
  healCircuit: createIcon('heal_circuit', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  quantumSlash: createIcon('quantum_slash', 'M2 2L22 2L12 12L2 2Z M2 22L22 22L12 12L2 22Z'),
  chainLightning: createIcon('chain_lightning', 'M2 2L12 12L2 22Z M22 2L12 12L22 22Z M12 2L12 22Z'),
  shieldMatrix: createIcon('shield_matrix', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  teleport: createIcon('teleport', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  meteorStrike: createIcon('meteor_strike', 'M12 2L2 12L12 22L22 12L12 2Z'),
  energyDrain: createIcon('energy_drain', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
}

/**
 * UI Icons
 */
export const UIIcons = {
  inventory: createIcon('inventory', 'M4 4H20V6H4V4Z M6 6H18V20H6V6Z M8 8H16V10H8V8Z M8 12H16V14H8V12Z'),
  crafting: createIcon('crafting', 'M12 2L2 7L12 12L22 7L12 2Z M12 12L7 17L12 22L17 17L12 12Z'),
  market: createIcon('market', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  spellbook: createIcon('spellbook', 'M4 4H20V6H4V4Z M6 6H18V20H6V6Z M8 8H16V10H8V8Z'),
  guild: createIcon('guild', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  quest: createIcon('quest', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  battlePass: createIcon('battle_pass', 'M12 2L2 7L12 12L22 7L12 2Z M12 12L7 17L12 22L17 17L12 12Z'),
  achievement: createIcon('achievement', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  shop: createIcon('shop', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  skills: createIcon('skills', 'M12 2L2 12L12 22L22 12L12 2Z'),
  close: createIcon('close', 'M2 2L22 22M22 2L2 22'),
  settings: createIcon('settings', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
}

/**
 * Get icon component by item ID
 */
export function getItemIcon(itemId: string): React.FC<IconProps> | null {
  const iconMap: Record<string, React.FC<IconProps>> = {
    // Weapons
    quantum_blade: WeaponIcons.quantumBlade,
    plasma_rifle: WeaponIcons.plasmaRifle,
    void_staff: WeaponIcons.voidStaff,
    // Armor
    cyber_helmet: ArmorIcons.cyberHelmet,
    quantum_armor: ArmorIcons.quantumArmor,
    // Consumables
    health_pack: ConsumableIcons.healthPack,
    mana_cell: ConsumableIcons.manaCell,
    energy_drink: ConsumableIcons.energyDrink,
    // Resources
    quantum_crystal: ResourceIcons.quantumCrystal,
    cyber_scrap: ResourceIcons.cyberScrap,
    void_essence: ResourceIcons.voidEssence,
    plasma_core: ResourceIcons.plasmaCore,
    neural_interface: ResourceIcons.neuralInterface,
    quantum_circuit: ResourceIcons.quantumCircuit,
  }
  
  return iconMap[itemId] || null
}

/**
 * Get spell icon component by spell ID
 */
export function getSpellIcon(spellId: string): React.FC<IconProps> | null {
  const iconMap: Record<string, React.FC<IconProps>> = {
    quantum_bolt: SpellIcons.quantumBolt,
    plasma_burst: SpellIcons.plasmaBurst,
    void_strike: SpellIcons.voidStrike,
    heal_circuit: SpellIcons.healCircuit,
    quantum_slash: SpellIcons.quantumSlash,
    chain_lightning: SpellIcons.chainLightning,
    shield_matrix: SpellIcons.shieldMatrix,
    teleport: SpellIcons.teleport,
    meteor_strike: SpellIcons.meteorStrike,
    energy_drain: SpellIcons.energyDrain,
  }
  
  return iconMap[spellId] || null
}

/**
 * Get UI icon component by icon ID
 */
export function getUIIcon(iconId: string): React.FC<IconProps> | null {
  return UIIcons[iconId as keyof typeof UIIcons] || null
}

