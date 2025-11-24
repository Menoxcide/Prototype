/**
 * Texture Atlas System - Combines multiple textures into a single atlas
 * Reduces draw calls by batching textures
 */

import * as THREE from 'three'

export interface AtlasEntry {
  id: string
  x: number
  y: number
  width: number
  height: number
  uvs: {
    u1: number
    v1: number
    u2: number
    v2: number
  }
}

export interface TextureAtlas {
  texture: THREE.Texture
  entries: Map<string, AtlasEntry>
  width: number
  height: number
}

class TextureAtlasManager {
  private atlases: Map<string, TextureAtlas> = new Map()
  private readonly DEFAULT_ATLAS_SIZE = 2048 // 2048x2048 atlas for desktop
  private readonly MOBILE_ATLAS_SIZE = 1024 // 1024x1024 atlas for mobile

  /**
   * Create a texture atlas from multiple textures
   */
  createAtlas(
    atlasId: string,
    textures: Array<{ id: string; texture: THREE.Texture; width: number; height: number }>,
    atlasSize?: number
  ): TextureAtlas {
    // Use mobile size if not specified and on mobile device
    const size = atlasSize || (this.isMobile() ? this.MOBILE_ATLAS_SIZE : this.DEFAULT_ATLAS_SIZE)
    
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    const entries = new Map<string, AtlasEntry>()
    let currentX = 0
    let currentY = 0
    let rowHeight = 0

    // Pack textures into atlas
    for (const { id, texture, width, height } of textures) {
      // Check if texture fits in current row
      if (currentX + width > size) {
        // Move to next row
        currentY += rowHeight
        currentX = 0
        rowHeight = 0
      }

      // Check if texture fits in atlas
      if (currentY + height > size) {
        console.warn(`Texture ${id} does not fit in atlas ${atlasId}`)
        continue
      }

      // Draw texture to canvas
      if (texture instanceof THREE.CanvasTexture) {
        ctx.drawImage(texture.image, currentX, currentY, width, height)
      } else {
        // For other texture types, would need to convert to image first
        console.warn(`Cannot pack texture ${id} of type ${texture.constructor.name}`)
        continue
      }

      // Calculate UVs
      const u1 = currentX / size
      const v1 = currentY / size
      const u2 = (currentX + width) / size
      const v2 = (currentY + height) / size

      entries.set(id, {
        id,
        x: currentX,
        y: currentY,
        width,
        height,
        uvs: { u1, v1, u2, v2 }
      })

      // Update position
      currentX += width
      rowHeight = Math.max(rowHeight, height)
    }

    // Create Three.js texture from canvas
    const atlasTexture = new THREE.CanvasTexture(canvas)
    atlasTexture.needsUpdate = true
    atlasTexture.flipY = false

    const atlas: TextureAtlas = {
      texture: atlasTexture,
      entries,
      width: size,
      height: size
    }

    this.atlases.set(atlasId, atlas)
    return atlas
  }

  /**
   * Check if running on mobile device
   */
  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth < 768
  }

  /**
   * Get atlas entry for a texture ID
   */
  getAtlasEntry(atlasId: string, textureId: string): AtlasEntry | null {
    const atlas = this.atlases.get(atlasId)
    if (!atlas) return null
    return atlas.entries.get(textureId) || null
  }

  /**
   * Get atlas texture
   */
  getAtlasTexture(atlasId: string): THREE.Texture | null {
    const atlas = this.atlases.get(atlasId)
    return atlas ? atlas.texture : null
  }

  /**
   * Update material to use atlas UVs
   */
  updateMaterialUVs(
    material: THREE.MeshStandardMaterial,
    atlasId: string,
    textureId: string
  ): boolean {
    const entry = this.getAtlasEntry(atlasId, textureId)
    if (!entry) return false

    const atlas = this.atlases.get(atlasId)
    if (!atlas) return false

    material.map = atlas.texture
    // UVs would be updated on geometry, not material
    return true
  }

  /**
   * Dispose of atlas
   */
  disposeAtlas(atlasId: string): void {
    const atlas = this.atlases.get(atlasId)
    if (atlas) {
      atlas.texture.dispose()
      this.atlases.delete(atlasId)
    }
  }

  /**
   * Get all atlas IDs
   */
  getAtlasIds(): string[] {
    return Array.from(this.atlases.keys())
  }
}

export const textureAtlasManager = new TextureAtlasManager()

