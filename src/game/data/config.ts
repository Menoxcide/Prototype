import { GameConfig } from '../types'

export const GAME_CONFIG: GameConfig = {
  playerSpeed: 5.0,
  spellCastRange: 20,
  enemySpawnRate: 5000, // milliseconds
  resourceRespawnTime: 30000, // 30 seconds
  lootExpireTime: 60000, // 60 seconds
  maxPlayersPerZone: 1000,
  worldBossSpawnInterval: 14400000 // 4 hours in milliseconds
}

// Mobile performance settings
export const MOBILE_CONFIG = {
  maxParticles: 50,
  enableShadows: false,
  shadowQuality: 'low' as const,
  renderDistance: 50,
  targetFPS: 30 // Default to 30 FPS, can be adjusted based on device capabilities
}

// Desktop performance settings
export const DESKTOP_CONFIG = {
  maxParticles: 200,
  enableShadows: true,
  shadowQuality: 'high' as const,
  renderDistance: 100,
  targetFPS: 60
}

// Detect if running on mobile
export function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768
}

// Get appropriate config based on device
export function getPerformanceConfig() {
  return isMobile() ? MOBILE_CONFIG : DESKTOP_CONFIG
}

