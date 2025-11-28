/**
 * Asset Manifest System
 * Loads and manages the asset manifest to eliminate individual HEAD requests
 */

export interface AssetManifest {
  version: string
  generated: string
  models: Record<string, {
    path: string
    size: number
    modified: string
    compressed?: boolean
  }>
  textures: Record<string, {
    path: string
    size: number
    modified: string
    compressed?: boolean
  }>
  compressed: {
    models: Record<string, {
      path: string
      size: number
      modified: string
    }>
    textures: Record<string, {
      path: string
      size: number
      modified: string
    }>
  }
}

class AssetManifestManager {
  private manifest: AssetManifest | null = null
  private loadingPromise: Promise<AssetManifest> | null = null

  /**
   * Load the asset manifest
   */
  async loadManifest(): Promise<AssetManifest> {
    if (this.manifest) {
      return this.manifest
    }

    if (this.loadingPromise) {
      return this.loadingPromise
    }

    this.loadingPromise = fetch('/assets/models/ASSET_MANIFEST.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load manifest: ${response.status}`)
        }
        return response.json()
      })
      .then(manifest => {
        this.manifest = manifest as AssetManifest
        return this.manifest
      })
      .catch(error => {
        console.warn('Failed to load asset manifest, falling back to individual checks:', error)
        // Return empty manifest as fallback
        this.manifest = {
          version: '1.0.0',
          generated: new Date().toISOString(),
          models: {},
          textures: {},
          compressed: { models: {}, textures: {} }
        }
        this.loadingPromise = null
        return this.manifest
      })

    return this.loadingPromise
  }

  /**
   * Get the manifest (synchronous if already loaded)
   */
  getManifest(): AssetManifest | null {
    return this.manifest
  }

  /**
   * Check if a model exists and get its path
   */
  async getModelPath(id: string, preferCompressed: boolean = true): Promise<string | null> {
    await this.loadManifest()
    if (!this.manifest) return null

    // Check compressed first if preferred
    if (preferCompressed && this.manifest.compressed.models[id]) {
      return this.manifest.compressed.models[id].path
    }

    // Check regular model
    if (this.manifest.models[id]) {
      return this.manifest.models[id].path
    }

    return null
  }

  /**
   * Check if a texture exists and get its path
   */
  async getTexturePath(id: string, preferCompressed: boolean = true): Promise<string | null> {
    await this.loadManifest()
    if (!this.manifest) return null

    // Check compressed first if preferred
    if (preferCompressed && this.manifest.compressed.textures[id]) {
      return this.manifest.compressed.textures[id].path
    }

    // Check regular texture
    if (this.manifest.textures[id]) {
      return this.manifest.textures[id].path
    }

    return null
  }

  /**
   * Get all models in a category
   */
  async getModelsByCategory(category: string): Promise<string[]> {
    await this.loadManifest()
    if (!this.manifest) return []

    return Object.keys(this.manifest.models).filter(key => 
      key.includes(`/${category}/`) || key.startsWith(`${category}/`)
    )
  }

  /**
   * Get total asset sizes
   */
  getAssetSizes(): { models: number; textures: number; total: number } {
    if (!this.manifest) return { models: 0, textures: 0, total: 0 }

    const modelSize = Object.values(this.manifest.models).reduce((sum, m) => sum + m.size, 0)
    const textureSize = Object.values(this.manifest.textures).reduce((sum, t) => sum + t.size, 0)

    return {
      models: modelSize,
      textures: textureSize,
      total: modelSize + textureSize
    }
  }

  /**
   * Reset manifest (for testing/reloading)
   */
  reset(): void {
    this.manifest = null
    this.loadingPromise = null
  }
}

// Singleton instance
export const assetManifest = new AssetManifestManager()

