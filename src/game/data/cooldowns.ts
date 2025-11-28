/**
 * Standard Cooldown Values
 * Defines cooldown durations for all game actions in seconds
 */

export const COOLDOWN_JUMP = 0.3 // Slightly increased from 0.2
export const COOLDOWN_GRAPPLE = 1.5 // New cooldown for grapple
export const COOLDOWN_NPC_INTERACT = 0.5 // Prevent spam clicking NPCs
export const COOLDOWN_ITEM_USE = 0.5 // For consumable items
export const COOLDOWN_DODGE = 1.0 // Standardize existing dodge cooldown
export const COOLDOWN_PORTAL = 2.5 // Standardize existing portal cooldown

// Spell cooldowns are defined in spell data (spells.ts)
// Use spell.cooldown values directly (already in seconds)

