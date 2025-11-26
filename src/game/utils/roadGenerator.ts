/**
 * Road Generator Utility
 * Generates road networks for CyberpunkCity with grid roads (center) and organic roads (outskirts)
 */

import * as THREE from 'three'

export interface RoadSegment {
  start: THREE.Vector3
  end: THREE.Vector3
  width: number
  type: 'grid' | 'organic'
}

export interface RoadNetwork {
  segments: RoadSegment[]
  intersections: THREE.Vector3[]
}

/**
 * Generate road network for CyberpunkCity
 * @param citySize Size of the city
 * @param centerRadius Radius of center grid area (as percentage of citySize, e.g., 0.6 = 60%)
 * @param roadWidth Width of roads
 * @param gridSpacing Spacing between grid roads
 */
export function generateRoadNetwork(
  citySize: number,
  centerRadius: number = 0.6,
  roadWidth: number = 6,
  gridSpacing: number = 50
): RoadNetwork {
  const segments: RoadSegment[] = []
  const intersections: THREE.Vector3[] = []
  const halfSize = citySize / 2
  const centerBoundary = (citySize * centerRadius) / 2
  
  // Grid roads in center
  const gridStart = -centerBoundary
  const gridEnd = centerBoundary
  const gridRoadCount = Math.floor((gridEnd - gridStart) / gridSpacing)
  
  // Generate vertical grid roads
  for (let i = 0; i <= gridRoadCount; i++) {
    const x = gridStart + i * gridSpacing
    
    segments.push({
      start: new THREE.Vector3(x, 0.1, -halfSize),
      end: new THREE.Vector3(x, 0.1, halfSize),
      width: roadWidth,
      type: 'grid'
    })
    
    // Add intersection points
    for (let j = 0; j <= gridRoadCount; j++) {
      const z = gridStart + j * gridSpacing
      intersections.push(new THREE.Vector3(x, 0.1, z))
    }
  }
  
  // Generate horizontal grid roads
  for (let i = 0; i <= gridRoadCount; i++) {
    const z = gridStart + i * gridSpacing
    
    segments.push({
      start: new THREE.Vector3(-halfSize, 0.1, z),
      end: new THREE.Vector3(halfSize, 0.1, z),
      width: roadWidth,
      type: 'grid'
    })
  }
  
  // Organic roads in outskirts (curved paths)
  const organicRoadCount = 8
  const rng = seededRandom(54321)
  
  for (let i = 0; i < organicRoadCount; i++) {
    // Start from edge of center or from city edge
    const startFromCenter = rng() > 0.5
    let startX: number
    let startZ: number
    let endX: number
    let endZ: number
    
    if (startFromCenter) {
      // Start from edge of center grid, curve to city edge
      const angle = (i / organicRoadCount) * Math.PI * 2
      startX = centerBoundary * Math.cos(angle)
      startZ = centerBoundary * Math.sin(angle)
      endX = halfSize * Math.cos(angle + (rng() - 0.5) * 0.5)
      endZ = halfSize * Math.sin(angle + (rng() - 0.5) * 0.5)
    } else {
      // Start from city edge, curve inward
      const angle = (i / organicRoadCount) * Math.PI * 2 + Math.PI
      endX = centerBoundary * Math.cos(angle)
      endZ = centerBoundary * Math.sin(angle)
      startX = halfSize * Math.cos(angle + (rng() - 0.5) * 0.5)
      startZ = halfSize * Math.sin(angle + (rng() - 0.5) * 0.5)
    }
    
    // Create curved path using spline
    const points = createCurvedRoad(startX, startZ, endX, endZ, rng)
    
    for (let j = 0; j < points.length - 1; j++) {
      segments.push({
        start: new THREE.Vector3(points[j].x, 0.1, points[j].z),
        end: new THREE.Vector3(points[j + 1].x, 0.1, points[j + 1].z),
        width: roadWidth * (0.8 + rng() * 0.4), // Vary width slightly
        type: 'organic'
      })
    }
  }
  
  return { segments, intersections }
}

/**
 * Create a curved road path between two points
 */
function createCurvedRoad(
  startX: number,
  startZ: number,
  endX: number,
  endZ: number,
  rng: () => number
): Array<{ x: number; z: number }> {
  const points: Array<{ x: number; z: number }> = []
  const segmentCount = 10
  
  // Add some curvature
  const midX = (startX + endX) / 2 + (rng() - 0.5) * 30
  const midZ = (startZ + endZ) / 2 + (rng() - 0.5) * 30
  
  for (let i = 0; i <= segmentCount; i++) {
    const t = i / segmentCount
    // Quadratic bezier curve
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX
    const z = (1 - t) * (1 - t) * startZ + 2 * (1 - t) * t * midZ + t * t * endZ
    points.push({ x, z })
  }
  
  return points
}

/**
 * Check if a point is on a road
 */
export function isPointOnRoad(
  x: number,
  z: number,
  roadNetwork: RoadNetwork,
  margin: number = 0.5
): boolean {
  for (const segment of roadNetwork.segments) {
    const distance = distanceToLineSegment(
      x,
      z,
      segment.start.x,
      segment.start.z,
      segment.end.x,
      segment.end.z
    )
    
    if (distance < segment.width / 2 + margin) {
      return true
    }
  }
  
  return false
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
    // Segment is a point
    return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2)
  }
  
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (pz - z1) * dz) / lengthSq))
  const projX = x1 + t * dx
  const projZ = z1 + t * dz
  
  return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2)
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

