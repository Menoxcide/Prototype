/**
 * Crafting Queue System - Manages multiple crafting jobs
 */

import { CraftingQueueItem, CraftingQuality } from '../../../shared/src/types/crafting'
import { Recipe } from '../types'

export interface CraftingQueueManager {
  addToQueue(recipe: Recipe, quality: CraftingQuality | null): string
  removeFromQueue(queueId: string): boolean
  getQueue(): CraftingQueueItem[]
  updateQueue(deltaTime: number): CraftingQueueItem[]
  clearQueue(): void
  getQueueSize(): number
  getMaxQueueSize(): number
}

class CraftingQueueManagerImpl implements CraftingQueueManager {
  private queue: Map<string, CraftingQueueItem> = new Map()
  private maxSize: number = 10
  private currentCrafting: CraftingQueueItem | null = null

  addToQueue(recipe: Recipe, quality: CraftingQuality | null = null): string {
    if (this.queue.size >= this.maxSize) {
      throw new Error('Crafting queue is full')
    }

    const queueId = `craft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const queueItem: CraftingQueueItem = {
      id: queueId,
      recipeId: recipe.id,
      quality,
      startTime: Date.now(),
      duration: recipe.craftingTime,
      status: 'queued'
    }

    this.queue.set(queueId, queueItem)
    return queueId
  }

  removeFromQueue(queueId: string): boolean {
    const item = this.queue.get(queueId)
    if (!item || item.status === 'crafting') {
      return false
    }

    this.queue.delete(queueId)
    return true
  }

  getQueue(): CraftingQueueItem[] {
    return Array.from(this.queue.values())
  }

  updateQueue(_deltaTime: number): CraftingQueueItem[] {
    const completed: CraftingQueueItem[] = []

    // Process current crafting item
    if (this.currentCrafting) {
      const elapsed = Date.now() - this.currentCrafting.startTime
      if (elapsed >= this.currentCrafting.duration) {
        this.currentCrafting.status = 'completed'
        completed.push(this.currentCrafting)
        this.currentCrafting = null
      }
    }

    // Start next item if queue is empty and nothing is crafting
    if (!this.currentCrafting) {
      const nextItem = Array.from(this.queue.values())
        .find(item => item.status === 'queued')
      
      if (nextItem) {
        nextItem.status = 'crafting'
        nextItem.startTime = Date.now()
        this.currentCrafting = nextItem
      }
    }

    return completed
  }

  clearQueue(): void {
    // Only clear queued items, not currently crafting
    for (const [id, item] of this.queue.entries()) {
      if (item.status === 'queued') {
        this.queue.delete(id)
      }
    }
  }

  getQueueSize(): number {
    return this.queue.size
  }

  getMaxQueueSize(): number {
    return this.maxSize
  }

  setMaxQueueSize(size: number): void {
    this.maxSize = Math.max(1, Math.min(20, size))
  }
}

export const craftingQueueManager = new CraftingQueueManagerImpl()

