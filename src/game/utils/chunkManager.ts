/**
 * Spatial Chunk Manager
 * Manages loading and unloading of spatial chunks based on player position
 * Implements spatial chunking for performance optimization
 */

import * as THREE from 'three'
import { progressiveLoader } from './progressiveLoader'
import type { RoadSegment } from './roadGenerator'

export interface Chunk {
  x: number
  z: number
  buildings: Building[]
  roads: RoadSegment[]
  loaded: boolean
  assets: string[] // Asset IDs for this chunk
  loading: boolean
}

export interface Building {
  id: string
  type: BuildingType
  position: THREE.Vector3
  rotation: number
  width: number
  depth: number
  height: number
  config: any
}

export enum BuildingType {
  SKYSCRAPER = 'skyscraper',
  MID_SIZE = 'mid_size',
  HOTEL = 'hotel',
  RETAIL = 'retail',
  RESIDENTIAL = 'residential'
}

export interface ChunkLoadingProgress {
  totalChunks: number
  loadedChunks: number
  loadingChunks: number
  percentage: number
  currentChunk?: { x: number; z: number }
}

class ChunkManager {
  private chunks: Map<string, Chunk> = new Map()
  private chunkSize: number = 100 // 100x100 unit chunks
  private viewDistance: number = 200 // Load chunks within 200 units
  private loadedChunkKeys: Set<string> = new Set()
  private loadingChunkKeys: Set<string> = new Set()
  private progressCallbacks: Set<(progress: ChunkLoadingProgress) => void> = new Set()
  private lastPlayerPosition: THREE.Vector3 | null = null
  private updateInterval: number | null = null

  /**
   * Get chunk key from coordinates
   */
  getChunkKey(x: number, z: number): string {
    const chunkX = Math.floor(x / this.chunkSize)
    const chunkZ = Math.floor(z / this.chunkSize)
    return `${chunkX},${chunkZ}`
  }

  /**
   * Get chunk coordinates from world position
   */
  private getChunkCoords(x: number, z: number): { chunkX: number; chunkZ: number } {
    return {
      chunkX: Math.floor(x / this.chunkSize),
      chunkZ: Math.floor(z / this.chunkSize)
    }
  }

  /**
   * Get world position from chunk coordinates
   */
  private getChunkWorldPos(chunkX: number, chunkZ: number): { x: number; z: number } {
    return {
      x: chunkX * this.chunkSize + this.chunkSize / 2,
      z: chunkZ * this.chunkSize + this.chunkSize / 2
    }
  }

  /**
   * Get all chunk keys within view distance of a position
   */
  private getChunksInRange(x: number, z: number): string[] {
    const chunks: string[] = []
    const { chunkX, chunkZ } = this.getChunkCoords(x, z)
    const range = Math.ceil(this.viewDistance / this.chunkSize)

    for (let dx = -range; dx <= range; dx++) {
      for (let dz = -range; dz <= range; dz++) {
        const key = `${chunkX + dx},${chunkZ + dz}`
        const worldPos = this.getChunkWorldPos(chunkX + dx, chunkZ + dz)
        const distance = Math.sqrt(
          (worldPos.x - x) ** 2 + (worldPos.z - z) ** 2
        )
        
        if (distance <= this.viewDistance) {
          chunks.push(key)
        }
      }
    }

    return chunks
  }

  /**
   * Create an empty chunk
   */
  private createChunk(chunkX: number, chunkZ: number): Chunk {
    return {
      x: chunkX,
      z: chunkZ,
      buildings: [],
      roads: [],
      loaded: false,
      assets: [],
      loading: false
    }
  }

  /**
   * Load a chunk (async, can be called multiple times safely)
   */
  async loadChunk(chunkX: number, chunkZ: number, generateContent: (chunk: Chunk) => Promise<void>): Promise<Chunk> {
    const key = `${chunkX},${chunkZ}`
    
    // If already loaded, return it
    if (this.chunks.has(key) && this.chunks.get(key)!.loaded) {
      return this.chunks.get(key)!
    }

    // If already loading, wait for it
    if (this.loadingChunkKeys.has(key)) {
      // Wait for loading to complete
      while (this.loadingChunkKeys.has(key)) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return this.chunks.get(key)!
    }

    // Mark as loading
    this.loadingChunkKeys.add(key)
    
    // Get or create chunk
    let chunk = this.chunks.get(key)
    if (!chunk) {
      chunk = this.createChunk(chunkX, chunkZ)
      this.chunks.set(key, chunk)
    }

    chunk.loading = true
    this.notifyProgress()

    try {
      // Generate chunk content (buildings, roads, etc.)
      await generateContent(chunk)

      // Mark chunk assets for loading
      for (const assetId of chunk.assets) {
        progressiveLoader.addAsset({
          id: `chunk-${key}-${assetId}`,
          type: 'texture',
          priority: 5,
          critical: false,
          phase: 'phase2'
        })
      }

      chunk.loaded = true
      chunk.loading = false
      this.loadedChunkKeys.add(key)
      this.notifyProgress()
    } catch (error) {
      console.error(`Failed to load chunk ${key}:`, error)
      chunk.loading = false
    } finally {
      this.loadingChunkKeys.delete(key)
    }

    return chunk
  }

  /**
   * Unload a chunk
   */
  unloadChunk(chunkX: number, chunkZ: number): void {
    const chunkKey = `${chunkX},${chunkZ}`
    const chunk = this.chunks.get(chunkKey)
    
    if (chunk) {
      // Unload assets (mark as unloaded by removing from cache)
      // Assets will be cleaned up by asset manager
      
      chunk.loaded = false
      chunk.buildings = []
      chunk.roads = []
      chunk.assets = []
      this.loadedChunkKeys.delete(chunkKey)
      this.notifyProgress()
    }
  }

  /**
   * Update chunks based on player position
   */
  async updateChunks(
    playerPosition: THREE.Vector3,
    generateContent: (chunk: Chunk) => Promise<void>
  ): Promise<void> {
    // Only update if player moved significantly
    if (this.lastPlayerPosition) {
      const distance = playerPosition.distanceTo(this.lastPlayerPosition)
      if (distance < 10) {
        return // Player hasn't moved much, skip update
      }
    }

    this.lastPlayerPosition = playerPosition.clone()

    // Get chunks that should be loaded
    const chunksToLoad = this.getChunksInRange(playerPosition.x, playerPosition.z)
    
    // Get currently loaded chunks
    const currentlyLoaded = Array.from(this.loadedChunkKeys)
    
    // Find chunks to unload (loaded but not in range)
    const chunksToUnload = currentlyLoaded.filter(key => !chunksToLoad.includes(key))
    
    // Find chunks to load (in range but not loaded)
    const chunksToLoadNow = chunksToLoad.filter(key => !this.loadedChunkKeys.has(key) && !this.loadingChunkKeys.has(key))

    // Unload chunks that are too far
    for (const key of chunksToUnload) {
      const [chunkX, chunkZ] = key.split(',').map(Number)
      this.unloadChunk(chunkX, chunkZ)
    }

    // Load new chunks (in batches to avoid blocking)
    const loadPromises: Promise<Chunk>[] = []
    for (const key of chunksToLoadNow.slice(0, 3)) { // Load 3 chunks at a time
      const [chunkX, chunkZ] = key.split(',').map(Number)
      loadPromises.push(this.loadChunk(chunkX, chunkZ, generateContent))
    }

    await Promise.all(loadPromises)

    // Continue loading remaining chunks in background
    if (chunksToLoadNow.length > 3) {
      setTimeout(() => {
        for (const key of chunksToLoadNow.slice(3)) {
          const [chunkX, chunkZ] = key.split(',').map(Number)
          this.loadChunk(chunkX, chunkZ, generateContent).catch(err => {
            console.error(`Failed to load chunk ${key}:`, err)
          })
        }
      }, 100)
    }
  }

  /**
   * Get all loaded chunks
   */
  getLoadedChunks(): Chunk[] {
    return Array.from(this.chunks.values()).filter(chunk => chunk.loaded)
  }

  /**
   * Get chunk at specific coordinates
   */
  getChunk(chunkX: number, chunkZ: number): Chunk | null {
    const key = `${chunkX},${chunkZ}`
    return this.chunks.get(key) || null
  }

  /**
   * Check if chunk is loaded
   */
  isChunkLoaded(chunkX: number, chunkZ: number): boolean {
    const key = `${chunkX},${chunkZ}`
    return this.loadedChunkKeys.has(key)
  }

  /**
   * Subscribe to loading progress updates
   */
  subscribe(callback: (progress: ChunkLoadingProgress) => void): () => void {
    this.progressCallbacks.add(callback)
    callback(this.getProgress())
    return () => {
      this.progressCallbacks.delete(callback)
    }
  }

  /**
   * Notify progress callbacks
   */
  private notifyProgress(): void {
    const progress = this.getProgress()
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress)
      } catch (error) {
        console.error('Error in chunk progress callback:', error)
      }
    })
  }

  /**
   * Get loading progress
   */
  getProgress(): ChunkLoadingProgress {
    const totalChunks = this.chunks.size
    const loadedChunks = this.loadedChunkKeys.size
    const loadingChunks = this.loadingChunkKeys.size
    
    // Get a currently loading chunk for display
    let currentChunk: { x: number; z: number } | undefined
    if (this.loadingChunkKeys.size > 0) {
      const firstKey = Array.from(this.loadingChunkKeys)[0]
      const [chunkX, chunkZ] = firstKey.split(',').map(Number)
      currentChunk = { x: chunkX, z: chunkZ }
    }

    return {
      totalChunks,
      loadedChunks,
      loadingChunks,
      percentage: totalChunks > 0 ? (loadedChunks / totalChunks) * 100 : 0,
      currentChunk
    }
  }

  /**
   * Start automatic chunk updates
   */
  startAutoUpdate(
    getPlayerPosition: () => THREE.Vector3 | null,
    generateContent: (chunk: Chunk) => Promise<void>
  ): void {
    if (this.updateInterval !== null) {
      return // Already started
    }

    this.updateInterval = window.setInterval(() => {
      const playerPos = getPlayerPosition()
      if (playerPos) {
        this.updateChunks(playerPos, generateContent).catch(err => {
          console.error('Error updating chunks:', err)
        })
      }
    }, 1000) // Update every second
  }

  /**
   * Stop automatic chunk updates
   */
  stopAutoUpdate(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  /**
   * Reset chunk manager
   */
  reset(): void {
    this.stopAutoUpdate()
    this.chunks.clear()
    this.loadedChunkKeys.clear()
    this.loadingChunkKeys.clear()
    this.lastPlayerPosition = null
  }

  /**
   * Get chunk size
   */
  getChunkSize(): number {
    return this.chunkSize
  }

  /**
   * Get view distance
   */
  getViewDistance(): number {
    return this.viewDistance
  }
}

// Singleton instance
export const chunkManager = new ChunkManager()

