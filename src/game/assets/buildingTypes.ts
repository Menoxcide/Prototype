/**
 * Building Types System
 * Defines distinct building types for NYC-style city generation
 */

import { BuildingType } from '../utils/chunkManager'

export interface BuildingTypeConfig {
  type: BuildingType
  name: string
  minHeight: number
  maxHeight: number
  minWidth: number
  maxWidth: number
  minDepth: number
  maxDepth: number
  spawnWeight: number // Relative probability of spawning
  textureTypes: Array<'concrete' | 'metal' | 'glass' | 'mixed'>
  hasNeonStrips: boolean
  windowDensity: number
  features: BuildingFeature[]
  placementRules: PlacementRule
}

export interface BuildingFeature {
  type: 'antenna' | 'rooftop_structure' | 'signage' | 'balcony' | 'fire_escape' | 'ac_units'
  probability: number
  config?: any
}

export interface PlacementRule {
  preferRoads: boolean
  minDistanceFromRoad: number
  maxDistanceFromRoad: number
  avoidOtherBuildings: boolean
  minSpacing: number
  zone?: 'commercial' | 'residential' | 'mixed' | 'downtown'
}

// Skyscrapers - Tall, glass/metal facades, rooftop details
export const SKYSCRAPER_CONFIG: BuildingTypeConfig = {
  type: BuildingType.SKYSCRAPER,
  name: 'Skyscraper',
  minHeight: 60,
  maxHeight: 120,
  minWidth: 8,
  maxWidth: 16,
  minDepth: 8,
  maxDepth: 16,
  spawnWeight: 15, // 15% of buildings
  textureTypes: ['glass', 'metal', 'mixed'],
  hasNeonStrips: true,
  windowDensity: 0.7,
  features: [
    { type: 'antenna', probability: 0.6 },
    { type: 'rooftop_structure', probability: 0.8 },
    { type: 'ac_units', probability: 0.4 }
  ],
  placementRules: {
    preferRoads: true,
    minDistanceFromRoad: 0,
    maxDistanceFromRoad: 5,
    avoidOtherBuildings: true,
    minSpacing: 10,
    zone: 'downtown'
  }
}

// Mid-size buildings - Mixed commercial/residential
export const MID_SIZE_CONFIG: BuildingTypeConfig = {
  type: BuildingType.MID_SIZE,
  name: 'Mid-Size Building',
  minHeight: 20,
  maxHeight: 40,
  minWidth: 6,
  maxWidth: 12,
  minDepth: 6,
  maxDepth: 12,
  spawnWeight: 30, // 30% of buildings
  textureTypes: ['concrete', 'mixed', 'glass'],
  hasNeonStrips: false,
  windowDensity: 0.6,
  features: [
    { type: 'rooftop_structure', probability: 0.3 },
    { type: 'fire_escape', probability: 0.5 },
    { type: 'ac_units', probability: 0.6 }
  ],
  placementRules: {
    preferRoads: true,
    minDistanceFromRoad: 0,
    maxDistanceFromRoad: 8,
    avoidOtherBuildings: true,
    minSpacing: 6,
    zone: 'mixed'
  }
}

// Hotels - Distinctive signage, wider footprint
export const HOTEL_CONFIG: BuildingTypeConfig = {
  type: BuildingType.HOTEL,
  name: 'Hotel',
  minHeight: 30,
  maxHeight: 50,
  minWidth: 10,
  maxWidth: 18,
  minDepth: 10,
  maxDepth: 18,
  spawnWeight: 10, // 10% of buildings
  textureTypes: ['glass', 'mixed'],
  hasNeonStrips: true,
  windowDensity: 0.8,
  features: [
    { type: 'signage', probability: 1.0 }, // Always has signage
    { type: 'rooftop_structure', probability: 0.4 },
    { type: 'balcony', probability: 0.3 }
  ],
  placementRules: {
    preferRoads: true,
    minDistanceFromRoad: 0,
    maxDistanceFromRoad: 5,
    avoidOtherBuildings: true,
    minSpacing: 8,
    zone: 'commercial'
  }
}

// Retail stores - Ground-floor storefronts, signs
export const RETAIL_CONFIG: BuildingTypeConfig = {
  type: BuildingType.RETAIL,
  name: 'Retail Store',
  minHeight: 10,
  maxHeight: 20,
  minWidth: 4,
  maxWidth: 10,
  minDepth: 4,
  maxDepth: 10,
  spawnWeight: 25, // 25% of buildings
  textureTypes: ['concrete', 'mixed'],
  hasNeonStrips: true,
  windowDensity: 0.4, // Large storefront windows
  features: [
    { type: 'signage', probability: 0.9 }, // Most have signage
    { type: 'ac_units', probability: 0.3 }
  ],
  placementRules: {
    preferRoads: true,
    minDistanceFromRoad: 0,
    maxDistanceFromRoad: 3, // Close to roads
    avoidOtherBuildings: true,
    minSpacing: 4,
    zone: 'commercial'
  }
}

// Residential buildings
export const RESIDENTIAL_CONFIG: BuildingTypeConfig = {
  type: BuildingType.RESIDENTIAL,
  name: 'Residential Building',
  minHeight: 15,
  maxHeight: 30,
  minWidth: 5,
  maxWidth: 10,
  minDepth: 5,
  maxDepth: 10,
  spawnWeight: 20, // 20% of buildings
  textureTypes: ['concrete', 'mixed'],
  hasNeonStrips: false,
  windowDensity: 0.5,
  features: [
    { type: 'fire_escape', probability: 0.7 },
    { type: 'balcony', probability: 0.4 },
    { type: 'ac_units', probability: 0.5 }
  ],
  placementRules: {
    preferRoads: false,
    minDistanceFromRoad: 2,
    maxDistanceFromRoad: 15,
    avoidOtherBuildings: true,
    minSpacing: 5,
    zone: 'residential'
  }
}

// All building type configs
export const BUILDING_TYPE_CONFIGS: BuildingTypeConfig[] = [
  SKYSCRAPER_CONFIG,
  MID_SIZE_CONFIG,
  HOTEL_CONFIG,
  RETAIL_CONFIG,
  RESIDENTIAL_CONFIG
]

// Get building config by type
export function getBuildingConfig(type: BuildingType): BuildingTypeConfig {
  return BUILDING_TYPE_CONFIGS.find(config => config.type === type) || MID_SIZE_CONFIG
}

// Get random building type based on weights
export function getRandomBuildingType(rng: () => number): BuildingTypeConfig {
  const totalWeight = BUILDING_TYPE_CONFIGS.reduce((sum, config) => sum + config.spawnWeight, 0)
  let roll = rng() * totalWeight
  
  for (const config of BUILDING_TYPE_CONFIGS) {
    roll -= config.spawnWeight
    if (roll <= 0) {
      return config
    }
  }
  
  return MID_SIZE_CONFIG // Fallback
}

// Generate building dimensions based on type config
export function generateBuildingDimensions(
  config: BuildingTypeConfig,
  rng: () => number
): { width: number; depth: number; height: number } {
  return {
    width: config.minWidth + (config.maxWidth - config.minWidth) * rng(),
    depth: config.minDepth + (config.maxDepth - config.minDepth) * rng(),
    height: config.minHeight + (config.maxHeight - config.minHeight) * rng()
  }
}

// Get texture type for building
export function getBuildingTextureType(config: BuildingTypeConfig, rng: () => number): 'concrete' | 'metal' | 'glass' | 'mixed' {
  const types = config.textureTypes
  return types[Math.floor(rng() * types.length)]
}

// Check if building should have a feature
export function shouldHaveFeature(feature: BuildingFeature, rng: () => number): boolean {
  return rng() < feature.probability
}

