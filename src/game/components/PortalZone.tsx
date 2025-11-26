/**
 * Portal Zone Component
 * Creates a special area with portals to different biomes
 * Arranged in a circular pattern with decorative elements
 */

import { useMemo } from 'react'
import type { JSX } from 'react'
import { BIOMES } from '../data/biomes'
import BiomePortal from './BiomePortal'
import { useGameStore } from '../store/useGameStore'
import { teleportToBiome } from '../systems/biomeTeleportSystem'

interface PortalZoneProps {
  centerPosition?: [number, number, number]
  radius?: number
  onBiomeEnter?: (biomeId: string) => void
}

export default function PortalZone({ 
  centerPosition = [0, 0, 0],
  radius = 30,
  onBiomeEnter 
}: PortalZoneProps) {
  const { player: _player } = useGameStore()
  
  // Select key biomes to show portals for (one from each level range)
  const selectedBiomes = useMemo(() => {
    const biomeGroups = new Map<number, typeof BIOMES[0]>()
    
    // Group biomes by their level range start
    BIOMES.forEach(biome => {
      const levelStart = biome.levelRange[0]
      if (!biomeGroups.has(levelStart) || Math.random() > 0.5) {
        biomeGroups.set(levelStart, biome)
      }
    })
    
    // Return up to 8 biomes, sorted by level
    return Array.from(biomeGroups.values())
      .sort((a, b) => a.levelRange[0] - b.levelRange[0])
      .slice(0, 8)
  }, [])
  
  // Calculate portal positions in a circle
  const portalPositions = useMemo(() => {
    const positions: Array<[number, number, number]> = []
    const count = selectedBiomes.length
    const angleStep = (Math.PI * 2) / count
    
    selectedBiomes.forEach((_, index) => {
      const angle = index * angleStep
      const x = centerPosition[0] + Math.cos(angle) * radius
      const z = centerPosition[2] + Math.sin(angle) * radius
      positions.push([x, 0.5, z])
    })
    
    return positions
  }, [selectedBiomes, centerPosition, radius])
  
  // Central platform
  const platform = useMemo(() => {
    return (
      <group>
        {/* Main platform */}
        <mesh position={[centerPosition[0], 0, centerPosition[2]]} receiveShadow>
          <cylinderGeometry args={[radius + 5, radius + 5, 0.5, 32]} />
          <meshStandardMaterial
            color="#1a1a2a"
            metalness={0.8}
            roughness={0.3}
            emissive="#00ffff"
            emissiveIntensity={0.2}
          />
        </mesh>
        
        {/* Inner decorative ring */}
        <mesh position={[centerPosition[0], 0.3, centerPosition[2]]}>
          <torusGeometry args={[radius * 0.6, 0.2, 16, 32]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={1.5}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        
        {/* Central pillar/beacon */}
        <mesh position={[centerPosition[0], 3, centerPosition[2]]} castShadow>
          <cylinderGeometry args={[1, 1, 6, 16]} />
          <meshStandardMaterial
            color="#2a2a4a"
            metalness={0.9}
            roughness={0.2}
            emissive="#00ffff"
            emissiveIntensity={0.8}
          />
        </mesh>
        
        {/* Beacon light */}
        <pointLight
          position={[centerPosition[0], 6, centerPosition[2]]}
          intensity={2}
          color="#00ffff"
          distance={20}
          decay={2}
        />
        
        {/* Connecting paths to portals */}
        {portalPositions.map((pos, i) => {
          const dx = pos[0] - centerPosition[0]
          const dz = pos[2] - centerPosition[2]
          const distance = Math.sqrt(dx * dx + dz * dz)
          const angle = Math.atan2(dx, dz)
          
          return (
            <mesh
              key={`path-${i}`}
              position={[
                centerPosition[0] + dx / 2,
                0.1,
                centerPosition[2] + dz / 2
              ]}
              rotation={[0, angle, 0]}
            >
              <boxGeometry args={[distance, 0.2, 1]} />
              <meshStandardMaterial
                color="#2a2a4a"
                metalness={0.7}
                roughness={0.4}
                emissive="#00ffff"
                emissiveIntensity={0.3}
              />
            </mesh>
          )
        })}
      </group>
    )
  }, [centerPosition, radius, portalPositions])
  
  // Decorative elements around the zone
  const decorations = useMemo(() => {
    const elements: JSX.Element[] = []
    const decorationCount = 12
    
    for (let i = 0; i < decorationCount; i++) {
      const angle = (i / decorationCount) * Math.PI * 2
      const dist = radius + 8
      const x = centerPosition[0] + Math.cos(angle) * dist
      const z = centerPosition[2] + Math.sin(angle) * dist
      
      elements.push(
        <mesh
          key={`decoration-${i}`}
          position={[x, 2, z]}
          castShadow
        >
          <boxGeometry args={[0.5, 4, 0.5]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={1.2}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      )
    }
    
    return elements
  }, [centerPosition, radius])

  return (
    <group>
      {/* Central platform and decorations */}
      {platform}
      {decorations}
      
      {/* Biome portals */}
      {selectedBiomes.map((biome, index) => (
        <BiomePortal
          key={biome.id}
          biome={biome}
          position={portalPositions[index]}
          onEnter={() => {
            if (onBiomeEnter) {
              onBiomeEnter(biome.id)
            } else {
              // Teleport player to biome
              teleportToBiome(biome.id)
            }
          }}
        />
      ))}
    </group>
  )
}

