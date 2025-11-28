/**
 * Expanded Sound Effects
 * Additional sound effects for enemies, zones, and game events
 */

import { soundManager } from './soundManager'

/**
 * Enemy sound effects
 */
export const EnemySounds = {
  cyberDrone: {
    spawn: 'enemy-cyber-drone-spawn',
    attack: 'enemy-cyber-drone-attack',
    hit: 'enemy-cyber-drone-hit',
    death: 'enemy-cyber-drone-death',
  },
  securityBot: {
    spawn: 'enemy-security-bot-spawn',
    attack: 'enemy-security-bot-attack',
    hit: 'enemy-security-bot-hit',
    death: 'enemy-security-bot-death',
  },
  quantumGhost: {
    spawn: 'enemy-quantum-ghost-spawn',
    attack: 'enemy-quantum-ghost-attack',
    hit: 'enemy-quantum-ghost-hit',
    death: 'enemy-quantum-ghost-death',
  },
  voidWalker: {
    spawn: 'enemy-void-walker-spawn',
    attack: 'enemy-void-walker-attack',
    hit: 'enemy-void-walker-hit',
    death: 'enemy-void-walker-death',
  },
  dataWorm: {
    spawn: 'enemy-data-worm-spawn',
    attack: 'enemy-data-worm-attack',
    hit: 'enemy-data-worm-hit',
    death: 'enemy-data-worm-death',
  },
}

/**
 * Zone ambient sounds
 */
export const ZoneAmbientSounds = {
  nexusCity: 'ambient-nexus-city',
  quantumPeak: 'ambient-quantum-peak',
  voidDepths: 'ambient-void-depths',
  neonDistrict: 'ambient-neon-district',
  dataStream: 'ambient-data-stream',
}

/**
 * UI sound effects
 */
export const UISounds = {
  modalOpen: 'ui-modal-open',
  modalClose: 'ui-modal-close',
  buttonHover: 'ui-button-hover',
  buttonClick: 'ui-button-click',
  itemEquip: 'ui-item-equip',
  itemUnequip: 'ui-item-unequip',
  notification: 'ui-notification',
  error: 'ui-error',
  success: 'ui-success',
  warning: 'ui-warning',
}

/**
 * Quest and progression sounds
 */
export const ProgressionSounds = {
  questAccepted: 'quest-accepted',
  questProgress: 'quest-progress',
  questComplete: 'quest-complete',
  levelUp: 'level-up',
  skillUnlock: 'skill-unlock',
  achievementUnlock: 'achievement-unlock',
  battlePassTier: 'battle-pass-tier',
}

/**
 * Combat sound effects
 */
export const CombatSounds = {
  criticalHit: 'combat-critical-hit',
  block: 'combat-block',
  dodge: 'combat-dodge',
  combo: 'combat-combo',
  killStreak: 'combat-kill-streak',
  lowHealth: 'combat-low-health',
}

/**
 * Environment sounds
 */
export const EnvironmentSounds = {
  portalEnter: 'env-portal-enter',
  portalExit: 'env-portal-exit',
  doorOpen: 'env-door-open',
  doorClose: 'env-door-close',
  teleporter: 'env-teleporter',
  resourceHarvest: 'env-resource-harvest',
}

/**
 * Movement sound effects (cyberpunk parkour)
 */
export const MovementSounds = {
  grappleDeploy: 'movement-grapple-deploy',
  grappleRetract: 'movement-grapple-retract',
  wallRun: 'movement-wall-run',
  landing: 'movement-landing',
  airDash: 'movement-air-dash',
  jump: 'movement-jump',
}

/**
 * Generate enemy sound
 */
function generateEnemySound(id: string, type: 'spawn' | 'attack' | 'hit' | 'death'): void {
  const soundType = type === 'spawn' ? 'spell' :
                   type === 'attack' ? 'spell' :
                   type === 'hit' ? 'hit' :
                   'explosion'
  
  soundManager.generateSound(id, soundType)
}

/**
 * Generate UI sound
 */
function generateUISound(id: string, type: 'click' | 'hover' | 'open' | 'close'): void {
  const soundType = type === 'click' || type === 'hover' ? 'ui' :
                   type === 'open' ? 'pickup' :
                   'ui'
  
  soundManager.generateSound(id, soundType)
}

/**
 * Preload all expanded sounds
 */
export function preloadExpandedSounds(): void {
  // Enemy sounds
  Object.values(EnemySounds).forEach(enemy => {
    generateEnemySound(enemy.spawn, 'spawn')
    generateEnemySound(enemy.attack, 'attack')
    generateEnemySound(enemy.hit, 'hit')
    generateEnemySound(enemy.death, 'death')
  })

  // UI sounds
  generateUISound(UISounds.modalOpen, 'open')
  generateUISound(UISounds.modalClose, 'close')
  generateUISound(UISounds.buttonHover, 'hover')
  generateUISound(UISounds.buttonClick, 'click')
  generateUISound(UISounds.itemEquip, 'click')
  generateUISound(UISounds.itemUnequip, 'click')
  generateUISound(UISounds.notification, 'open')
  generateUISound(UISounds.error, 'close')
  generateUISound(UISounds.success, 'open')
  generateUISound(UISounds.warning, 'close')

  // Progression sounds
  soundManager.generateSound(ProgressionSounds.questAccepted, 'ui')
  soundManager.generateSound(ProgressionSounds.questProgress, 'ui')
  soundManager.generateSound(ProgressionSounds.questComplete, 'ui')
  soundManager.generateSound(ProgressionSounds.levelUp, 'ui')
  soundManager.generateSound(ProgressionSounds.skillUnlock, 'ui')
  soundManager.generateSound(ProgressionSounds.achievementUnlock, 'ui')
  soundManager.generateSound(ProgressionSounds.battlePassTier, 'ui')

  // Combat sounds
  soundManager.generateSound(CombatSounds.criticalHit, 'explosion')
  soundManager.generateSound(CombatSounds.block, 'hit')
  soundManager.generateSound(CombatSounds.dodge, 'spell')
  soundManager.generateSound(CombatSounds.combo, 'ui')
  soundManager.generateSound(CombatSounds.killStreak, 'explosion')
  soundManager.generateSound(CombatSounds.lowHealth, 'hit')

  // Environment sounds
  soundManager.generateSound(EnvironmentSounds.portalEnter, 'spell')
  soundManager.generateSound(EnvironmentSounds.portalExit, 'spell')
  soundManager.generateSound(EnvironmentSounds.doorOpen, 'ui')
  soundManager.generateSound(EnvironmentSounds.doorClose, 'ui')
  soundManager.generateSound(EnvironmentSounds.teleporter, 'spell')
  soundManager.generateSound(EnvironmentSounds.resourceHarvest, 'ui')

  // Movement sounds (cyberpunk parkour)
  soundManager.generateSound(MovementSounds.grappleDeploy, 'spell') // Whoosh sound
  soundManager.generateSound(MovementSounds.grappleRetract, 'spell')
  soundManager.generateSound(MovementSounds.wallRun, 'hit') // Friction sound
  soundManager.generateSound(MovementSounds.landing, 'hit') // Impact sound
  soundManager.generateSound(MovementSounds.airDash, 'spell') // Quick whoosh
  soundManager.generateSound(MovementSounds.jump, 'ui') // Quick beep
}

/**
 * Play enemy sound
 */
export function playEnemySound(enemyType: string, action: 'spawn' | 'attack' | 'hit' | 'death'): void {
  const enemy = EnemySounds[enemyType as keyof typeof EnemySounds]
  if (enemy) {
    soundManager.playSound(enemy[action], 0.7)
  }
}

/**
 * Play zone ambient sound
 */
export function playZoneAmbient(zoneId: string, loop: boolean = true): void {
  const soundId = ZoneAmbientSounds[zoneId as keyof typeof ZoneAmbientSounds]
  if (soundId) {
    soundManager.playMusic(soundId, loop)
  }
}

/**
 * Play UI sound
 */
export function playUISound(soundId: keyof typeof UISounds, volume: number = 0.6): void {
  soundManager.playSound(UISounds[soundId], volume)
}

/**
 * Play progression sound
 */
export function playProgressionSound(soundId: keyof typeof ProgressionSounds, volume: number = 0.8): void {
  soundManager.playSound(ProgressionSounds[soundId], volume)
}

/**
 * Play combat sound
 */
export function playCombatSound(soundId: keyof typeof CombatSounds, volume: number = 0.7): void {
  soundManager.playSound(CombatSounds[soundId], volume)
}

/**
 * Play environment sound
 */
export function playEnvironmentSound(soundId: keyof typeof EnvironmentSounds, volume: number = 0.6): void {
  soundManager.playSound(EnvironmentSounds[soundId], volume)
}

/**
 * Play movement sound
 */
export function playMovementSound(soundId: keyof typeof MovementSounds, volume: number = 0.7): void {
  soundManager.playSound(MovementSounds[soundId], volume)
}

