/**
 * Sprite Animation System - Handles 2D sprite animations
 * 
 * Animations are loaded from static assets in /characters/{characterId}/animations/
 * These are downloaded via scripts/download-character-animations.js after animating via Pixellab MCP
 * 
 * Supports frame-based animations for walking, idle, attack, etc.
 */

import * as THREE from 'three'
import { assetManager } from './assetManager'

export type SpriteAnimationType = 'idle' | 'walk' | 'run' | 'attack' | 'cast' | 'hit' | 'death'

interface AnimationFrame {
  texture: THREE.Texture
  frame: number
}

interface SpriteAnimation {
  name: string
  direction: string
  frames: AnimationFrame[]
  frameRate: number
  loop: boolean
}

interface CharacterAnimations {
  characterId: string
  animations: Map<string, Map<string, SpriteAnimation>> // animationType -> direction -> animation
}

class SpriteAnimationSystem {
  private characterAnimations: Map<string, CharacterAnimations> = new Map()
  private animationStates: Map<string, {
    currentAnimation: string
    currentDirection: string
    currentFrame: number
    frameTime: number
    playing: boolean
  }> = new Map()

  /**
   * Load animations for a character from Pixellab
   */
  async loadCharacterAnimations(
    characterId: string,
    animationType: SpriteAnimationType,
    directions: string[]
  ): Promise<void> {
    // Check if already loaded
    if (!this.characterAnimations.has(characterId)) {
      this.characterAnimations.set(characterId, {
        characterId,
        animations: new Map()
      })
    }

    const character = this.characterAnimations.get(characterId)!
    
    if (!character.animations.has(animationType)) {
      character.animations.set(animationType, new Map())
    }

    const animationMap = character.animations.get(animationType)!

    // Load animation frames for each direction
    for (const direction of directions) {
      const animation = await this.loadAnimationFrames(characterId, animationType, direction)
      if (animation) {
        animationMap.set(direction, animation)
      }
    }
  }

  /**
   * Load animation frames from Pixellab URLs
   */
  private async loadAnimationFrames(
    characterId: string,
    animationType: SpriteAnimationType,
    direction: string
  ): Promise<SpriteAnimation | null> {
    // Animation paths from static assets (downloaded via Pixellab MCP)
    // Path: /characters/{characterId}/animations/{animationType}/{direction}/frame_{n}.png
    
    const basePath = `/characters/${characterId}/animations/${animationType}/${direction}`
    const loader = new THREE.TextureLoader()
    const frames: AnimationFrame[] = []
    
    // Try to load frames (typically 4-8 frames per animation)
    const maxFrames = 10 // Try up to 10 frames
    let frameCount = 0
    
    for (let i = 0; i < maxFrames; i++) {
      // Try both frame naming formats: frame_0.png and frame_000.png (3-digit padding)
      const frameUrl1 = `${basePath}/frame_${i}.png`
      const frameUrl2 = `${basePath}/frame_${String(i).padStart(3, '0')}.png`
      const textureId = `sprite-${characterId}-${animationType}-${direction}-frame-${i}`
      
      let texture: THREE.Texture | null = null
      
      // Try frame_0.png first
      try {
        texture = await new Promise<THREE.Texture | null>((resolve) => {
          loader.load(
            frameUrl1,
            (loadedTexture) => {
              loadedTexture.flipY = false
              loadedTexture.generateMipmaps = true
              loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
              loadedTexture.magFilter = THREE.LinearFilter
              assetManager.getTexturesMap().set(textureId, loadedTexture)
              resolve(loadedTexture)
            },
            undefined,
            () => {
              resolve(null) // Frame doesn't exist, try next format
            }
          )
        })
      } catch (error) {
        // Continue to try next format
      }
      
      // If not found, try frame_000.png format (3-digit padding)
      if (!texture) {
        try {
          texture = await new Promise<THREE.Texture | null>((resolve) => {
            loader.load(
              frameUrl2,
              (loadedTexture) => {
                loadedTexture.flipY = false
                loadedTexture.generateMipmaps = true
                loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
                loadedTexture.magFilter = THREE.LinearFilter
                assetManager.getTexturesMap().set(textureId, loadedTexture)
                resolve(loadedTexture)
              },
              undefined,
              () => {
                resolve(null) // Frame doesn't exist
              }
            )
          })
        } catch (error) {
          // Continue
        }
      }
      
      if (texture) {
        frames.push({ texture, frame: i })
        frameCount++
      } else {
        // No more frames found in either format
        break
      }
    }

    if (frames.length === 0) {
      return null
    }

    return {
      name: animationType,
      direction,
      frames,
      frameRate: 8, // Default 8 FPS for sprite animations
      loop: animationType !== 'attack' && animationType !== 'cast' && animationType !== 'hit' && animationType !== 'death'
    }
  }

  /**
   * Get animation for a character, type, and direction
   */
  getAnimation(
    characterId: string,
    animationType: SpriteAnimationType,
    direction: string
  ): SpriteAnimation | null {
    const character = this.characterAnimations.get(characterId)
    if (!character) return null
    
    const animationMap = character.animations.get(animationType)
    if (!animationMap) return null
    
    return animationMap.get(direction) || null
  }

  /**
   * Play an animation
   */
  playAnimation(
    instanceId: string,
    characterId: string,
    animationType: SpriteAnimationType,
    direction: string
  ): void {
    const animation = this.getAnimation(characterId, animationType, direction)
    if (!animation) {
      // If animation not available, still set state to use static sprite
      this.animationStates.set(instanceId, {
        currentAnimation: animationType,
        currentDirection: direction,
        currentFrame: 0,
        frameTime: 0,
        playing: false
      })
      return
    }

    this.animationStates.set(instanceId, {
      currentAnimation: animationType,
      currentDirection: direction,
      currentFrame: 0,
      frameTime: 0,
      playing: true
    })
  }

  /**
   * Update animation frame
   */
  updateAnimation(instanceId: string, delta: number): THREE.Texture | null {
    const state = this.animationStates.get(instanceId)
    if (!state || !state.playing) return null

    // Get character ID from instance (format: sprite-{characterId}-{random})
    const characterIdMatch = instanceId.match(/sprite-([^-]+-[^-]+-[^-]+-[^-]+-[^-]+)/)
    if (!characterIdMatch) return null
    const characterId = characterIdMatch[1]

    const animation = this.getAnimation(
      characterId,
      state.currentAnimation as SpriteAnimationType,
      state.currentDirection
    )
    
    if (!animation || animation.frames.length === 0) return null

    // Update frame time
    state.frameTime += delta

    // Calculate frame rate
    const frameDuration = 1 / animation.frameRate

    // Advance to next frame if needed
    if (state.frameTime >= frameDuration) {
      state.currentFrame = (state.currentFrame + 1) % animation.frames.length
      state.frameTime = 0

      // Stop non-looping animations at the end
      if (!animation.loop && state.currentFrame === 0) {
        state.playing = false
        return animation.frames[animation.frames.length - 1].texture
      }
    }

    return animation.frames[state.currentFrame].texture
  }

  /**
   * Stop animation
   */
  stopAnimation(instanceId: string): void {
    const state = this.animationStates.get(instanceId)
    if (state) {
      state.playing = false
    }
  }
}

export const spriteAnimationSystem = new SpriteAnimationSystem()

