/**
 * Batch Save Service
 * Batches player data saves into single transactions to reduce database round-trips
 */

import { DatabaseService, PlayerData } from './DatabaseService'

interface PendingSave {
  playerId: string
  data: Partial<PlayerData>
  timestamp: number
}

export class BatchSaveService {
  private pendingSaves: Map<string, PendingSave> = new Map()
  private saveInterval: NodeJS.Timeout | null = null
  private batchSize: number
  private saveIntervalMs: number
  private db: DatabaseService

  constructor(db: DatabaseService, options: { batchSize?: number; saveIntervalMs?: number } = {}) {
    this.db = db
    // Optimized batch size: 50-100 operations per batch (increased from 10)
    this.batchSize = options.batchSize || 75
    this.saveIntervalMs = options.saveIntervalMs || 5000 // 5 seconds

    // Start periodic batch saves
    this.startBatchSaves()
  }

  /**
   * Queue a player save (will be batched)
   */
  queueSave(playerId: string, data: Partial<PlayerData>): void {
    // Merge with existing pending save if any
    const existing = this.pendingSaves.get(playerId)
    if (existing) {
      // Merge data (newer data takes precedence)
      this.pendingSaves.set(playerId, {
        playerId,
        data: { ...existing.data, ...data },
        timestamp: Date.now()
      })
    } else {
      this.pendingSaves.set(playerId, {
        playerId,
        data,
        timestamp: Date.now()
      })
    }
  }

  /**
   * Force immediate save for a player
   */
  async saveImmediate(playerId: string, data: Partial<PlayerData>): Promise<void> {
    // Remove from pending saves
    this.pendingSaves.delete(playerId)

    // Save immediately
    await this.db.savePlayerData(playerId, data as PlayerData)
  }

  /**
   * Process batch saves
   */
  private async processBatch(): Promise<void> {
    if (this.pendingSaves.size === 0) return

    const saves = Array.from(this.pendingSaves.values())
    this.pendingSaves.clear()

    // Process in batches
    for (let i = 0; i < saves.length; i += this.batchSize) {
      const batch = saves.slice(i, i + this.batchSize)

      try {
        // Use transaction for atomic batch save
        await this.db.transaction(async (tx) => {
          for (const save of batch) {
            // Load existing data first
            const existing = await this.db.loadPlayerData(save.playerId)
            const mergedData: PlayerData = {
              ...existing,
              ...save.data,
              id: save.playerId,
              updatedAt: new Date()
            } as PlayerData

            // Save in transaction
            await this.db.savePlayerData(save.playerId, mergedData)
          }
        })
      } catch (error) {
        console.error('Batch save failed:', error)
        // Re-queue failed saves
        batch.forEach(save => {
          this.pendingSaves.set(save.playerId, save)
        })
      }
    }
  }

  /**
   * Start periodic batch saves
   */
  private startBatchSaves(): void {
    this.saveInterval = setInterval(() => {
      this.processBatch().catch(error => {
        console.error('Error processing batch saves:', error)
      })
    }, this.saveIntervalMs)
  }

  /**
   * Stop batch saves and process remaining
   */
  async stop(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }

    // Process remaining saves
    await this.processBatch()
  }

  /**
   * Get pending save count
   */
  getPendingCount(): number {
    return this.pendingSaves.size
  }
}

