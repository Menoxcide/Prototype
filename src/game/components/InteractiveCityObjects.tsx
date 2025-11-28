/**
 * Interactive City Objects Component
 * Handles fountains and gardens with click interactions
 */

import { useMemo, useEffect, useState, useRef } from 'react'
import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import { soundManager } from '../assets/soundManager'
import { useGameStore } from '../store/useGameStore'
import { statusEffectManager } from '../systems/statusEffectSystem'
import { createFloatingNumber } from '../utils/floatingNumbers'
import EnhancedParticleSystem from './EnhancedParticleSystem'
import { useAltKey } from '../hooks/useAltKey'

interface InteractiveObject {
  id: string
  type: 'fountain' | 'garden'
  position: [number, number, number]
  size: number
  onInteract?: () => void
}

interface InteractiveCityObjectsProps {
  citySize: number
  roadNetwork?: any // RoadNetwork type
}

export default function InteractiveCityObjects({ citySize, roadNetwork }: InteractiveCityObjectsProps) {
  const { camera, raycaster } = useThree()
  const [hoveredObject, setHoveredObject] = useState<string | null>(null)
  const isAltPressed = useAltKey()
  const [interactiveObjects, setInteractiveObjects] = useState<InteractiveObject[]>([])
  const objectRefs = useRef<Map<string, THREE.Mesh>>(new Map())
  const mouse = useRef(new THREE.Vector2())
  const [particleEffects, setParticleEffects] = useState<Array<{ id: string; position: [number, number, number]; type: 'spell' | 'heal'; timestamp: number }>>([])
  const [gardenExamine, setGardenExamine] = useState<{ gardenId: string; position: [number, number, number] } | null>(null)
  const { player, addItem } = useGameStore()
  
  // Generate fountain and garden positions
  useEffect(() => {
    const objects: InteractiveObject[] = []
    const rng = seededRandom(78901)
    
    // Generate fountains (place in plazas, intersections)
    const fountainCount = 6
    for (let i = 0; i < fountainCount; i++) {
      let x: number
      let z: number
      let attempts = 0
      let onRoad: boolean
      
      // Place fountains in open areas, avoiding roads
      do {
        x = (rng() - 0.5) * citySize * 0.8
        z = (rng() - 0.5) * citySize * 0.8
        
        // Check if on road (avoid roads)
        onRoad = roadNetwork ? isPointOnRoad(x, z, roadNetwork, 5) : false
        attempts++
      } while (onRoad && attempts < 30)
      
      objects.push({
        id: `fountain-${i}`,
        type: 'fountain',
        position: [x, 0, z],
        size: 3 + rng() * 2,
        onInteract: () => {
          const fountain = objects.find(o => o.id === `fountain-${i}`)
          if (!fountain || !player) return
          
          // Play sound effect
          soundManager.playSound('pickup', 0.8)
          
          // Show particle effect
          setParticleEffects(prev => [...prev, {
            id: `fountain-effect-${Date.now()}`,
            position: [fountain.position[0], fountain.position[1] + 1.5, fountain.position[2]],
            type: 'heal',
            timestamp: Date.now()
          }])
          
          // Apply regeneration buff (30 seconds, 5 HP per second)
          const playerId = player.id || 'player'
          statusEffectManager.applyEffect(playerId, {
            id: `fountain-regen-${Date.now()}`,
            type: 'regeneration',
            startTime: Date.now(),
            duration: 30000, // 30 seconds
            stacks: 1
          })
          
          // Show visual feedback
          createFloatingNumber(
            'Regeneration +',
            { x: fountain.position[0], y: fountain.position[1] + 2, z: fountain.position[2] },
            'buff'
          )
        }
      })
    }
    
    // Generate gardens (place in park areas)
    const gardenCount = 8
    for (let i = 0; i < gardenCount; i++) {
      let x: number
      let z: number
      let attempts = 0
      let onRoad: boolean
      
      do {
        x = (rng() - 0.5) * citySize * 0.8
        z = (rng() - 0.5) * citySize * 0.8
        
        // Check if on road (avoid roads)
        onRoad = roadNetwork ? isPointOnRoad(x, z, roadNetwork, 8) : false
        attempts++
      } while (onRoad && attempts < 30)
      
      objects.push({
        id: `garden-${i}`,
        type: 'garden',
        position: [x, 0, z],
        size: 5 + rng() * 3,
        onInteract: () => {
          const garden = objects.find(o => o.id === `garden-${i}`)
          if (!garden || !player) return
          
          // Show examine UI
          setGardenExamine({
            gardenId: `garden-${i}`,
            position: [garden.position[0], garden.position[1] + 2, garden.position[2]]
          })
          
          // Harvest items (random chance for herbs/plants)
          const harvestChance = Math.random()
          if (harvestChance > 0.5) {
            // 50% chance to harvest something
            const harvestItems = [
              { id: 'herb', count: 1 + Math.floor(Math.random() * 3) },
              { id: 'plant_fiber', count: 2 + Math.floor(Math.random() * 4) },
              { id: 'cyber_flower', count: 1 }
            ]
            const item = harvestItems[Math.floor(Math.random() * harvestItems.length)]
            addItem(item.id, item.count)
            
            // Show feedback
            createFloatingNumber(
              `+${item.count} ${item.id.replace('_', ' ')}`,
              { x: garden.position[0], y: garden.position[1] + 1.5, z: garden.position[2] },
              'status'
            )
            
            soundManager.playSound('pickup', 0.6)
          }
        }
      })
    }
    
    setInteractiveObjects(objects)
  }, [citySize, roadNetwork])
  
  // Load textures for fountains and gardens
  useEffect(() => {
    const loadTextures = async () => {
      // Load Pixellab textures for fountains and gardens
      // Note: Actual texture files should be placed in public/textures/ or loaded via assetManager
      // For now, using procedural materials
      try {
        // Future: Load actual Pixellab-generated textures
        // const fountainTexture = await assetManager.loadTexture('fountain')
        // const gardenTexture = await assetManager.loadTexture('garden')
      } catch (error) {
        console.warn('Could not load Pixellab textures, using procedural materials:', error)
      }
    }
    
    loadTextures()
  }, [])
  
  // Clean up expired particle effects
  useEffect(() => {
    const interval = setInterval(() => {
      setParticleEffects(prev => prev.filter(effect => Date.now() - effect.timestamp < 2000))
    }, 500)
    return () => clearInterval(interval)
  }, [])
  
  // Handle mouse move for hover detection
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])
  
  // Handle clicks
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // Don't handle clicks when Alt is held (user wants to interact with UI)
      if (isAltPressed) return
      
      if (event.button !== 0) return // Only left click
      
      raycaster.setFromCamera(mouse.current, camera)
      const meshes = Array.from(objectRefs.current.values())
      const intersects = raycaster.intersectObjects(meshes, true)
      
      if (intersects.length > 0) {
        const hit = intersects[0]
        const objectId = hit.object.userData?.objectId
        
        if (objectId) {
          const obj = interactiveObjects.find(o => o.id === objectId)
          if (obj?.onInteract) {
            obj.onInteract()
          }
        }
      }
    }
    
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [camera, raycaster, interactiveObjects, isAltPressed])
  
  // Update hover state each frame
  useFrame(() => {
    raycaster.setFromCamera(mouse.current, camera)
    const meshes = Array.from(objectRefs.current.values())
    const intersects = raycaster.intersectObjects(meshes, true)
    
    let newHovered: string | null = null
    if (intersects.length > 0) {
      const hit = intersects[0]
      newHovered = hit.object.userData?.objectId || null
    }
    
    if (newHovered !== hoveredObject) {
      setHoveredObject(newHovered)
    }
  })
  
  // Render interaction prompt indicator
  const interactionPrompt = useMemo(() => {
    if (!hoveredObject) return null
    
    const obj = interactiveObjects.find(o => o.id === hoveredObject)
    if (!obj) return null
    
    return (
      <mesh position={[obj.position[0], obj.position[1] + 3, obj.position[2]]}>
        <ringGeometry args={[obj.size * 0.6, obj.size * 0.65, 32]} />
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
    )
  }, [hoveredObject, interactiveObjects])
  
  // Render fountains and gardens
  const objectElements = useMemo(() => {
    return interactiveObjects.map(obj => {
      const isHovered = hoveredObject === obj.id
      
      if (obj.type === 'fountain') {
        return (
          <group key={obj.id} position={obj.position}>
            {/* Fountain base */}
            <mesh
              ref={(el) => {
                if (el) objectRefs.current.set(obj.id, el as THREE.Mesh)
              }}
              castShadow
              receiveShadow
              userData={{ objectId: obj.id, type: 'fountain', isCollidable: true, isTerrainObject: true, objectType: 'fountain' }}
            >
              <cylinderGeometry args={[obj.size * 0.4, obj.size * 0.5, 0.5, 16]} />
              <meshStandardMaterial
                color={isHovered ? '#00ffff' : '#2a2a3a'}
                metalness={0.8}
                roughness={0.3}
                emissive={isHovered ? '#00ffff' : '#0066ff'}
                emissiveIntensity={isHovered ? 0.5 : 0.2}
              />
            </mesh>
            
            {/* Fountain center pillar */}
            <mesh position={[0, 0.75, 0]} castShadow>
              <cylinderGeometry args={[obj.size * 0.2, obj.size * 0.2, 1.5, 16]} />
              <meshStandardMaterial
                color="#00ffff"
                metalness={0.9}
                roughness={0.1}
                emissive="#00ffff"
                emissiveIntensity={0.8}
              />
            </mesh>
            
            {/* Water effect (simple particle effect) */}
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[obj.size * 0.15, obj.size * 0.15, 0.3, 16]} />
              <meshStandardMaterial
                color="#0066ff"
                transparent
                opacity={0.6}
                emissive="#00ffff"
                emissiveIntensity={0.5}
              />
            </mesh>
          </group>
        )
      } else {
        // Garden
        return (
          <group key={obj.id} position={obj.position}>
            {/* Garden bed */}
            <mesh
              ref={(el) => {
                if (el) objectRefs.current.set(obj.id, el as THREE.Mesh)
              }}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
              userData={{ objectId: obj.id, type: 'garden', isCollidable: true, isTerrainObject: true, objectType: 'garden' }}
            >
              <circleGeometry args={[obj.size / 2, 16]} />
              <meshStandardMaterial
                color={isHovered ? '#00ff88' : '#1a3a1a'}
                emissive={isHovered ? '#00ff88' : '#003322'}
                emissiveIntensity={isHovered ? 0.3 : 0.1}
              />
            </mesh>
            
            {/* Decorative plants (neon plants) */}
            {Array.from({ length: 5 + Math.floor(Math.random() * 5) }).map((_, i) => {
              const angle = (i / 5) * Math.PI * 2
              const radius = (obj.size / 2) * (0.5 + Math.random() * 0.3)
              const x = Math.cos(angle) * radius
              const z = Math.sin(angle) * radius
              const height = 0.5 + Math.random() * 0.8
              
              return (
                <mesh key={i} position={[x, height / 2, z]} castShadow>
                  <coneGeometry args={[0.2, height, 8]} />
                  <meshStandardMaterial
                    color="#00ff88"
                    emissive="#00ff88"
                    emissiveIntensity={0.8}
                  />
                </mesh>
              )
            })}
          </group>
        )
      }
    })
  }, [interactiveObjects, hoveredObject])
  
  return (
    <>
      {objectElements}
      {interactionPrompt}
      {/* Particle effects */}
      {particleEffects.map(effect => (
        <EnhancedParticleSystem
          key={effect.id}
          position={effect.position}
          type={effect.type}
          color={effect.type === 'heal' ? '#00ffff' : '#00ff00'}
          count={30}
          duration={1500}
        />
      ))}
      {/* Garden examine UI */}
      {gardenExamine && (
        <mesh position={gardenExamine.position}>
          <ringGeometry args={[1, 1.2, 32]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={0.8}
            transparent
            opacity={0.7}
          />
          {/* Close examine UI on click outside or after delay */}
          <mesh
            onClick={() => setGardenExamine(null)}
            onPointerOver={() => {}}
          >
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </mesh>
      )}
    </>
  )
}

/**
 * Check if a point is on a road
 */
function isPointOnRoad(x: number, z: number, roadNetwork: any, margin: number): boolean {
  if (!roadNetwork?.segments) return false
  
  for (const segment of roadNetwork.segments) {
    const dx = segment.end.x - segment.start.x
    const dz = segment.end.z - segment.start.z
    const lengthSq = dx * dx + dz * dz
    
    if (lengthSq < 0.001) continue
    
    const t = Math.max(0, Math.min(1, ((x - segment.start.x) * dx + (z - segment.start.z) * dz) / lengthSq))
    const projX = segment.start.x + t * dx
    const projZ = segment.start.z + t * dz
    
    const distance = Math.sqrt((x - projX) ** 2 + (z - projZ) ** 2)
    
    if (distance < segment.width / 2 + margin) {
      return true
    }
  }
  
  return false
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

