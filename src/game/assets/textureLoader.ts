/**
 * Enhanced Texture Loader
 * Loads textures with support for PBR materials (normal maps, roughness maps, etc.)
 * Supports loading from open-source texture sources
 */

import * as THREE from 'three'
import { assetManager } from './assetManager'

export interface TextureSet {
  diffuse?: THREE.Texture
  normal?: THREE.Texture
  roughness?: THREE.Texture
  metallic?: THREE.Texture
  emissive?: THREE.Texture
  ao?: THREE.Texture // Ambient occlusion
}

export interface TextureConfig {
  name: string
  baseUrl?: string // Base URL for texture files
  files?: {
    diffuse?: string
    normal?: string
    roughness?: string
    metallic?: string
    emissive?: string
    ao?: string
  }
  // Or use procedural generation
  procedural?: {
    width: number
    height: number
    generator: (ctx: CanvasRenderingContext2D) => void
  }
  // Texture properties
  repeat?: [number, number]
  anisotropy?: number
}

class EnhancedTextureLoader {
  private textureCache: Map<string, TextureSet> = new Map()
  private loader: THREE.TextureLoader = new THREE.TextureLoader()
  
  /**
   * Load a texture set
   */
  async loadTextureSet(config: TextureConfig): Promise<TextureSet> {
    const cacheKey = config.name
    
    // Check cache
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!
    }
    
    const textureSet: TextureSet = {}
    
    // Load procedural texture if specified
    if (config.procedural) {
      const texture = assetManager.generateTexture(
        config.name,
        config.procedural.width,
        config.procedural.height,
        config.procedural.generator
      )
      textureSet.diffuse = texture
    }
    
    // Load texture files if specified
    if (config.files && config.baseUrl) {
      const loadPromises: Promise<void>[] = []
      
      if (config.files.diffuse) {
        loadPromises.push(
          this.loadTexture(`${config.baseUrl}/${config.files.diffuse}`)
            .then(tex => {
              textureSet.diffuse = tex
              this.configureTexture(tex, config)
            })
        )
      }
      
      if (config.files.normal) {
        loadPromises.push(
          this.loadTexture(`${config.baseUrl}/${config.files.normal}`)
            .then(tex => {
              textureSet.normal = tex
              this.configureTexture(tex, config)
            })
        )
      }
      
      if (config.files.roughness) {
        loadPromises.push(
          this.loadTexture(`${config.baseUrl}/${config.files.roughness}`)
            .then(tex => {
              textureSet.roughness = tex
              this.configureTexture(tex, config)
            })
        )
      }
      
      if (config.files.metallic) {
        loadPromises.push(
          this.loadTexture(`${config.baseUrl}/${config.files.metallic}`)
            .then(tex => {
              textureSet.metallic = tex
              this.configureTexture(tex, config)
            })
        )
      }
      
      if (config.files.emissive) {
        loadPromises.push(
          this.loadTexture(`${config.baseUrl}/${config.files.emissive}`)
            .then(tex => {
              textureSet.emissive = tex
              this.configureTexture(tex, config)
            })
        )
      }
      
      if (config.files.ao) {
        loadPromises.push(
          this.loadTexture(`${config.baseUrl}/${config.files.ao}`)
            .then(tex => {
              textureSet.ao = tex
              this.configureTexture(tex, config)
            })
        )
      }
      
      await Promise.all(loadPromises)
    }
    
    // Cache the texture set
    this.textureCache.set(cacheKey, textureSet)
    
    return textureSet
  }
  
  /**
   * Load a single texture
   */
  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve) => {
      this.loader.load(
        url,
        (texture) => {
          resolve(texture)
        },
        undefined,
        (error) => {
          console.warn(`Failed to load texture ${url}, using fallback:`, error)
          // Return a fallback texture
          const fallback = this.createFallbackTexture()
          resolve(fallback)
        }
      )
    })
  }
  
  /**
   * Configure texture properties
   */
  private configureTexture(texture: THREE.Texture, config: TextureConfig): void {
    if (config.repeat) {
      texture.repeat.set(config.repeat[0], config.repeat[1])
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
    }
    
    if (config.anisotropy !== undefined) {
      texture.anisotropy = config.anisotropy
    } else {
      texture.anisotropy = 16 // Default high quality
    }
    
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
  }
  
  /**
   * Create a fallback texture
   */
  private createFallbackTexture(): THREE.Texture {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    
    ctx.fillStyle = '#2a2a3a'
    ctx.fillRect(0, 0, 256, 256)
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.generateMipmaps = true
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    
    return texture
  }
  
  /**
   * Get texture set from cache
   */
  getTextureSet(name: string): TextureSet | null {
    return this.textureCache.get(name) || null
  }
  
  /**
   * Create material from texture set
   */
  createMaterial(textureSet: TextureSet, baseColor: string = '#ffffff'): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.7,
      metalness: 0.3
    })
    
    if (textureSet.diffuse) {
      material.map = textureSet.diffuse
    }
    
    if (textureSet.normal) {
      material.normalMap = textureSet.normal
      material.normalScale = new THREE.Vector2(1, 1)
    }
    
    if (textureSet.roughness) {
      material.roughnessMap = textureSet.roughness
    }
    
    if (textureSet.metallic) {
      material.metalnessMap = textureSet.metallic
    }
    
    if (textureSet.emissive) {
      material.emissiveMap = textureSet.emissive
      material.emissive = new THREE.Color(0xffffff)
      material.emissiveIntensity = 0.5
    }
    
    if (textureSet.ao) {
      material.aoMap = textureSet.ao
    }
    
    return material
  }
  
  /**
   * Generate procedural texture set
   */
  generateProceduralTextureSet(
    name: string,
    width: number,
    height: number,
    generator: (ctx: CanvasRenderingContext2D) => void
  ): TextureSet {
    const texture = assetManager.generateTexture(name, width, height, generator)
    return { diffuse: texture }
  }
  
  /**
   * Preload common textures
   */
  async preloadCommonTextures(): Promise<void> {
    // Preload building textures
    const buildingTextures = [
      {
        name: 'concrete-building',
        procedural: {
          width: 512,
          height: 512,
          generator: (ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = '#3a3a4a'
            ctx.fillRect(0, 0, 512, 512)
            
            // Add texture detail
            for (let i = 0; i < 100; i++) {
              const x = Math.random() * 512
              const y = Math.random() * 512
              const size = Math.random() * 5 + 2
              ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${100 + Math.random() * 50}, ${100 + Math.random() * 50}, 0.3)`
              ctx.fillRect(x, y, size, size)
            }
          }
        }
      },
      {
        name: 'glass-building',
        procedural: {
          width: 512,
          height: 512,
          generator: (ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = '#1a1a2a'
            ctx.fillRect(0, 0, 512, 512)
            
            // Add window grid
            ctx.strokeStyle = '#00ffff'
            ctx.lineWidth = 1
            ctx.globalAlpha = 0.3
            
            for (let x = 0; x < 512; x += 32) {
              ctx.beginPath()
              ctx.moveTo(x, 0)
              ctx.lineTo(x, 512)
              ctx.stroke()
            }
            
            for (let y = 0; y < 512; y += 32) {
              ctx.beginPath()
              ctx.moveTo(0, y)
              ctx.lineTo(512, y)
              ctx.stroke()
            }
          }
        }
      },
      {
        name: 'metal-building',
        procedural: {
          width: 512,
          height: 512,
          generator: (ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = '#2a2a3a'
            ctx.fillRect(0, 0, 512, 512)
            
            // Add metal panel effect
            for (let i = 0; i < 20; i++) {
              const x = (i % 5) * 102.4
              const y = Math.floor(i / 5) * 102.4
              
              const gradient = ctx.createLinearGradient(x, y, x + 102.4, y + 102.4)
              gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)')
              gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)')
              ctx.fillStyle = gradient
              ctx.fillRect(x, y, 102.4, 102.4)
            }
          }
        }
      }
    ]
    
    for (const config of buildingTextures) {
      await this.loadTextureSet(config)
    }
  }
  
  /**
   * Clear texture cache
   */
  clearCache(): void {
    this.textureCache.forEach(textureSet => {
      Object.values(textureSet).forEach(texture => {
        if (texture) {
          texture.dispose()
        }
      })
    })
    this.textureCache.clear()
  }
}

// Singleton instance
export const enhancedTextureLoader = new EnhancedTextureLoader()

