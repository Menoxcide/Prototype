/**
 * Building Renderer Component
 * Renders buildings from chunk data using the new building type system
 */

import { useMemo } from 'react'
import * as THREE from 'three'
import type { Building } from '../utils/chunkManager'
import { getBuildingConfig, shouldHaveFeature } from '../assets/buildingTypes'
import { useGameStore } from '../store/useGameStore'
import { getQualitySettings } from '../utils/qualitySettings'
import type { JSX } from 'react'

interface BuildingRendererProps {
  buildings: Building[]
  buildingTextures: Record<string, THREE.Texture>
}

// Seeded random for consistent generation
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

// LOD distance thresholds
const LOD_DISTANCE_HIGH = 50 // High detail within 50 units
const LOD_DISTANCE_MEDIUM = 150 // Medium detail within 150 units
const LOD_DISTANCE_LOW = 300 // Low detail within 300 units

function getLODLevel(distance: number): 'high' | 'medium' | 'low' {
  if (distance < LOD_DISTANCE_HIGH) return 'high'
  if (distance < LOD_DISTANCE_MEDIUM) return 'medium'
  if (distance < LOD_DISTANCE_LOW) return 'low'
  return 'low'
}

export default function BuildingRenderer({ buildings, buildingTextures }: BuildingRendererProps) {
  const player = useGameStore((s) => s.player)
  const qualitySettings = getQualitySettings()
  const neonColors = [
    '#ff6b35', '#ff8c42', '#ffaa5c', '#ffcc7a',
    '#00ffff', '#00ff88', '#88ff00', '#ffff00',
    '#ff00ff', '#ff0088', '#8800ff', '#0088ff',
    '#ff4444', '#44ff44', '#4444ff', '#ffff44'
  ]

  const buildingElements = useMemo(() => {
    const elements: JSX.Element[] = []
    const rng = seededRandom(12345)

    for (const building of buildings) {
      // Calculate distance from player for LOD
      let distance = Infinity
      if (player) {
        const dx = building.position.x - player.position.x
        const dz = building.position.z - player.position.z
        distance = Math.sqrt(dx * dx + dz * dz)
      }
      
      // Skip buildings beyond render distance
      if (distance > qualitySettings.renderDistance) continue
      
      const lodLevel = getLODLevel(distance)
      const config = building.config
      if (!config) continue

      const buildingConfig = getBuildingConfig(building.type)
      const neonColor = neonColors[Math.floor(rng() * neonColors.length)]
      
      // Building base color
      const buildingColors: Record<string, string[]> = {
        concrete: ['#2a2a3a', '#3a3a4a', '#2a3a3a'],
        metal: ['#1a1a2a', '#2a2a3a', '#1a2a2a'],
        glass: ['#0a0a1a', '#1a1a2a', '#0a1a1a'],
        mixed: ['#1a2a2a', '#2a3a2a', '#1a3a3a']
      }
      const textureType = config.textureType || 'concrete'
      const buildingColor = buildingColors[textureType]?.[Math.floor(rng() * buildingColors[textureType].length)] || '#2a2a3a'
      const buildingTexture = buildingTextures[textureType]

      // Main building structure
      elements.push(
        <mesh
          key={`building-${building.id}`}
          position={[building.position.x, building.height / 2, building.position.z]}
          rotation={[0, building.rotation, 0]}
          castShadow
          receiveShadow
          userData={{
            isBuilding: true,
            buildingId: building.id,
            buildingHeight: building.height,
            buildingWidth: building.width,
            buildingDepth: building.depth
          }}
        >
          <boxGeometry args={[building.width, building.height, building.depth]} />
          <meshStandardMaterial
            color={buildingColor}
            metalness={textureType === 'metal' ? 0.9 : textureType === 'glass' ? 0.5 : 0.7}
            roughness={textureType === 'glass' ? 0.1 : textureType === 'metal' ? 0.3 : 0.5}
            emissive={neonColor}
            emissiveIntensity={0.2}
            {...(buildingTexture ? { map: buildingTexture } : {})}
          />
        </mesh>
      )

      // Neon strips (only for high/medium LOD)
      if (buildingConfig.hasNeonStrips && lodLevel !== 'low') {
        const stripCount = lodLevel === 'high' 
          ? Math.floor(building.height / 8) 
          : Math.floor(building.height / 12) // Fewer strips for medium LOD
        for (let s = 0; s < stripCount; s++) {
          const side = rng() > 0.5 ? 1 : -1
          elements.push(
            <mesh
              key={`strip-${building.id}-${s}`}
              position={[
                building.position.x + side * (building.width / 2 - 0.05),
                (s - stripCount / 2) * (building.height / stripCount) + building.height / 2,
                building.position.z
              ]}
            >
              <boxGeometry args={[0.1, building.height / stripCount, building.depth + 0.1]} />
              <meshStandardMaterial
                color={neonColor}
                emissive={neonColor}
                emissiveIntensity={2}
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>
          )
        }
      }

      // Windows (only for high LOD, reduced for medium)
      if (lodLevel === 'high') {
        createBuildingWindows(elements, building, buildingConfig, rng)
      } else if (lodLevel === 'medium') {
        createBuildingWindows(elements, building, buildingConfig, rng, 0.5) // 50% window density
      }

      // Building features (only for high LOD)
      if (lodLevel === 'high') {
        for (const feature of buildingConfig.features) {
          if (shouldHaveFeature(feature, rng)) {
            renderBuildingFeature(elements, building, feature, rng)
          }
        }
      }
    }

    return elements
  }, [buildings, buildingTextures, player, qualitySettings.renderDistance])

  return <>{buildingElements}</>
}

function createBuildingWindows(
  elements: JSX.Element[],
  building: Building,
  config: any,
  rng: () => number,
  densityMultiplier: number = 1.0
): void {
  const windowSize = 1.5
  const windowSpacing = 2
  const rows = Math.floor(building.height / windowSpacing)
  const cols = Math.floor(Math.max(building.width, building.depth) / windowSpacing)

  const windowColors = ['#ffaa44', '#ffffff', '#88ffaa', '#ff88ff']
  const windowColor = windowColors[Math.floor(rng() * windowColors.length)]

  // Front face
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (rng() < config.windowDensity * densityMultiplier) {
        const x = building.position.x
        const y = (row - rows / 2) * windowSpacing + building.height / 2
        const z = building.position.z + building.depth / 2 + 0.01
        const windowX = (col - cols / 2) * windowSpacing

        elements.push(
          <mesh
            key={`window-${building.id}-front-${row}-${col}`}
            position={[x + windowX, y, z]}
            rotation={[0, building.rotation, 0]}
          >
            <planeGeometry args={[windowSize, windowSize]} />
            <meshStandardMaterial
              color={windowColor}
              emissive={windowColor}
              emissiveIntensity={1.5}
            />
          </mesh>
        )
      }
    }
  }
}

function renderBuildingFeature(
  elements: JSX.Element[],
  building: Building,
  feature: any,
  rng: () => number
): void {
  switch (feature.type) {
    case 'antenna':
      const antennaHeight = 5 + rng() * 10
      elements.push(
        <mesh
          key={`antenna-${building.id}`}
          position={[building.position.x, building.height + antennaHeight / 2, building.position.z]}
        >
          <cylinderGeometry args={[0.1, 0.1, antennaHeight, 8]} />
          <meshStandardMaterial
            color="#444444"
            metalness={0.9}
            roughness={0.1}
            emissive="#00ffff"
            emissiveIntensity={0.5}
          />
        </mesh>
      )
      break

    case 'rooftop_structure':
      const rooftopHeight = 2 + rng() * 3
      const rooftopWidth = building.width * 0.7
      const rooftopDepth = building.depth * 0.7
      elements.push(
        <mesh
          key={`rooftop-${building.id}`}
          position={[building.position.x, building.height + rooftopHeight / 2, building.position.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[rooftopWidth, rooftopHeight, rooftopDepth]} />
          <meshStandardMaterial
            color="#1a1a2a"
            metalness={0.8}
            roughness={0.4}
          />
        </mesh>
      )
      break

    case 'signage':
      // Hotel/retail signage
      const signWidth = building.width * 0.8
      const signHeight = 2
      elements.push(
        <mesh
          key={`signage-${building.id}`}
          position={[building.position.x, building.height - signHeight / 2 - 2, building.position.z + building.depth / 2 + 0.1]}
          rotation={[0, building.rotation, 0]}
        >
          <boxGeometry args={[signWidth, signHeight, 0.2]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={1.5}
          />
        </mesh>
      )
      break

    case 'ac_units':
      // AC units on side of building
      const acCount = 2 + Math.floor(rng() * 3)
      for (let i = 0; i < acCount; i++) {
        const acY = building.height * (0.3 + rng() * 0.5)
        const side = rng() > 0.5 ? 1 : -1
        elements.push(
          <mesh
            key={`ac-${building.id}-${i}`}
            position={[
              building.position.x + side * (building.width / 2 + 0.2),
              acY,
              building.position.z
            ]}
          >
            <boxGeometry args={[0.8, 0.6, 0.6]} />
            <meshStandardMaterial
              color="#666666"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        )
      }
      break
  }
}

