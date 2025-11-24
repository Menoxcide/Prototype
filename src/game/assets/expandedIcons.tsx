/**
 * Expanded Icon Library
 * Additional icons for enemies, zones, and special items
 */

import React from 'react'
import { createIcon, IconProps } from './iconGenerator'

/**
 * Enemy Type Icons
 */
export const EnemyIcons = {
  // Nexus City Enemies
  cyberDrone: createIcon('cyber_drone', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z M12 6C14 6 16 8 16 10C16 12 14 14 12 14C10 14 8 12 8 10C8 8 10 6 12 6Z'),
  securityBot: createIcon('security_bot', 'M12 2L8 6L12 10L16 6L12 2Z M12 10L8 14L12 18L16 14L12 10Z M12 18L8 20L12 22L16 20L12 18Z'),
  streetThug: createIcon('street_thug', 'M12 2C8 2 5 5 5 9C5 11 6 13 8 14V16H16V14C18 13 19 11 19 9C19 5 16 2 12 2Z'),
  
  // Quantum Peak Enemies
  quantumGhost: createIcon('quantum_ghost', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z M12 16L10 20L12 22L14 20L12 16Z'),
  energyWraith: createIcon('energy_wraith', 'M12 2L2 7L12 12L22 7L12 2Z M12 12L7 17L12 22L17 17L12 12Z'),
  phaseShifter: createIcon('phase_shifter', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  
  // Void Depths Enemies
  voidWalker: createIcon('void_walker', 'M12 2L8 8L12 14L16 8L12 2Z M12 14L8 20L12 22L16 20L12 14Z'),
  shadowBeast: createIcon('shadow_beast', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  darkEntity: createIcon('dark_entity', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  
  // Neon District Enemies
  cyberGang: createIcon('cyber_gang', 'M12 2L2 7L12 12L22 7L12 2Z'),
  hackerDrone: createIcon('hacker_drone', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  streetWarrior: createIcon('street_warrior', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  
  // Data Stream Enemies
  dataWorm: createIcon('data_worm', 'M2 12L12 2L22 12L12 22L2 12Z'),
  codeVirus: createIcon('code_virus', 'M12 2L2 12L12 22L22 12L12 2Z'),
  firewallGuardian: createIcon('firewall_guardian', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  
  // Generic Enemy Types
  drone: createIcon('drone', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  cyborg: createIcon('cyborg', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  android: createIcon('android', 'M12 2L8 6L12 10L16 6L12 2Z'),
}

/**
 * Zone Icons
 */
export const ZoneIcons = {
  nexusCity: createIcon('nexus_city', 'M12 2L2 7L12 12L22 7L12 2Z M12 12L7 17L12 22L17 17L12 12Z'),
  quantumPeak: createIcon('quantum_peak', 'M12 2L2 12L12 22L22 12L12 2Z'),
  voidDepths: createIcon('void_depths', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  neonDistrict: createIcon('neon_district', 'M12 2L8 8L12 14L16 8L12 2Z'),
  dataStream: createIcon('data_stream', 'M2 2L22 2L22 22L2 22L2 2Z M6 6L18 6L18 18L6 18L6 6Z'),
}

/**
 * Status Effect Icons
 */
export const StatusEffectIcons = {
  buff: createIcon('buff', 'M12 2L2 7L12 12L22 7L12 2Z'),
  debuff: createIcon('debuff', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  shield: createIcon('shield', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  poison: createIcon('poison', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  burn: createIcon('burn', 'M12 2L2 12L12 22L22 12L12 2Z'),
  freeze: createIcon('freeze', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  stun: createIcon('stun', 'M12 2L8 8L12 14L16 8L12 2Z'),
  haste: createIcon('haste', 'M12 2L2 7L12 12L22 7L12 2Z'),
  slow: createIcon('slow', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
}

/**
 * Achievement Icons
 */
export const AchievementIcons = {
  firstKill: createIcon('first_kill', 'M12 2L2 7L12 12L22 7L12 2Z'),
  level10: createIcon('level_10', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  level50: createIcon('level_50', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
  questMaster: createIcon('quest_master', 'M12 2L8 8L12 14L16 8L12 2Z'),
  dungeonMaster: createIcon('dungeon_master', 'M12 2L2 12L12 22L22 12L12 2Z'),
  collector: createIcon('collector', 'M12 2C6 2 2 6 2 12C2 18 6 22 12 22C18 22 22 18 22 12C22 6 18 2 12 2Z'),
  social: createIcon('social', 'M12 2C8 2 5 5 5 9C5 13 8 16 12 16C16 16 19 13 19 9C19 5 16 2 12 2Z'),
}

/**
 * Get enemy icon by type
 */
export function getEnemyIcon(enemyType: string): React.FC<IconProps> | null {
  const iconMap: Record<string, React.FC<IconProps>> = {
    cyber_drone: EnemyIcons.cyberDrone,
    security_bot: EnemyIcons.securityBot,
    street_thug: EnemyIcons.streetThug,
    quantum_ghost: EnemyIcons.quantumGhost,
    energy_wraith: EnemyIcons.energyWraith,
    phase_shifter: EnemyIcons.phaseShifter,
    void_walker: EnemyIcons.voidWalker,
    shadow_beast: EnemyIcons.shadowBeast,
    dark_entity: EnemyIcons.darkEntity,
    cyber_gang: EnemyIcons.cyberGang,
    hacker_drone: EnemyIcons.hackerDrone,
    street_warrior: EnemyIcons.streetWarrior,
    data_worm: EnemyIcons.dataWorm,
    code_virus: EnemyIcons.codeVirus,
    firewall_guardian: EnemyIcons.firewallGuardian,
    drone: EnemyIcons.drone,
    cyborg: EnemyIcons.cyborg,
    android: EnemyIcons.android,
  }
  
  return iconMap[enemyType] || EnemyIcons.drone
}

/**
 * Get zone icon by zone ID
 */
export function getZoneIcon(zoneId: string): React.FC<IconProps> | null {
  const iconMap: Record<string, React.FC<IconProps>> = {
    nexus_city: ZoneIcons.nexusCity,
    quantum_peak: ZoneIcons.quantumPeak,
    void_depths: ZoneIcons.voidDepths,
    neon_district: ZoneIcons.neonDistrict,
    data_stream: ZoneIcons.dataStream,
  }
  
  return iconMap[zoneId] || null
}

/**
 * Get status effect icon
 */
export function getStatusEffectIcon(effectId: string): React.FC<IconProps> | null {
  return StatusEffectIcons[effectId as keyof typeof StatusEffectIcons] || null
}

/**
 * Get achievement icon
 */
export function getAchievementIcon(achievementId: string): React.FC<IconProps> | null {
  return AchievementIcons[achievementId as keyof typeof AchievementIcons] || null
}

