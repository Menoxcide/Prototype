/**
 * City Layout System
 * Organizes buildings into proper grid blocks along roads
 * Creates NYC-style city organization with proper zoning
 */

import * as THREE from 'three'
import type { RoadNetwork, RoadSegment } from './roadGenerator'
import { BuildingType, type Building } from './chunkManager'
import { 
  getRandomBuildingType, 
  generateBuildingDimensions, 
  getBuildingTextureType,
  BUILDING_TYPE_CONFIGS,
  type BuildingTypeConfig 
} from '../assets/buildingTypes'

export interface CityBlock {
  id: string
  center: THREE.Vector3
  width: number
  depth: number
  buildings: Building[]
  zone: 'commercial' | 'residential' | 'mixed' | 'downtown'
}

export interface BuildingPlacement {
  building: Building
  blockId: string
  position: THREE.Vector3
  rotation: number
}

/**
 * Generate city blocks from road network
 */
export function generateCityBlocks(
  roadNetwork: RoadNetwork,
  citySize: number,
  blockSize: number = 40
): CityBlock[] {
  const blocks: CityBlock[] = []
  const halfSize = citySize / 2
  
  // Create grid of potential blocks
  const blockMap = new Map<string, CityBlock>()
  
  // Identify intersections to create blocks
  const intersections = roadNetwork.intersections
  
  // Group intersections into blocks
  for (let i = 0; i < intersections.length; i++) {
    const intersection = intersections[i]
    
    // Find nearby intersections to form a block
    const nearbyIntersections = intersections.filter(other => {
      const dist = intersection.distanceTo(other)
      return dist > 0 && dist < blockSize * 1.5
    })
    
    if (nearbyIntersections.length >= 2) {
      // Calculate block center and dimensions
      const avgX = nearbyIntersections.reduce((sum, p) => sum + p.x, 0) / nearbyIntersections.length
      const avgZ = nearbyIntersections.reduce((sum, p) => sum + p.z, 0) / nearbyIntersections.length
      
      const blockKey = `${Math.floor(avgX / blockSize)},${Math.floor(avgZ / blockSize)}`
      
      if (!blockMap.has(blockKey)) {
        // Determine zone based on distance from center
        const distFromCenter = Math.sqrt(avgX ** 2 + avgZ ** 2)
        let zone: 'commercial' | 'residential' | 'mixed' | 'downtown'
        
        if (distFromCenter < citySize * 0.2) {
          zone = 'downtown'
        } else if (distFromCenter < citySize * 0.4) {
          zone = 'commercial'
        } else if (distFromCenter < citySize * 0.6) {
          zone = 'mixed'
        } else {
          zone = 'residential'
        }
        
        const block: CityBlock = {
          id: `block-${blockKey}`,
          center: new THREE.Vector3(avgX, 0, avgZ),
          width: blockSize,
          depth: blockSize,
          buildings: [],
          zone
        }
        
        blockMap.set(blockKey, block)
        blocks.push(block)
      }
    }
  }
  
  // If no blocks from intersections, create grid-based blocks
  if (blocks.length === 0) {
    for (let x = -halfSize; x < halfSize; x += blockSize) {
      for (let z = -halfSize; z < halfSize; z += blockSize) {
        const distFromCenter = Math.sqrt(x ** 2 + z ** 2)
        let zone: 'commercial' | 'residential' | 'mixed' | 'downtown'
        
        if (distFromCenter < citySize * 0.2) {
          zone = 'downtown'
        } else if (distFromCenter < citySize * 0.4) {
          zone = 'commercial'
        } else if (distFromCenter < citySize * 0.6) {
          zone = 'mixed'
        } else {
          zone = 'residential'
        }
        
        blocks.push({
          id: `block-${Math.floor(x / blockSize)},${Math.floor(z / blockSize)}`,
          center: new THREE.Vector3(x + blockSize / 2, 0, z + blockSize / 2),
          width: blockSize,
          depth: blockSize,
          buildings: [],
          zone
        })
      }
    }
  }
  
  return blocks
}

/**
 * Place buildings in city blocks
 */
export function placeBuildingsInBlocks(
  blocks: CityBlock[],
  roadNetwork: RoadNetwork,
  buildingCount: number,
  rng: () => number
): BuildingPlacement[] {
  const placements: BuildingPlacement[] = []
  const placedPositions: Array<{ x: number; z: number; radius: number }> = []
  
  // Sort blocks by zone priority (downtown first, then commercial, etc.)
  const sortedBlocks = [...blocks].sort((a, b) => {
    const zonePriority: Record<string, number> = {
      'downtown': 0,
      'commercial': 1,
      'mixed': 2,
      'residential': 3
    }
    return zonePriority[a.zone] - zonePriority[b.zone]
  })
  
  // Distribute buildings across blocks
  let buildingsPlaced = 0
  const buildingsPerBlock = Math.ceil(buildingCount / sortedBlocks.length)
  
  for (const block of sortedBlocks) {
    if (buildingsPlaced >= buildingCount) break
    
    // Determine how many buildings in this block
    const blockBuildingCount = Math.min(
      buildingsPerBlock + Math.floor(rng() * 3) - 1, // Vary by ±1
      buildingCount - buildingsPlaced
    )
    
    // Place buildings in this block
    for (let i = 0; i < blockBuildingCount && buildingsPlaced < buildingCount; i++) {
      const placement = placeBuildingInBlock(
        block,
        roadNetwork,
        placedPositions,
        rng,
        buildingsPlaced
      )
      
      if (placement) {
        placements.push(placement)
        placedPositions.push({
          x: placement.position.x,
          z: placement.position.z,
          radius: Math.max(placement.building.width, placement.building.depth) / 2 + 2
        })
        buildingsPlaced++
      }
    }
  }
  
  return placements
}

/**
 * Place a single building in a block
 */
function placeBuildingInBlock(
  block: CityBlock,
  roadNetwork: RoadNetwork,
  existingPositions: Array<{ x: number; z: number; radius: number }>,
  rng: () => number,
  buildingIndex: number
): BuildingPlacement | null {
  // Get building type based on zone
  const buildingConfig = getBuildingTypeForZone(block.zone, rng)
  const dimensions = generateBuildingDimensions(buildingConfig, rng)
  
  // Try to place building near roads (for commercial) or away (for residential)
  let attempts = 0
  const maxAttempts = 30
  
  while (attempts < maxAttempts) {
    let x: number, z: number
    
    if (buildingConfig.placementRules.preferRoads) {
      // Place near roads
      const roadSegment = roadNetwork.segments[Math.floor(rng() * roadNetwork.segments.length)]
      const t = rng()
      const roadX = roadSegment.start.x + (roadSegment.end.x - roadSegment.start.x) * t
      const roadZ = roadSegment.start.z + (roadSegment.end.z - roadSegment.start.z) * t
      
      // Offset perpendicular to road
      const angle = Math.atan2(
        roadSegment.end.z - roadSegment.start.z,
        roadSegment.end.x - roadSegment.start.x
      ) + Math.PI / 2
      const offset = buildingConfig.placementRules.minDistanceFromRoad + 
                    (buildingConfig.placementRules.maxDistanceFromRoad - buildingConfig.placementRules.minDistanceFromRoad) * rng()
      
      x = roadX + Math.cos(angle) * offset
      z = roadZ + Math.sin(angle) * offset
    } else {
      // Place randomly in block
      x = block.center.x + (rng() - 0.5) * block.width * 0.8
      z = block.center.z + (rng() - 0.5) * block.depth * 0.8
    }
    
    // Check if position is valid
    const radius = Math.max(dimensions.width, dimensions.depth) / 2
    const tooClose = existingPositions.some(pos => {
      const dist = Math.sqrt((pos.x - x) ** 2 + (pos.z - z) ** 2)
      return dist < pos.radius + radius + buildingConfig.placementRules.minSpacing
    })
    
    // Check if within block bounds
    const inBlock = Math.abs(x - block.center.x) < block.width / 2 &&
                   Math.abs(z - block.center.z) < block.depth / 2
    
    if (!tooClose && inBlock) {
      // Determine rotation (face nearest road)
      let rotation = rng() * Math.PI * 2
      if (buildingConfig.placementRules.preferRoads) {
        const nearestRoad = findNearestRoad(x, z, roadNetwork)
        if (nearestRoad) {
          const roadAngle = Math.atan2(
            nearestRoad.end.z - nearestRoad.start.z,
            nearestRoad.end.x - nearestRoad.start.x
          )
          rotation = roadAngle + Math.PI / 2 // Face road
        }
      }
      
      const building: Building = {
        id: `building-${block.id}-${buildingIndex}`,
        type: buildingConfig.type,
        position: new THREE.Vector3(x, 0, z),
        rotation,
        width: dimensions.width,
        depth: dimensions.depth,
        height: dimensions.height,
        config: {
          ...buildingConfig,
          textureType: getBuildingTextureType(buildingConfig, rng)
        }
      }
      
      return {
        building,
        blockId: block.id,
        position: new THREE.Vector3(x, 0, z),
        rotation
      }
    }
    
    attempts++
  }
  
  return null // Couldn't find valid position
}

/**
 * Get building type for zone
 */
function getBuildingTypeForZone(
  zone: 'commercial' | 'residential' | 'mixed' | 'downtown',
  rng: () => number
): BuildingTypeConfig {
  // Filter building configs by zone preference
  if (zone === 'downtown') {
    // Prefer skyscrapers in downtown
    const downtownBuildings = BUILDING_TYPE_CONFIGS.filter(
      (config: BuildingTypeConfig) => 
        config.placementRules.zone === 'downtown' || 
        config.type === BuildingType.SKYSCRAPER
    )
    if (downtownBuildings.length > 0) {
      return downtownBuildings[Math.floor(rng() * downtownBuildings.length)]
    }
  } else if (zone === 'commercial') {
    // Prefer retail and hotels
    const commercialBuildings = BUILDING_TYPE_CONFIGS.filter(
      (config: BuildingTypeConfig) => 
        config.placementRules.zone === 'commercial' ||
        config.type === BuildingType.RETAIL ||
        config.type === BuildingType.HOTEL
    )
    if (commercialBuildings.length > 0) {
      return commercialBuildings[Math.floor(rng() * commercialBuildings.length)]
    }
  } else if (zone === 'residential') {
    // Prefer residential
    const residentialBuildings = BUILDING_TYPE_CONFIGS.filter(
      (config: BuildingTypeConfig) => 
        config.placementRules.zone === 'residential' ||
        config.type === BuildingType.RESIDENTIAL
    )
    if (residentialBuildings.length > 0) {
      return residentialBuildings[Math.floor(rng() * residentialBuildings.length)]
    }
  }
  
  // Fallback to random
  return getRandomBuildingType(rng)
}

/**
 * Find nearest road segment to a point
 */
function findNearestRoad(
  x: number,
  z: number,
  roadNetwork: RoadNetwork
): RoadSegment | null {
  let nearest: RoadSegment | null = null
  let minDist = Infinity
  
  for (const segment of roadNetwork.segments) {
    const dist = distanceToLineSegment(
      x, z,
      segment.start.x, segment.start.z,
      segment.end.x, segment.end.z
    )
    
    if (dist < minDist) {
      minDist = dist
      nearest = segment
    }
  }
  
  return nearest
}

/**
 * Calculate distance from point to line segment
 */
function distanceToLineSegment(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1
  const dz = z2 - z1
  const lengthSq = dx * dx + dz * dz
  
  if (lengthSq < 0.001) {
    return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2)
  }
  
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lengthSq))
  const projX = x1 + t * dx
  const projZ = z1 + t * dz
  
  return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2)
}

