/**
 * Mobile App State Persistence
 * Saves game state when app is minimized or backgrounded
 */

import { useGameStore } from '../store/useGameStore'

class MobilePersistence {
  private saveInterval: NodeJS.Timeout | null = null
  private lastSaveTime: number = 0
  private saveThrottle: number = 5000 // Save at most every 5 seconds

  /**
   * Initialize mobile persistence
   */
  init(): void {
    // Save on visibility change (app minimized/backgrounded)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveGameState()
      }
    })

    // Save on page unload
    window.addEventListener('beforeunload', () => {
      this.saveGameState()
    })

    // Periodic auto-save
    this.saveInterval = setInterval(() => {
      this.saveGameState()
    }, 30000) // Every 30 seconds

    // Load saved state on init
    this.loadGameState()
  }

  /**
   * Save game state to localStorage
   */
  private saveGameState(): void {
    const now = Date.now()
    if (now - this.lastSaveTime < this.saveThrottle) return

    try {
      const state = useGameStore.getState()
      const saveData = {
        player: state.player,
        inventory: state.inventory,
        credits: state.player?.credits || 0,
        xp: state.player?.xp || 0,
        level: state.player?.level || 1,
        timestamp: now
      }

      localStorage.setItem('gameState', JSON.stringify(saveData))
      this.lastSaveTime = now
    } catch (error) {
      console.error('Failed to save game state:', error)
    }
  }

  /**
   * Load game state from localStorage
   */
  private loadGameState(): void {
    try {
      const saved = localStorage.getItem('gameState')
      if (!saved) return

      const saveData = JSON.parse(saved)
      const state = useGameStore.getState()

      // Only load if save is recent (within 24 hours)
      const age = Date.now() - saveData.timestamp
      if (age > 86400000) return // 24 hours

      // Restore player data if available
      if (saveData.player && state.player) {
        state.setPlayer({
          ...state.player,
          ...saveData.player,
          credits: saveData.credits || state.player.credits,
          xp: saveData.xp || state.player.xp,
          level: saveData.level || state.player.level
        })
      }

      // Restore inventory
      if (saveData.inventory) {
        saveData.inventory.forEach((item: any) => {
          state.addItem(item.item.id, item.quantity)
        })
      }
    } catch (error) {
      console.error('Failed to load game state:', error)
    }
  }

  /**
   * Clear saved state
   */
  clearSavedState(): void {
    localStorage.removeItem('gameState')
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }
    this.saveGameState() // Final save
  }
}

export const mobilePersistence = new MobilePersistence()

