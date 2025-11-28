/**
 * Sprite to 3D Converter
 * Converts 2D/2.5D isometric sprites into 3D models using extrusion
 * 
 * Methods:
 * 1. Sprite Extrusion - Extrudes sprite along Z-axis with depth
 * 2. Sprite Stacking - Stacks multiple sprite layers for voxel-like effect
 * 3. Texture Mapping - Maps sprite to 3D geometry
 */

import * as THREE from 'three'

export interface SpriteTo3DOptions {
  method: 'extrude' | 'stack' | 'texture'
  depth?: number // Extrusion depth (default: 0.5)
  layers?: number // Number of layers for stacking (default: 8)
  geometry?: 'box' | 'cylinder' | 'capsule' | 'custom' // Base geometry for texture mapping
  scale?: number
  preserveAspect?: boolean
}

class SpriteTo3DConverter {
  /**
   * Convert a 2D sprite texture to a 3D model
   */
  async convertSpriteTo3D(
    _spriteId: string,
    texture: THREE.Texture,
    options: SpriteTo3DOptions = { method: 'extrude' }
  ): Promise<THREE.Group> {
    switch (options.method) {
      case 'extrude':
        return this.extrudeSprite(texture, options)
      case 'stack':
        return this.stackSprite(texture, options)
      case 'texture':
        return this.textureMapSprite(texture, options)
      default:
        return this.extrudeSprite(texture, options)
    }
  }

  /**
   * Extrude sprite along Z-axis (simplest 3D conversion)
   */
  private extrudeSprite(
    texture: THREE.Texture,
    options: SpriteTo3DOptions
  ): THREE.Group {
    const group = new THREE.Group()
    const depth = options.depth || 0.5
    const scale = options.scale || 1.0

    // Get sprite dimensions
    const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | null
    const width = image?.width || 32
    const height = image?.height || 32
    const aspect = width / height

    // Create canvas to extract alpha channel for extrusion shape
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    
    // Draw texture to canvas
    if (image) {
      ctx.drawImage(image, 0, 0)
    }
    const imageData = ctx.getImageData(0, 0, width, height)

    // Create geometry from sprite shape
    const vertices: THREE.Vector2[] = []

    // Extract outline from sprite (simplified - finds edges)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const alpha = imageData.data[idx + 3]
        
        if (alpha > 128) {
          // Check if it's an edge pixel
          const isEdge = this.isEdgePixel(imageData, x, y, width, height)
          if (isEdge) {
            vertices.push(new THREE.Vector2(
              (x / width - 0.5) * scale,
              (0.5 - y / height) * scale
            ))
          }
        }
      }
    }

    // Create simplified shape from vertices
    if (vertices.length > 0) {
      // Use bounding box as fallback if shape extraction fails
      const geometry = new THREE.BoxGeometry(
        aspect * scale,
        scale,
        depth * scale
      )
      
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.1
      })
      
      const mesh = new THREE.Mesh(geometry, material)
      group.add(mesh)
    } else {
      // Fallback: simple box with texture
      const geometry = new THREE.BoxGeometry(
        aspect * scale,
        scale,
        depth * scale
      )
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true
      })
      group.add(new THREE.Mesh(geometry, material))
    }

    return group
  }

  /**
   * Stack sprite layers for voxel-like 3D effect
   */
  private stackSprite(
    texture: THREE.Texture,
    options: SpriteTo3DOptions
  ): THREE.Group {
    const group = new THREE.Group()
    const layers = options.layers || 8
    const scale = options.scale || 1.0

    const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | null
    const width = image?.width || 32
    const height = image?.height || 32
    const aspect = width / height
    const layerHeight = scale / layers

    // Create canvas for processing
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    if (image) {
      ctx.drawImage(image, 0, 0)
    }
    const imageData = ctx.getImageData(0, 0, width, height)

    // Create layers
    for (let layer = 0; layer < layers; layer++) {
      const y = Math.floor((layer / layers) * height)
      const geometry = new THREE.PlaneGeometry(aspect * scale, layerHeight)
      
      // Extract this layer's pixels
      const layerTexture = this.extractLayerTexture(imageData, width, height, y, layerHeight)
      
      const material = new THREE.MeshStandardMaterial({
        map: layerTexture,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.1
      })
      
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.y = (layer - layers / 2) * layerHeight
      group.add(mesh)
    }

    return group
  }

  /**
   * Map sprite as texture to 3D geometry
   */
  private textureMapSprite(
    texture: THREE.Texture,
    options: SpriteTo3DOptions
  ): THREE.Group {
    const group = new THREE.Group()
    const scale = options.scale || 1.0
    const geometryType = options.geometry || 'box'

    const image = texture.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | null
    const width = image?.width || 32
    const height = image?.height || 32
    const aspect = width / height

    let geometry: THREE.BufferGeometry

    switch (geometryType) {
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          scale * 0.5,
          scale * 0.5,
          scale * aspect,
          8
        )
        break
      case 'capsule':
        geometry = new THREE.CapsuleGeometry(
          scale * 0.5,
          scale * aspect,
          8,
          16
        )
        break
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(
          aspect * scale,
          scale,
          scale * 0.5
        )
        break
    }

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.1
    })

    const mesh = new THREE.Mesh(geometry, material)
    group.add(mesh)

    return group
  }

  /**
   * Check if pixel is on edge of sprite
   */
  private isEdgePixel(
    imageData: ImageData,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    const idx = (y * width + x) * 4
    const alpha = imageData.data[idx + 3]
    
    if (alpha < 128) return false

    // Check neighbors
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 }
    ]

    for (const neighbor of neighbors) {
      if (
        neighbor.x >= 0 && neighbor.x < width &&
        neighbor.y >= 0 && neighbor.y < height
      ) {
        const nIdx = (neighbor.y * width + neighbor.x) * 4
        const nAlpha = imageData.data[nIdx + 3]
        if (nAlpha < 128) return true
      } else {
        return true // Edge of image
      }
    }

    return false
  }

  /**
   * Extract texture for a specific layer
   */
  private extractLayerTexture(
    imageData: ImageData,
    width: number,
    height: number,
    y: number,
    layerHeight: number
  ): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = Math.ceil(layerHeight * height)
    const ctx = canvas.getContext('2d')!
    
    const layerData = ctx.createImageData(width, canvas.height)
    const startY = Math.max(0, y - Math.floor(canvas.height / 2))

    for (let ly = 0; ly < canvas.height; ly++) {
      const srcY = startY + ly
      if (srcY >= 0 && srcY < height) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (srcY * width + x) * 4
          const dstIdx = (ly * width + x) * 4
          layerData.data[dstIdx] = imageData.data[srcIdx]
          layerData.data[dstIdx + 1] = imageData.data[srcIdx + 1]
          layerData.data[dstIdx + 2] = imageData.data[srcIdx + 2]
          layerData.data[dstIdx + 3] = imageData.data[srcIdx + 3]
        }
      }
    }

    ctx.putImageData(layerData, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.flipY = false
    return texture
  }

  /**
   * Convert monster sprite to 3D model
   */
  async convertMonsterTo3D(monsterId: string): Promise<THREE.Group> {
    // Load sprite texture
    const sprite = await import('./monsterSpriteLoader').then(m => 
      m.monsterSpriteLoader.loadMonster(monsterId)
    )
    
    return this.convertSpriteTo3D(monsterId, sprite.texture, {
      method: 'extrude',
      depth: 0.3,
      scale: 1.0
    })
  }

  /**
   * Convert NPC sprite to 3D model
   */
  async convertNPCTo3D(npcId: string): Promise<THREE.Group> {
    // Load sprite texture
    const sprite = await import('./npcSpriteLoader').then(m =>
      m.npcSpriteLoader.loadNPC(npcId)
    )
    
    return this.convertSpriteTo3D(npcId, sprite.texture, {
      method: 'extrude',
      depth: 0.3,
      scale: 1.0
    })
  }

  /**
   * Convert isometric tile to 3D model
   */
  async convertTileTo3D(tileId: string, tileShape: 'thin' | 'thick' | 'block'): Promise<THREE.Group> {
    // Load tile texture
    const texture = await import('./enhancedAssetLoader').then(m =>
      m.enhancedAssetLoader.loadTexture(tileId)
    )
    
    const depthMap: Record<string, number> = {
      'thin': 0.1,
      'thick': 0.25,
      'block': 0.5
    }
    
    return this.convertSpriteTo3D(tileId, texture, {
      method: 'extrude',
      depth: depthMap[tileShape] || 0.5,
      scale: 1.0
    })
  }
}

export const spriteTo3DConverter = new SpriteTo3DConverter()

