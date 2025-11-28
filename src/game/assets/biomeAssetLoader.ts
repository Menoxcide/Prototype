/**
 * Biome Asset Loader
 * Helper functions for loading biome-specific assets
 */

import { assetManager } from './assetManager'
import * as THREE from 'three'

export type Biome = 'cyberpunk' | 'sci-fi' | 'alien' | 'nature' | 'desert' | 'void'
export type AssetCategory = 'floor' | 'walls' | 'columns' | 'roof' | 'doors' | 'stairs' | 'props' | 'details' | 'pipes'

/**
 * Load a biome-specific asset
 */
export async function loadBiomeAsset(
  biome: Biome,
  category: AssetCategory,
  name: string,
  options?: {
    scale?: number
    onProgress?: (progress: number) => void
  }
): Promise<THREE.Group | THREE.Object3D> {
  const assetId = `biome-${biome}-${category}-${name}`
  const assetPath = `/assets/models/biomes/${biome}/${category}/${name}.glb`
  
  return assetManager.loadModel(assetId, assetPath, {
    scale: options?.scale,
    onProgress: options?.onProgress
  })
}

/**
 * Load a prop asset
 */
export async function loadProp(
  name: string,
  category: 'sci-fi' | 'details' | 'pipes' = 'sci-fi',
  options?: {
    scale?: number
    onProgress?: (progress: number) => void
  }
): Promise<THREE.Group | THREE.Object3D> {
  const assetId = `prop-${category}-${name}`
  const assetPath = `/assets/models/props/${category}/${name}.glb`
  
  return assetManager.loadModel(assetId, assetPath, {
    scale: options?.scale,
    onProgress: options?.onProgress
  })
}

/**
 * Get available assets for a biome (from registry)
 */
export async function getAvailableAssets(biome: Biome): Promise<{
  floor: string[]
  walls: string[]
  columns: string[]
  roof: string[]
  doors: string[]
  stairs: string[]
  props: string[]
  details: string[]
  pipes: string[]
}> {
  try {
    const response = await fetch('/assets/models/ASSET_REGISTRY.json')
    const registry = await response.json()
    
    const biomeAssets = registry.assets.filter((asset: any) => asset.biome === biome)
    
    return {
      floor: biomeAssets.filter((a: any) => a.category === 'floor').map((a: any) => a.name),
      walls: biomeAssets.filter((a: any) => a.category === 'walls').map((a: any) => a.name),
      columns: biomeAssets.filter((a: any) => a.category === 'columns').map((a: any) => a.name),
      roof: biomeAssets.filter((a: any) => a.category === 'roof').map((a: any) => a.name),
      doors: biomeAssets.filter((a: any) => a.category === 'doors').map((a: any) => a.name),
      stairs: biomeAssets.filter((a: any) => a.category === 'stairs').map((a: any) => a.name),
      props: biomeAssets.filter((a: any) => a.category === 'props').map((a: any) => a.name),
      details: biomeAssets.filter((a: any) => a.category === 'details').map((a: any) => a.name),
      pipes: biomeAssets.filter((a: any) => a.category === 'pipes').map((a: any) => a.name)
    }
  } catch (error) {
    console.warn('Failed to load asset registry:', error)
    return {
      floor: [],
      walls: [],
      columns: [],
      roof: [],
      doors: [],
      stairs: [],
      props: [],
      details: [],
      pipes: []
    }
  }
}

/**
 * Load texture from biome texture directory
 */
export async function loadBiomeTexture(
  biome: Biome,
  textureName: string,
  mapType: 'diffuse' | 'normal' | 'roughness' | 'metallic' | 'ao' = 'diffuse'
): Promise<THREE.Texture> {
  const texturePath = `/assets/textures/${biome}/${textureName}/${textureName}_${mapType}.jpg`
  
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.load(
      texturePath,
      (texture) => {
        texture.flipY = false // GLB textures are typically not flipped
        resolve(texture)
      },
      undefined,
      (error) => {
        reject(error)
      }
    )
  })
}

/**
 * Preload common biome assets
 */
export async function preloadBiomeAssets(biome: Biome, categories: AssetCategory[] = ['floor', 'walls', 'props']): Promise<void> {
  const assets = await getAvailableAssets(biome)
  
  const loadPromises: Promise<any>[] = []
  
  for (const category of categories) {
    const assetNames = assets[category] || []
    
    for (const name of assetNames.slice(0, 5)) { // Preload first 5 of each category
      loadPromises.push(
        loadBiomeAsset(biome, category, name).catch(err => {
          console.warn(`Failed to preload ${biome}/${category}/${name}:`, err)
        })
      )
    }
  }
  
  await Promise.all(loadPromises)
}

