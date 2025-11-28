/**
 * NPC System - Handles NPC interactions, dialogue, quests, shops, and services
 */

import { getNPC } from '../data/npcs'
import { useGameStore } from '../store/useGameStore'

/**
 * Start interaction with an NPC
 */
export function startNPCInteraction(npcId: string): void {
  const npc = getNPC(npcId)
  if (!npc) {
    console.warn(`NPC not found: ${npcId}`)
    return
  }

  const { setInteractingWithNPC, toggleQuest, toggleMarket, toggleCrafting } = useGameStore.getState()

  setInteractingWithNPC(npcId)

  // Handle different NPC types
  switch (npc.type) {
    case 'quest_giver':
      // Open quest modal if NPC has quests
      if (npc.quests && npc.quests.length > 0) {
        toggleQuest()
      }
      break

    case 'merchant':
    case 'pet_shop':
      // Open market/shop modal
      if (npc.shopItems && npc.shopItems.length > 0) {
        toggleMarket()
      }
      break

    case 'crafting':
      // Open crafting modal
      toggleCrafting()
      break

    case 'guard':
    case 'story':
      // Just show dialogue
      break

    case 'fishing':
    case 'mining':
      // Show service options
      break
  }
}

/**
 * End interaction with NPC
 */
export function endNPCInteraction(): void {
  const { setInteractingWithNPC } = useGameStore.getState()
  setInteractingWithNPC(null)
}

/**
 * Get current dialogue for NPC
 */
export function getNPCDialogue(npcId: string, dialogueIndex: number = 0): string {
  const npc = getNPC(npcId)
  if (!npc || !npc.dialogue || npc.dialogue.length === 0) {
    return 'Hello!'
  }

  const index = Math.min(dialogueIndex, npc.dialogue.length - 1)
  return npc.dialogue[index]
}

/**
 * Get greeting for NPC
 */
export function getNPCGreeting(npcId: string): string {
  const npc = getNPC(npcId)
  return npc?.greeting || 'Hello!'
}

/**
 * Get farewell for NPC
 */
export function getNPCFarewell(npcId: string): string {
  const npc = getNPC(npcId)
  return npc?.farewell || 'Goodbye!'
}

/**
 * Use NPC service (heal, repair, teleport, etc.)
 */
export function useNPCService(npcId: string, service: string): void {
  const npc = getNPC(npcId)
  if (!npc || !npc.services || !npc.services.includes(service)) {
    console.warn(`Service ${service} not available from NPC ${npcId}`)
    return
  }

  const { player, updatePlayerHealth, updatePlayerMana } = useGameStore.getState()
  if (!player) return

  switch (service) {
    case 'heal':
      // Restore full health
      updatePlayerHealth(player.maxHealth)
      break

    case 'repair':
      // Restore full mana (as repair)
      updatePlayerMana(player.maxMana)
      break

    case 'teleport':
      // TODO: Implement teleportation
      console.log('Teleportation not yet implemented')
      break

    case 'enchant':
      // TODO: Implement enchanting
      console.log('Enchanting not yet implemented')
      break

    default:
      console.warn(`Unknown service: ${service}`)
  }
}

/**
 * Check if player can interact with NPC
 */
export function canInteractWithNPC(npcId: string): boolean {
  const { player } = useGameStore.getState()
  if (!player) return false

  const npc = getNPC(npcId)
  if (!npc) return false

  const distance = Math.sqrt(
    Math.pow(player.position.x - npc.position.x, 2) +
    Math.pow(player.position.y - npc.position.y, 2) +
    Math.pow(player.position.z - npc.position.z, 2)
  )

  return distance < 3
}

/**
 * Get available quests from NPC
 */
export function getNPCQuests(npcId: string): string[] {
  const npc = getNPC(npcId)
  return npc?.quests || []
}

/**
 * Get shop items from NPC
 */
export function getNPCShopItems(npcId: string): Array<{ itemId: string; price: number; stock?: number }> {
  const npc = getNPC(npcId)
  return npc?.shopItems || []
}

/**
 * Get available services from NPC
 */
export function getNPCServices(npcId: string): string[] {
  const npc = getNPC(npcId)
  return npc?.services || []
}

