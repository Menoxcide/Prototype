/**
 * IndexedDB Asset Cache
 * Provides persistent caching for models and textures in IndexedDB
 * Enables near-instant reloads after first visit
 */

import * as THREE from 'three'

const DB_NAME = 'mars-nexus-assets'
const DB_VERSION = 1
const STORE_MODELS = 'models'
const STORE_TEXTURES = 'textures'
const STORE_METADATA = 'metadata'

interface CachedAsset {
  data: ArrayBuffer
  timestamp: number
  version: string
}

class AssetCache {
  private db: IDBDatabase | null = null
  private initPromise: Promise<IDBDatabase> | null = null
  private cacheVersion = '1.0.0'

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.warn('Failed to open IndexedDB:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains(STORE_MODELS)) {
          db.createObjectStore(STORE_MODELS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_TEXTURES)) {
          db.createObjectStore(STORE_TEXTURES, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_METADATA)) {
          db.createObjectStore(STORE_METADATA, { keyPath: 'key' })
        }
      }
    })

    return this.initPromise
  }

  /**
   * Cache a model (GLB/GLTF) in IndexedDB
   */
  async cacheModel(id: string, data: ArrayBuffer): Promise<void> {
    try {
      const db = await this.init()
      const transaction = db.transaction([STORE_MODELS], 'readwrite')
      const store = transaction.objectStore(STORE_MODELS)

      const cached: CachedAsset = {
        data,
        timestamp: Date.now(),
        version: this.cacheVersion
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put({ id, ...cached })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn(`Failed to cache model ${id}:`, error)
    }
  }

  /**
   * Get a cached model from IndexedDB
   */
  async getCachedModel(id: string): Promise<ArrayBuffer | null> {
    try {
      const db = await this.init()
      const transaction = db.transaction([STORE_MODELS], 'readonly')
      const store = transaction.objectStore(STORE_MODELS)

      return new Promise<ArrayBuffer | null>((resolve, reject) => {
        const request = store.get(id)
        request.onsuccess = () => {
          const result = request.result as (CachedAsset & { id: string }) | undefined
          if (result && result.version === this.cacheVersion) {
            // Check if cache is still valid (7 days)
            const age = Date.now() - result.timestamp
            if (age < 7 * 24 * 60 * 60 * 1000) {
              resolve(result.data)
            } else {
              // Cache expired, remove it
              this.removeCachedModel(id)
              resolve(null)
            }
          } else {
            resolve(null)
          }
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn(`Failed to get cached model ${id}:`, error)
      return null
    }
  }

  /**
   * Remove a cached model
   */
  async removeCachedModel(id: string): Promise<void> {
    try {
      const db = await this.init()
      const transaction = db.transaction([STORE_MODELS], 'readwrite')
      const store = transaction.objectStore(STORE_MODELS)
      store.delete(id)
    } catch (error) {
      console.warn(`Failed to remove cached model ${id}:`, error)
    }
  }

  /**
   * Cache a texture in IndexedDB
   */
  async cacheTexture(id: string, texture: THREE.Texture): Promise<void> {
    try {
      // Convert texture to ArrayBuffer for storage
      const canvas = document.createElement('canvas')
      const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap
      
      if (!image || !('width' in image) || !('height' in image)) {
        return
      }

      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof ImageBitmap) {
        ctx.drawImage(image, 0, 0)
      }

      // Convert to blob then ArrayBuffer
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Failed to convert texture to blob'))
        }, 'image/webp', 0.9)
      })

      const arrayBuffer = await blob.arrayBuffer()

      const db = await this.init()
      const transaction = db.transaction([STORE_TEXTURES], 'readwrite')
      const store = transaction.objectStore(STORE_TEXTURES)

      const cached: CachedAsset = {
        data: arrayBuffer,
        timestamp: Date.now(),
        version: this.cacheVersion
      }

      await new Promise<void>((resolve, reject) => {
        const request = store.put({ id, ...cached })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn(`Failed to cache texture ${id}:`, error)
    }
  }

  /**
   * Get a cached texture from IndexedDB
   */
  async getCachedTexture(id: string): Promise<THREE.Texture | null> {
    try {
      const db = await this.init()
      const transaction = db.transaction([STORE_TEXTURES], 'readonly')
      const store = transaction.objectStore(STORE_TEXTURES)

      const result = await new Promise<(CachedAsset & { id: string }) | undefined>((resolve, reject) => {
        const request = store.get(id)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (!result || result.version !== this.cacheVersion) {
        return null
      }

      // Check if cache is still valid (7 days)
      const age = Date.now() - result.timestamp
      if (age >= 7 * 24 * 60 * 60 * 1000) {
        this.removeCachedTexture(id)
        return null
      }

      // Convert ArrayBuffer back to texture
      const blob = new Blob([result.data], { type: 'image/webp' })
      const url = URL.createObjectURL(blob)

      return new Promise<THREE.Texture | null>((resolve, reject) => {
        const loader = new THREE.TextureLoader()
        loader.load(
          url,
          (texture) => {
            URL.revokeObjectURL(url)
            texture.flipY = false
            texture.generateMipmaps = true
            texture.minFilter = THREE.LinearMipmapLinearFilter
            texture.magFilter = THREE.LinearFilter
            resolve(texture)
          },
          undefined,
          (error) => {
            URL.revokeObjectURL(url)
            reject(error)
          }
        )
      })
    } catch (error) {
      console.warn(`Failed to get cached texture ${id}:`, error)
      return null
    }
  }

  /**
   * Remove a cached texture
   */
  async removeCachedTexture(id: string): Promise<void> {
    try {
      const db = await this.init()
      const transaction = db.transaction([STORE_TEXTURES], 'readwrite')
      const store = transaction.objectStore(STORE_TEXTURES)
      store.delete(id)
    } catch (error) {
      console.warn(`Failed to remove cached texture ${id}:`, error)
    }
  }

  /**
   * Clear all cached assets
   */
  async clearCache(): Promise<void> {
    try {
      const db = await this.init()
      const transaction = db.transaction([STORE_MODELS, STORE_TEXTURES], 'readwrite')
      transaction.objectStore(STORE_MODELS).clear()
      transaction.objectStore(STORE_TEXTURES).clear()
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ models: number; textures: number; totalSize: number }> {
    try {
      const db = await this.init()
      const modelStore = db.transaction([STORE_MODELS], 'readonly').objectStore(STORE_MODELS)
      const textureStore = db.transaction([STORE_TEXTURES], 'readonly').objectStore(STORE_TEXTURES)

      const modelCount = await new Promise<number>((resolve) => {
        const request = modelStore.count()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(0)
      })

      const textureCount = await new Promise<number>((resolve) => {
        const request = textureStore.count()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(0)
      })

      // Estimate total size (rough calculation)
      let totalSize = 0
      const modelRequest = modelStore.openCursor()
      modelRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          totalSize += (cursor.value.data as ArrayBuffer).byteLength
          cursor.continue()
        }
      }

      const textureRequest = textureStore.openCursor()
      textureRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          totalSize += (cursor.value.data as ArrayBuffer).byteLength
          cursor.continue()
        }
      }

      return {
        models: modelCount,
        textures: textureCount,
        totalSize
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error)
      return { models: 0, textures: 0, totalSize: 0 }
    }
  }
}

// Singleton instance
export const assetCache = new AssetCache()

