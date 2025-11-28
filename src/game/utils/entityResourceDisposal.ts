/**
 * Entity Resource Disposal
 * Ensures Three.js resources (geometries, materials, textures) are properly
 * disposed when entities are removed from the game
 */

import * as THREE from 'three'
import { assetManager } from '../assets/assetManager'

/**
 * Dispose of all Three.js resources in a scene object recursively
 */
export function disposeObject3D(object: THREE.Object3D): void {
  if (!object) return
  
  object.traverse((child) => {
    // Dispose geometry
    if (child instanceof THREE.Mesh && child.geometry) {
      child.geometry.dispose()
    }
    
    // Dispose materials
    if (child instanceof THREE.Mesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => {
          disposeMaterial(material)
        })
      } else {
        disposeMaterial(child.material)
      }
    }
    
    // Dispose lights (if any cached resources)
    if (child instanceof THREE.Light) {
      // Lights don't need disposal, but we can clean up helpers if present
      if ((child as any).helper) {
        const helper = (child as any).helper
        if (helper.geometry) helper.geometry.dispose()
        if (helper.material) disposeMaterial(helper.material)
      }
    }
    
    // Remove from parent to break references
    if (child.parent) {
      child.parent.remove(child)
    }
  })
  
  // Clear any user data
  if (object.userData) {
    object.userData = {}
  }
}

/**
 * Dispose of a material and all its textures
 */
export function disposeMaterial(material: THREE.Material): void {
  if (!material) return
  
  // Dispose textures
  const textureProperties = [
    'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
    'emissiveMap', 'bumpMap', 'displacementMap', 'alphaMap', 'envMap',
    'lightMap', 'gradientMap'
  ]
  
  textureProperties.forEach((prop) => {
    const texture = (material as any)[prop]
    if (texture && texture instanceof THREE.Texture) {
      texture.dispose()
    }
  })
  
  // Dispose cube textures (environment maps)
  if ((material as any).envMap && (material as any).envMap instanceof THREE.CubeTexture) {
    const envMap = (material as any).envMap
    if (envMap.image && Array.isArray(envMap.image)) {
      envMap.image.forEach((img: any) => {
        if (img && img.dispose) {
          img.dispose()
        }
      })
    }
    envMap.dispose()
  }
  
  // Dispose the material itself
  material.dispose()
}

/**
 * Dispose of an enemy's resources when removed
 */
export function disposeEnemyResources(enemyId: string): void {
  try {
    // Release model from asset manager
    assetManager.releaseModel(`enemy-${enemyId}`)
    
    // Asset manager will handle model disposal when ref count reaches 0
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[EntityDisposal] Error disposing enemy ${enemyId}:`, error)
    }
  }
}

/**
 * Dispose of a loot drop's resources when removed
 */
export function disposeLootDropResources(lootId: string): void {
  try {
    // Loot drops are typically procedural and don't have separate models
    // But we can clean up any cached resources if needed
    // For now, we'll just ensure any references are cleared
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[EntityDisposal] Error disposing loot drop ${lootId}:`, error)
    }
  }
}

/**
 * Dispose of a projectile's resources when removed
 */
export function disposeProjectileResources(projectileId: string): void {
  try {
    // Projectiles are typically procedural
    // Clean up any cached resources
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[EntityDisposal] Error disposing projectile ${projectileId}:`, error)
    }
  }
}

/**
 * Dispose of an NPC's resources when removed
 */
export function disposeNPCResources(npcId: string): void {
  try {
    // Release model from asset manager
    assetManager.releaseModel(`npc-${npcId}`)
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[EntityDisposal] Error disposing NPC ${npcId}:`, error)
    }
  }
}

/**
 * Batch dispose multiple entities
 */
export function batchDisposeEntities(entities: Array<{ type: string; id: string }>): void {
  entities.forEach((entity) => {
    switch (entity.type) {
      case 'enemy':
        disposeEnemyResources(entity.id)
        break
      case 'loot':
        disposeLootDropResources(entity.id)
        break
      case 'projectile':
        disposeProjectileResources(entity.id)
        break
      case 'npc':
        disposeNPCResources(entity.id)
        break
    }
  })
}

