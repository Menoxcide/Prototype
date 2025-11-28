/**
 * Cyberpunk City Environment for MARS://NEXUS
 * Creates a vibrant cyberpunk cityscape with buildings, neon lights, and atmosphere
 */

import { useMemo, useState, useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { JSX } from 'react'
import { assetManager } from '../assets/assetManager'
import { tilesetLoader } from '../assets/tilesetLoader'
import { generateRoadNetwork, type RoadNetwork } from '../utils/roadGenerator'
import InteractiveCityObjects from './InteractiveCityObjects'
import { progressiveLoader } from '../utils/progressiveLoader'
import { useLoadingPhase } from '../hooks/useLoadingPhase'
import { loadingOrchestrator } from '../utils/loadingOrchestrator'
import { chunkManager, type Chunk, type Building } from '../utils/chunkManager'
import { generateCityBlocks, placeBuildingsInBlocks } from '../utils/cityLayout'
import { useGameStore } from '../store/useGameStore'
import BuildingRenderer from './BuildingRenderer'

const CITY_SIZE = 500 // Much bigger city
const BUILDING_COUNT = 80 // More buildings
const WALL_HEIGHT = 15 // Height of perimeter walls
const WALL_THICKNESS = 2 // Thickness of walls

// Seeded random for consistent generation
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

export default function CyberpunkCity() {
  const [groundTexture, setGroundTexture] = useState<THREE.Texture | undefined>(undefined)
  const [roadTexture, setRoadTexture] = useState<THREE.Texture | undefined>(undefined)
  const [grassTexture, setGrassTexture] = useState<THREE.Texture | undefined>(undefined)
  const [pavementTexture, setPavementTexture] = useState<THREE.Texture | undefined>(undefined)
  const [roadNetwork, setRoadNetwork] = useState<RoadNetwork | null>(null)
  const [loadedBuildings, setLoadedBuildings] = useState<number>(0) // Track how many buildings are loaded
  const [chunkBuildings, setChunkBuildings] = useState<Map<string, Building[]>>(new Map())
  const [buildingTextures, setBuildingTextures] = useState<Record<string, THREE.Texture>>({})
  const { phase } = useLoadingPhase()
  const player = useGameStore((state) => state.player)
  
  // Track registered assets to prevent duplicates (React StrictMode double-invocation)
  const registeredAssetsRef = useRef<Set<string>>(new Set())
  
  // Generate road network and city blocks - ASYNC and NON-BLOCKING
  useEffect(() => {
    let cancelled = false
    
    // Use requestIdleCallback to defer heavy work and prevent blocking
    const generateCityAsync = (_deadline?: IdleDeadline) => {
      // Step 1: Generate road network (can be heavy, but necessary first)
      const network = generateRoadNetwork(CITY_SIZE, 0.6, 6, 50)
      if (cancelled) return
      setRoadNetwork(network)
      // Mark road network as loaded in orchestrator
      loadingOrchestrator.markFeatureLoaded('Road Network')
      
      // Step 2: Defer city blocks and building generation to next idle period
      const continueGeneration = () => {
        if (cancelled || !network) return
        
        // Generate city blocks
        const blocks = generateCityBlocks(network, CITY_SIZE, 40)
        if (cancelled) return
        
        // Step 3: Defer building placement to another idle period
        const placeBuildings = () => {
          if (cancelled) return
          
          const rng = seededRandom(12345)
          const placements = placeBuildingsInBlocks(blocks, network, BUILDING_COUNT, rng)
          if (cancelled) return
          
          // Step 4: Group buildings by chunk in chunks to avoid blocking
          const groupBuildings = (deadline?: IdleDeadline) => {
            const buildingsByChunk = new Map<string, Building[]>()
            const maxTimePerFrame = 8 // 8ms per frame
            let processed = 0
            
            for (const placement of placements) {
              // Check if we should yield to prevent blocking
              if (deadline && deadline.timeRemaining() < maxTimePerFrame && processed > 10) {
                // Schedule continuation
                if (typeof requestIdleCallback !== 'undefined') {
                  requestIdleCallback(() => groupBuildings(), { timeout: 50 })
                } else {
                  setTimeout(() => groupBuildings(), 0)
                }
                return
              }
              
              const chunkKey = chunkManager.getChunkKey(placement.position.x, placement.position.z)
              if (!buildingsByChunk.has(chunkKey)) {
                buildingsByChunk.set(chunkKey, [])
              }
              buildingsByChunk.get(chunkKey)!.push(placement.building)
              processed++
            }
            
            if (!cancelled) {
              setChunkBuildings(buildingsByChunk)
            }
          }
          
          // Start grouping with idle callback
          if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(() => groupBuildings(), { timeout: 100 })
          } else {
            // Fallback: use setTimeout to break up work
            setTimeout(() => groupBuildings(), 0)
          }
        }
        
        // Start building placement with idle callback
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => placeBuildings(), { timeout: 100 })
        } else {
          setTimeout(() => placeBuildings(), 0)
        }
      }
      
      // Continue generation with idle callback
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => continueGeneration(), { timeout: 100 })
      } else {
        // Fallback: use setTimeout to defer
        setTimeout(() => continueGeneration(), 0)
      }
    }
    
    // Start generation - defer if possible
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => generateCityAsync(), { timeout: 200 })
    } else {
      // Fallback: use setTimeout to defer at least one frame
      setTimeout(() => generateCityAsync(), 0)
    }
    
    return () => {
      cancelled = true
    }
  }, [])
  
  // Update chunks based on player position
  useEffect(() => {
    if (!player || !roadNetwork) return
    
    const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
    
    // Generate chunk content function
    const generateChunkContent = async (chunk: Chunk) => {
      const chunkKey = `${chunk.x},${chunk.z}`
      const buildings = chunkBuildings.get(chunkKey) || []
      
      chunk.buildings = buildings
      
      // Add roads in this chunk
      // Get chunk world position (using private method access pattern)
      const chunkSize = chunkManager.getChunkSize()
      const chunkWorldPos = {
        x: chunk.x * chunkSize + chunkSize / 2,
        z: chunk.z * chunkSize + chunkSize / 2
      }
      
      chunk.roads = roadNetwork.segments.filter(segment => {
        const midPoint = new THREE.Vector3().addVectors(segment.start, segment.end).multiplyScalar(0.5)
        const distX = Math.abs(midPoint.x - chunkWorldPos.x)
        const distZ = Math.abs(midPoint.z - chunkWorldPos.z)
        return distX < chunkSize / 2 && distZ < chunkSize / 2
      })
      
      // Mark assets for this chunk
      chunk.assets = buildings.map(b => `building-${b.id}`)
    }
    
    // Update chunks
    chunkManager.updateChunks(playerPos, generateChunkContent).catch(err => {
      console.error('Error updating chunks:', err)
    })
  }, [player?.position.x, player?.position.y, player?.position.z, roadNetwork, chunkBuildings])
  
  // Phase 1: Load basic ground texture (critical for entering world)
  useEffect(() => {
    if (phase !== 'phase1' && phase !== 'phase2' && phase !== 'phase3' && phase !== 'complete') {
      return // Wait for phase system
    }

    const loadBasicGround = async () => {
      const textureId = 'cyberpunk-ground-basic'
      
      // Only register if not already registered (prevents React StrictMode duplicates)
      if (!registeredAssetsRef.current.has(textureId)) {
        registeredAssetsRef.current.add(textureId)
        
        // Register with progressive loader
        progressiveLoader.addAsset({
          id: textureId,
          type: 'texture',
          priority: 10,
          critical: true,
          phase: 'phase1'
        })
      }

      try {
        // Create basic procedural texture (fast, no network)
        const textureId_proc = 'cyberpunk-ground'
        let texture = assetManager.getTexture(textureId_proc)
        
        if (!texture) {
          texture = assetManager.generateTexture(
            textureId_proc,
            512,
            512,
            (ctx) => {
              ctx.fillStyle = '#1a0a0a'
              ctx.fillRect(0, 0, 512, 512)
              
              // Simple grid pattern
              ctx.strokeStyle = '#00ffff'
              ctx.lineWidth = 2
              ctx.globalAlpha = 0.6
              
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
            },
            {
              quality: 'high',
              generateMipmaps: true,
              anisotropy: 16
            }
          )
        }
        
        if (texture) {
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          texture.repeat.set(CITY_SIZE / 32, CITY_SIZE / 32)
          setGroundTexture(texture)
        }
        
        // Mark as loaded
        progressiveLoader.markAssetLoaded(textureId, 'phase1')
        // Also mark texture feature as loaded in orchestrator
        loadingOrchestrator.markFeatureLoaded('Textures')
      } catch (error) {
        console.error('Failed to load basic ground texture:', error)
        // Mark as loaded anyway (we have fallback)
        progressiveLoader.markAssetLoaded(textureId, 'phase1')
      }
    }
    
    loadBasicGround()
  }, [phase])

  // Phase 2: Load terrain textures (roads, grass, pavement) and building textures
  useEffect(() => {
    if (phase !== 'phase2' && phase !== 'phase3' && phase !== 'complete') {
      return // Wait for Phase 2
    }

    const loadTerrainTextures = async () => {
      try {
        // Register terrain textures (only if not already registered)
        const terrainTextures = ['roads', 'grass', 'pavement']
        terrainTextures.forEach((type) => {
          const textureId = `terrain-${type}`
          if (!registeredAssetsRef.current.has(textureId)) {
            registeredAssetsRef.current.add(textureId)
            
            progressiveLoader.addAsset({
              id: textureId,
              type: 'texture',
              priority: 5,
              critical: false,
              phase: 'phase2'
            })
          }
        })

        // Load road texture
        const roadTex = await tilesetLoader.loadCyberpunkTerrainTileset('roads')
        setRoadTexture(roadTex)
        progressiveLoader.markAssetLoaded('terrain-roads', 'phase2')
        
        // Load grass texture
        const grassTex = await tilesetLoader.loadCyberpunkTerrainTileset('grass')
        setGrassTexture(grassTex)
        progressiveLoader.markAssetLoaded('terrain-grass', 'phase2')
        
        // Load pavement texture
        const pavementTex = await tilesetLoader.loadCyberpunkTerrainTileset('pavement')
        setPavementTexture(pavementTex)
        progressiveLoader.markAssetLoaded('terrain-pavement', 'phase2')
      } catch (error) {
        console.error('Failed to load terrain textures:', error)
        // Mark as loaded anyway
        const terrainIds = ['terrain-roads', 'terrain-grass', 'terrain-pavement']
        for (const id of terrainIds) {
          progressiveLoader.markAssetLoaded(id, 'phase2')
        }
      }
    }
    
    loadTerrainTextures()
  }, [phase])
  
  // Phase 2: Load building textures and enhanced ground texture
  useEffect(() => {
    if (phase !== 'phase2' && phase !== 'phase3' && phase !== 'complete') {
      return // Wait for Phase 2
    }

    const loadTextures = async () => {
      try {
        // Try to load the Pixellab tileset texture
        // Tileset ID: 8fc041e8-7c8e-4ab3-9340-afc24e2ff398
        const tilesetId = '8fc041e8-7c8e-4ab3-9340-afc24e2ff398'
        const tilesetUrl = `https://api.pixellab.ai/mcp/tilesets/${tilesetId}/image`
        
        // Try loading from Pixellab first
        let texture = assetManager.getTexture('cyberpunk-ground-pixellab')
        if (!texture) {
          try {
            const loader = new THREE.TextureLoader()
            texture = await new Promise<THREE.Texture>((resolve, reject) => {
              loader.load(
                tilesetUrl,
                (loadedTexture) => {
                  loadedTexture.wrapS = THREE.RepeatWrapping
                  loadedTexture.wrapT = THREE.RepeatWrapping
                  loadedTexture.generateMipmaps = true
                  loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
                  loadedTexture.magFilter = THREE.LinearFilter
                  loadedTexture.anisotropy = 16
                  loadedTexture.flipY = false
                  ;(assetManager as any).textures.set('cyberpunk-ground-pixellab', loadedTexture)
                  resolve(loadedTexture)
                },
                undefined,
                (error) => {
                  console.warn('Pixellab tileset not ready yet, using fallback:', error)
                  reject(error)
                }
              )
            })
          } catch (error) {
            // Tileset not ready, use fallback
            texture = undefined
          }
        }
        
        // Fallback to procedural texture if Pixellab texture not available
        const textureId = 'cyberpunk-ground'
        if (!texture) {
          texture = assetManager.getTexture(textureId)
        }
        
        if (!texture) {
          // Create a vibrant cyberpunk ground texture
          texture = assetManager.generateTexture(
            textureId,
            512,
            512,
            (ctx) => {
              // Base dark color
              ctx.fillStyle = '#1a0a0a'
              ctx.fillRect(0, 0, 512, 512)
              
              // Neon grid pattern
              ctx.strokeStyle = '#00ffff'
              ctx.lineWidth = 2
              ctx.globalAlpha = 0.6
              
              // Vertical lines
              for (let x = 0; x < 512; x += 32) {
                ctx.beginPath()
                ctx.moveTo(x, 0)
                ctx.lineTo(x, 512)
                ctx.stroke()
              }
              
              // Horizontal lines
              for (let y = 0; y < 512; y += 32) {
                ctx.beginPath()
                ctx.moveTo(0, y)
                ctx.lineTo(512, y)
                ctx.stroke()
              }
              
              // Add glowing cracks and details
              ctx.globalAlpha = 0.4
              ctx.strokeStyle = '#ff00ff'
              ctx.lineWidth = 1
              
              // Random glowing spots
              for (let i = 0; i < 20; i++) {
                const x = Math.random() * 512
                const y = Math.random() * 512
                const radius = 5 + Math.random() * 10
                
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
                gradient.addColorStop(0, '#00ffff')
                gradient.addColorStop(1, 'transparent')
                
                ctx.fillStyle = gradient
                ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
              }
              
              // Add some colorful accents
              ctx.globalAlpha = 0.3
              const accentColors = ['#ff00ff', '#00ff88', '#ffff00', '#ff0088']
              for (let i = 0; i < 15; i++) {
                const x = Math.random() * 512
                const y = Math.random() * 512
                const size = 3 + Math.random() * 5
                
                ctx.fillStyle = accentColors[Math.floor(Math.random() * accentColors.length)]
                ctx.fillRect(x, y, size, size)
              }
            },
            {
              quality: 'high',
              generateMipmaps: true,
              anisotropy: 16
            }
          )
        }
        
        if (texture) {
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          texture.repeat.set(CITY_SIZE / 32, CITY_SIZE / 32) // Repeat every 32 units
          setGroundTexture(texture)
        }
        
        // Create multiple building textures with different styles
        const textureTypes: Array<'concrete' | 'metal' | 'glass' | 'mixed'> = ['concrete', 'metal', 'glass', 'mixed']
        const textures: Record<string, THREE.Texture> = {}
        
        for (const textureType of textureTypes) {
          const buildingTextureId = `cyberpunk-building-${textureType}`
          let buildingTex = assetManager.getTexture(buildingTextureId)
          
          if (!buildingTex) {
            buildingTex = assetManager.generateTexture(
              buildingTextureId,
              256,
              256,
              (ctx) => {
                // Base color varies by texture type
                const baseColors: Record<string, string> = {
                  concrete: '#2a2a3a',
                  metal: '#1a1a2a',
                  glass: '#0a0a1a',
                  mixed: '#1a2a2a'
                }
                
                ctx.fillStyle = baseColors[textureType]
                ctx.fillRect(0, 0, 256, 256)
                
                // Different patterns based on texture type
                if (textureType === 'concrete') {
                  // Concrete texture with subtle patterns
                  ctx.globalAlpha = 0.3
                  ctx.fillStyle = '#3a3a4a'
                  for (let y = 0; y < 256; y += 8) {
                    for (let x = 0; x < 256; x += 8) {
                      if (Math.random() > 0.7) {
                        ctx.fillRect(x, y, 4, 4)
                      }
                    }
                  }
                } else if (textureType === 'metal') {
                  // Metal texture with horizontal panels
                  ctx.globalAlpha = 0.5
                  ctx.strokeStyle = '#00ffff'
                  ctx.lineWidth = 1
                  for (let y = 0; y < 256; y += 32) {
                    ctx.beginPath()
                    ctx.moveTo(0, y)
                    ctx.lineTo(256, y)
                    ctx.stroke()
                  }
                } else if (textureType === 'glass') {
                  // Glass texture with reflective pattern
                  ctx.globalAlpha = 0.4
                  ctx.fillStyle = '#0066ff'
                  for (let x = 0; x < 256; x += 64) {
                    ctx.fillRect(x, 0, 32, 256)
                  }
                } else {
                  // Mixed texture
                  ctx.globalAlpha = 0.3
                  ctx.fillStyle = '#00ffff'
                  for (let x = 0; x < 256; x += 16) {
                    ctx.fillRect(x, 0, 2, 256)
                  }
                }
                
                // Add subtle window grid pattern (will be overlaid with real windows)
                ctx.globalAlpha = 0.2
                ctx.strokeStyle = '#333344'
                ctx.lineWidth = 1
                for (let y = 16; y < 256; y += 16) {
                  for (let x = 16; x < 256; x += 16) {
                    ctx.strokeRect(x, y, 12, 12)
                  }
                }
              },
              {
                quality: 'high',
                generateMipmaps: true,
                anisotropy: 16
              }
            )
          }
          
          buildingTex.wrapS = THREE.RepeatWrapping
          buildingTex.wrapT = THREE.RepeatWrapping
          textures[textureType] = buildingTex
        }
        
        // Store building textures in state for BuildingRenderer
        setBuildingTextures(textures)
        
        // Building textures are now handled by the chunk system
        // Mark building textures as loaded
        textureTypes.forEach((type) => {
          progressiveLoader.markAssetLoaded(`building-texture-${type}`, 'phase2')
        })
        
      } catch (error) {
        console.error('Failed to load city textures:', error)
      }
    }
    
    loadTextures()
    
    // Periodically check if Pixellab textures are ready
    const checkPixellabTextures = setInterval(async () => {
      try {
        // Try to load Pixellab tileset
        const tilesetId = '8fc041e8-7c8e-4ab3-9340-afc24e2ff398'
        const tilesetUrl = `https://api.pixellab.ai/mcp/tilesets/${tilesetId}/image`
        
        const loader = new THREE.TextureLoader()
        loader.load(
          tilesetUrl,
          (loadedTexture) => {
            loadedTexture.wrapS = THREE.RepeatWrapping
            loadedTexture.wrapT = THREE.RepeatWrapping
            loadedTexture.generateMipmaps = true
            loadedTexture.minFilter = THREE.LinearMipmapLinearFilter
            loadedTexture.magFilter = THREE.LinearFilter
            loadedTexture.anisotropy = 16
            loadedTexture.flipY = false
            loadedTexture.repeat.set(CITY_SIZE / 32, CITY_SIZE / 32)
            
            ;(assetManager as any).textures.set('cyberpunk-ground-pixellab', loadedTexture)
            setGroundTexture(loadedTexture)
            console.log('✅ Loaded Pixellab ground texture!')
            clearInterval(checkPixellabTextures)
          },
          undefined,
          () => {
            // Still loading, will try again
          }
        )
      } catch (error) {
        // Not ready yet, will try again
      }
    }, 10000) // Check every 10 seconds
    
    // Cleanup interval on unmount
    return () => clearInterval(checkPixellabTextures)
  }, [phase])

  // Progressive building generation - load buildings incrementally in Phase 2
  useEffect(() => {
    if (phase !== 'phase2' && phase !== 'phase3' && phase !== 'complete') {
      return // Wait for Phase 2
    }

    if (loadedBuildings >= BUILDING_COUNT) {
      return // All buildings loaded
    }

    // Use requestIdleCallback to spread building generation over time
    const generateBuildingsProgressively = (deadline: IdleDeadline) => {
      let generated = 0
      const maxTimePerFrame = 5 // 5ms per frame
      const buildingsPerFrame = 2 // Generate 2 buildings per frame

      while (
        loadedBuildings + generated < BUILDING_COUNT &&
        generated < buildingsPerFrame &&
        deadline.timeRemaining() > maxTimePerFrame
      ) {
        generated++
      }

      if (generated > 0) {
        setLoadedBuildings(prev => Math.min(prev + generated, BUILDING_COUNT))
      }

      // Continue if more buildings to generate
      if (loadedBuildings + generated < BUILDING_COUNT) {
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(generateBuildingsProgressively, { timeout: 100 })
        } else {
          // Fallback for browsers without requestIdleCallback
          setTimeout(() => {
            generateBuildingsProgressively({ timeRemaining: () => 5 } as IdleDeadline)
          }, 16) // ~60fps
        }
      }
    }

    // Start progressive generation
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(generateBuildingsProgressively, { timeout: 100 })
    } else {
      // Fallback
      setTimeout(() => {
        generateBuildingsProgressively({ timeRemaining: () => 5 } as IdleDeadline)
      }, 16)
    }
  }, [phase, loadedBuildings])
  
  // Get buildings from loaded chunks
  const chunkBuildingsList = useMemo(() => {
    const allBuildings: Building[] = []
    const loadedChunks = chunkManager.getLoadedChunks()
    
    for (const chunk of loadedChunks) {
      allBuildings.push(...chunk.buildings)
    }
    
    return allBuildings
  }, [chunkBuildings, phase, player?.position.x, player?.position.z])
  
  // Generate road meshes with markings
  const roadMeshes = useMemo(() => {
    if (!roadNetwork || !roadTexture) return []
    
    const elements: JSX.Element[] = []
    
    for (const segment of roadNetwork.segments) {
      const length = segment.start.distanceTo(segment.end)
      const midPoint = new THREE.Vector3().addVectors(segment.start, segment.end).multiplyScalar(0.5)
      const direction = new THREE.Vector3().subVectors(segment.end, segment.start).normalize()
      const angle = Math.atan2(direction.x, direction.z)
      
      // Main road surface (raised to 0.1 for visibility)
      elements.push(
        <mesh
          key={`road-${segment.start.x}-${segment.start.z}`}
          position={[midPoint.x, 0.1, midPoint.z]}
          rotation={[-Math.PI / 2, 0, angle]}
          receiveShadow
          renderOrder={1}
        >
          <planeGeometry args={[segment.width, length]} />
          <meshStandardMaterial
            map={roadTexture}
            color="#1a1a2a"
            roughness={0.8}
            metalness={0.2}
          />
        </mesh>
      )
      
      // Yellow center line for grid roads
      if (segment.type === 'grid' && segment.width >= 6) {
        const lineWidth = 0.3
        const dashLength = 2
        const dashGap = 2
        const dashCount = Math.floor(length / (dashLength + dashGap))
        
        for (let i = 0; i < dashCount; i++) {
          const dashPos = -length / 2 + (dashLength + dashGap) * i + dashLength / 2
          elements.push(
            <mesh
              key={`road-line-${segment.start.x}-${segment.start.z}-${i}`}
              position={[midPoint.x + Math.cos(angle) * dashPos, 0.11, midPoint.z + Math.sin(angle) * dashPos]}
              rotation={[-Math.PI / 2, 0, angle]}
              renderOrder={2}
            >
              <planeGeometry args={[lineWidth, dashLength]} />
              <meshStandardMaterial
                color="#ffff00"
                emissive="#ffff00"
                emissiveIntensity={0.5}
              />
            </mesh>
          )
        }
      }
      
      // Road edge lines
      const edgeLineWidth = 0.2
      const edgeOffset = segment.width / 2 - edgeLineWidth / 2
      const edgeColor = '#ffffff'
      
      // Left edge
      elements.push(
        <mesh
          key={`road-edge-left-${segment.start.x}-${segment.start.z}`}
          position={[midPoint.x, 0.11, midPoint.z]}
          rotation={[-Math.PI / 2, 0, angle]}
          renderOrder={2}
        >
          <planeGeometry args={[edgeLineWidth, length]} />
          <meshStandardMaterial
            color={edgeColor}
            emissive={edgeColor}
            emissiveIntensity={0.3}
          />
        </mesh>
      )
      
      // Right edge (offset by road width)
      const rightEdgePos = new THREE.Vector3(0, 0, edgeOffset)
      rightEdgePos.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
      elements.push(
        <mesh
          key={`road-edge-right-${segment.start.x}-${segment.start.z}`}
          position={[midPoint.x + rightEdgePos.x, 0.11, midPoint.z + rightEdgePos.z]}
          rotation={[-Math.PI / 2, 0, angle]}
          renderOrder={2}
        >
          <planeGeometry args={[edgeLineWidth, length]} />
          <meshStandardMaterial
            color={edgeColor}
            emissive={edgeColor}
            emissiveIntensity={0.3}
          />
        </mesh>
      )
    }
    
    // Add crosswalks at intersections
    for (const intersection of roadNetwork.intersections) {
      const crosswalkSize = 3
      const crosswalkWidth = 0.5
      
      // Crosswalk lines (perpendicular to roads)
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2
        const offset = -crosswalkSize / 2 + (crosswalkSize / 4) * (i % 2 === 0 ? 1 : -1)
        const pos = new THREE.Vector3(
          intersection.x + Math.cos(angle) * offset,
          0.11,
          intersection.z + Math.sin(angle) * offset
        )
        
        elements.push(
          <mesh
            key={`crosswalk-${intersection.x}-${intersection.z}-${i}`}
            position={[pos.x, pos.y, pos.z]}
            rotation={[-Math.PI / 2, 0, angle + Math.PI / 2]}
            renderOrder={2}
          >
            <planeGeometry args={[crosswalkWidth, crosswalkSize / 2]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.4}
            />
          </mesh>
        )
      }
    }
    
    return elements
  }, [roadNetwork, roadTexture])
  
  // Generate terrain variation meshes (grass and pavement)
  const terrainMeshes = useMemo(() => {
    if (!roadNetwork) return []
    
    const elements: JSX.Element[] = []
    const rng = seededRandom(99999)
    
    // Generate grass patches (parks, open areas)
    const grassPatchCount = 15
    for (let i = 0; i < grassPatchCount; i++) {
      let x: number
      let z: number
      let attempts = 0
      let onRoad: boolean
      
      do {
        x = (rng() - 0.5) * CITY_SIZE * 0.8
        z = (rng() - 0.5) * CITY_SIZE * 0.8
        
        // Check if on road (avoid roads)
        onRoad = isPointOnRoad(x, z, roadNetwork, 8)
        attempts++
      } while (onRoad && attempts < 30)
      
      if (attempts < 30 && grassTexture) {
        const size = 15 + rng() * 10
        elements.push(
          <mesh
            key={`grass-${i}`}
            position={[x, 0.01, z]}
            rotation={[-Math.PI / 2, 0, 0]}
            receiveShadow
          >
            <circleGeometry args={[size, 16]} />
            <meshStandardMaterial
              map={grassTexture}
              color="#1a3a1a"
              emissive="#003322"
              emissiveIntensity={0.1}
            />
          </mesh>
        )
      }
    }
    
    // Generate pavement areas (sidewalks around buildings, plazas)
    const pavementPatchCount = 20
    for (let i = 0; i < pavementPatchCount; i++) {
      let x: number
      let z: number
      let attempts = 0
      let onRoad: boolean
      
      do {
        x = (rng() - 0.5) * CITY_SIZE * 0.8
        z = (rng() - 0.5) * CITY_SIZE * 0.8
        
        // Check if on road (avoid roads but can be near them)
        onRoad = isPointOnRoad(x, z, roadNetwork, 3)
        attempts++
      } while (onRoad && attempts < 30)
      
      if (attempts < 30 && pavementTexture) {
        const size = 8 + rng() * 6
        elements.push(
          <mesh
            key={`pavement-${i}`}
            position={[x, 0.01, z]}
            rotation={[-Math.PI / 2, 0, rng() * Math.PI * 2]}
            receiveShadow
          >
            <boxGeometry args={[size, 0.1, size]} />
            <meshStandardMaterial
              map={pavementTexture}
              color="#3a3a3a"
              roughness={0.8}
              metalness={0.1}
            />
          </mesh>
        )
      }
    }
    
    return elements
  }, [roadNetwork, grassTexture, pavementTexture])
  
  // Helper function to check if point is on road
  function isPointOnRoad(x: number, z: number, network: RoadNetwork, margin: number): boolean {
    for (const segment of network.segments) {
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
  
  // Street grid - raised slightly to prevent z-fighting with ground (keep for now, may remove later)
  // Disabled for now - using road meshes instead
  /*
  const streetGrid = useMemo(() => {
    const grid = new THREE.GridHelper(
      CITY_SIZE,
      Math.floor(CITY_SIZE / 10),
      '#ff6b35', // Mars orange
      '#2a1a0a'  // Mars dark red-brown
    )
    // Raise grid slightly above ground to prevent z-fighting
    grid.position.y = 0.05
    return grid
  }, [])
  */

  // Perimeter walls to prevent falling off
  const walls = useMemo(() => {
    const wallElements: JSX.Element[] = []
    const halfSize = CITY_SIZE / 2
    const wallPositions = [
      // North wall
      { pos: [0, WALL_HEIGHT / 2, halfSize], size: [CITY_SIZE, WALL_HEIGHT, WALL_THICKNESS] },
      // South wall
      { pos: [0, WALL_HEIGHT / 2, -halfSize], size: [CITY_SIZE, WALL_HEIGHT, WALL_THICKNESS] },
      // East wall
      { pos: [halfSize, WALL_HEIGHT / 2, 0], size: [WALL_THICKNESS, WALL_HEIGHT, CITY_SIZE] },
      // West wall
      { pos: [-halfSize, WALL_HEIGHT / 2, 0], size: [WALL_THICKNESS, WALL_HEIGHT, CITY_SIZE] },
    ]
    
    wallPositions.forEach((wall, i) => {
      // Outer wall (visible)
      wallElements.push(
        <mesh
          key={`wall-outer-${i}`}
          position={wall.pos as [number, number, number]}
          castShadow
          receiveShadow
          userData={{ isWall: true, wallId: i }}
        >
          <boxGeometry args={wall.size as [number, number, number]} />
          <meshStandardMaterial
            color="#1a1a2a"
            metalness={0.8}
            roughness={0.3}
            emissive="#00ffff"
            emissiveIntensity={0.4}
          />
        </mesh>
      )
      
      // Inner neon strip
      const neonStripPos = [...wall.pos] as [number, number, number]
      if (i < 2) {
        // North/South walls - adjust Z
        neonStripPos[2] += (i === 0 ? -0.6 : 0.6)
      } else {
        // East/West walls - adjust X
        neonStripPos[0] += (i === 2 ? -0.6 : 0.6)
      }
      
      wallElements.push(
        <mesh
          key={`wall-neon-${i}`}
          position={neonStripPos}
        >
          <boxGeometry args={[
            i < 2 ? CITY_SIZE : WALL_THICKNESS * 0.3,
            WALL_HEIGHT * 0.8,
            i < 2 ? 0.2 : CITY_SIZE
          ]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={2}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      )
    })
    
    return wallElements
  }, [])

  // Generate pseudo-advertisements for billboards (NYC style)
  const generateBillboardAd = (rng: () => number): { text: string; colors: string[]; style: 'bright' | 'neon' | 'corporate' } => {
    const ads = [
      // Tech/Corp ads
      { text: 'NEX://CORP', colors: ['#00ffff', '#0000ff'], style: 'neon' as const },
      { text: 'QUANTUM\nTECH', colors: ['#ff00ff', '#ff0088'], style: 'neon' as const },
      { text: 'VOID\nNETWORKS', colors: ['#00ff88', '#00ffff'], style: 'bright' as const },
      { text: 'CYBER\nSOLUTIONS', colors: ['#ffff00', '#ffaa00'], style: 'neon' as const },
      { text: 'NEON\nDRINKS', colors: ['#ff0088', '#ff00ff'], style: 'bright' as const },
      { text: 'DATA\nSTREAM', colors: ['#00ffff', '#0088ff'], style: 'corporate' as const },
      { text: 'VOID\nEXPRESS', colors: ['#ff8800', '#ff4400'], style: 'bright' as const },
      { text: 'CYBER\nFOOD', colors: ['#88ff00', '#00ff88'], style: 'neon' as const },
      { text: 'QUANTUM\nENERGY', colors: ['#ff00ff', '#8800ff'], style: 'neon' as const },
      { text: 'NEON\nCITY', colors: ['#00ffff', '#ffffff'], style: 'bright' as const },
      { text: 'VOID\nCOMM', colors: ['#ffff00', '#ffaa00'], style: 'corporate' as const },
      { text: 'CYBER\nGEAR', colors: ['#ff0088', '#ff44aa'], style: 'bright' as const },
      { text: 'NEX\nWIRELESS', colors: ['#0088ff', '#00aaff'], style: 'corporate' as const },
      { text: 'QUANTUM\nSHOP', colors: ['#ff00ff', '#aa00ff'], style: 'neon' as const },
      { text: 'NEON\nGAMING', colors: ['#00ff88', '#00ffaa'], style: 'bright' as const },
    ]
    return ads[Math.floor(rng() * ads.length)]
  }

  // Generate billboard texture
  const generateBillboardTexture = (ad: ReturnType<typeof generateBillboardAd>, width: number, height: number): THREE.Texture => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    
    // Background
    const bgGradient = ctx.createLinearGradient(0, 0, width, height)
    bgGradient.addColorStop(0, '#0a0a1a')
    bgGradient.addColorStop(1, '#1a1a2a')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, width, height)
    
    // Add neon border
    ctx.strokeStyle = ad.colors[0]
    ctx.lineWidth = 4
    ctx.globalAlpha = 0.8
    ctx.strokeRect(2, 2, width - 4, height - 4)
    
    // Text
    ctx.fillStyle = ad.colors[0]
    ctx.font = `bold ${height * 0.15}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.globalAlpha = 1
    
    // Add glow effect
    ctx.shadowColor = ad.colors[0]
    ctx.shadowBlur = 20
    
    const lines = ad.text.split('\n')
    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, height / 2 + (i - (lines.length - 1) / 2) * height * 0.15)
    })
    
    // Add accent elements
    ctx.globalAlpha = 0.3
    ctx.fillStyle = ad.colors[1]
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      ctx.fillRect(x, y, 2, 20)
    }
    
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    return texture
  }

  // Generate city terrain objects (billboards, street furniture, etc.)
  const cityObjects = useMemo(() => {
    const elements: JSX.Element[] = []
    const rng = seededRandom(54321) // Different seed from buildings
    
    // Street grid spacing for logical placement
    const gridSize = Math.ceil(Math.sqrt(BUILDING_COUNT))
    const spacing = CITY_SIZE / gridSize
    const halfSize = CITY_SIZE / 2
    
    // Track object positions to avoid overlap
    const objectPositions: Array<{ x: number; z: number; radius: number }> = []
    const isTooClose = (x: number, z: number, radius: number): boolean => {
      // Check overlap with other objects
      if (objectPositions.some(pos => {
        const dist = Math.sqrt((pos.x - x) ** 2 + (pos.z - z) ** 2)
        return dist < pos.radius + radius + 2
      })) {
        return true
      }
      
      // Check if on road (avoid placing on roads)
      if (roadNetwork && isPointOnRoad(x, z, roadNetwork, radius + 2)) {
        return true
      }
      
      return false
    }
    
    // Generate billboards (NYC style - tall and prominent)
    const billboardCount = Math.floor(BUILDING_COUNT * 0.15) // ~12 billboards
    for (let i = 0; i < billboardCount; i++) {
      let attempts = 0
      let x: number, z: number
      
      // Place billboards near streets or between buildings
      do {
        const gridX = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        const gridZ = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        x = gridX * spacing + (rng() - 0.5) * spacing * 0.3
        z = gridZ * spacing + (rng() - 0.5) * spacing * 0.3
        attempts++
      } while (isTooClose(x, z, 5) && attempts < 20)
      
      if (attempts >= 20) continue
      
      objectPositions.push({ x, z, radius: 5 })
      
      // Billboard dimensions (NYC style - tall vertical billboards)
      const billboardWidth = 4 + rng() * 3
      const billboardHeight = 8 + rng() * 6
      const billboardDepth = 0.3
      const poleHeight = 2 + rng() * 3
      
      // Generate ad
      const ad = generateBillboardAd(rng)
      const billboardTexture = generateBillboardTexture(ad, 512, 1024)
      
      // Billboard rotation (face streets)
      const rotation = Math.floor(rng() * 4) * Math.PI / 2
      
      // Support pole
      elements.push(
        <mesh
          key={`billboard-pole-${i}`}
          position={[x, poleHeight / 2, z]}
          castShadow
          userData={{ isCollidable: true, isTerrainObject: true, objectType: 'billboard' }}
        >
          <cylinderGeometry args={[0.15, 0.15, poleHeight, 8]} />
          <meshStandardMaterial
            color="#444444"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      )
      
      // Billboard face
      elements.push(
        <mesh
          key={`billboard-${i}`}
          position={[x, poleHeight + billboardHeight / 2, z]}
          rotation={[0, rotation, 0]}
          castShadow
          receiveShadow
          userData={{ isCollidable: true, isTerrainObject: true, objectType: 'billboard' }}
        >
          <boxGeometry args={[billboardWidth, billboardHeight, billboardDepth]} />
          <meshStandardMaterial
            map={billboardTexture}
            emissive={ad.colors[0]}
            emissiveIntensity={0.5}
            metalness={0.3}
            roughness={0.6}
          />
        </mesh>
      )
      
      // Neon frame around billboard
      elements.push(
        <mesh
          key={`billboard-frame-${i}`}
          position={[x, poleHeight + billboardHeight / 2, z]}
          rotation={[0, rotation, 0]}
        >
          <boxGeometry args={[billboardWidth + 0.2, billboardHeight + 0.2, billboardDepth + 0.05]} />
          <meshStandardMaterial
            color={ad.colors[0]}
            emissive={ad.colors[0]}
            emissiveIntensity={1.5}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )
    }
    
    // Generate streetlights
    const streetlightCount = Math.floor(BUILDING_COUNT * 0.8) // ~64 streetlights
    for (let i = 0; i < streetlightCount; i++) {
      let attempts = 0
      let x: number, z: number
      
      // Place along streets
      do {
        const gridX = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        const gridZ = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        x = gridX * spacing + (rng() - 0.5) * spacing * 0.2
        z = gridZ * spacing + (rng() - 0.5) * spacing * 0.2
        attempts++
      } while (isTooClose(x, z, 2) && attempts < 10)
      
      if (attempts >= 10) continue
      
      objectPositions.push({ x, z, radius: 2 })
      
      const poleHeight = 4 + rng() * 2
      const lightColor = rng() > 0.5 ? '#ffaa44' : '#ffffff'
      
      // Pole
      elements.push(
        <mesh
          key={`streetlight-pole-${i}`}
          position={[x, poleHeight / 2, z]}
          castShadow
        >
          <cylinderGeometry args={[0.08, 0.08, poleHeight, 8]} />
          <meshStandardMaterial
            color="#333333"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      )
      
      // Light fixture
      elements.push(
        <mesh
          key={`streetlight-fixture-${i}`}
          position={[x, poleHeight, z]}
        >
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial
            color={lightColor}
            emissive={lightColor}
            emissiveIntensity={2}
          />
        </mesh>
      )
      
      // Light point
      elements.push(
        <pointLight
          key={`streetlight-light-${i}`}
          position={[x, poleHeight, z]}
          color={lightColor}
          intensity={0.8}
          distance={15}
          decay={2}
        />
      )
    }
    
    // Generate benches
    const benchCount = Math.floor(BUILDING_COUNT * 0.3) // ~24 benches
    for (let i = 0; i < benchCount; i++) {
      let attempts = 0
      let x: number, z: number
      
      do {
        const gridX = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        const gridZ = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        x = gridX * spacing + (rng() - 0.5) * spacing * 0.3
        z = gridZ * spacing + (rng() - 0.5) * spacing * 0.3
        attempts++
      } while (isTooClose(x, z, 1.5) && attempts < 10)
      
      if (attempts >= 10) continue
      
      objectPositions.push({ x, z, radius: 1.5 })
      
      const rotation = rng() * Math.PI * 2
      const benchColor = rng() > 0.5 ? '#2a2a3a' : '#1a1a2a'
      
      // Bench seat
      elements.push(
        <mesh
          key={`bench-seat-${i}`}
          position={[x, 0.5, z]}
          rotation={[0, rotation, 0]}
          castShadow
          receiveShadow
          userData={{ isCollidable: true, isTerrainObject: true, objectType: 'bench' }}
        >
          <boxGeometry args={[3, 0.3, 0.8]} />
          <meshStandardMaterial
            color={benchColor}
            metalness={0.7}
            roughness={0.5}
          />
        </mesh>
      )
      
      // Bench back
      elements.push(
        <mesh
          key={`bench-back-${i}`}
          position={[x, 0.8, z - 0.3]}
          rotation={[0, rotation, -Math.PI / 12]}
          castShadow
          receiveShadow
          userData={{ isCollidable: true, isTerrainObject: true, objectType: 'bench' }}
        >
          <boxGeometry args={[3, 0.6, 0.2]} />
          <meshStandardMaterial
            color={benchColor}
            metalness={0.7}
            roughness={0.5}
          />
        </mesh>
      )
      
      // Bench legs
      for (const side of [-1.2, 1.2]) {
        elements.push(
          <mesh
            key={`bench-leg-${i}-${side}`}
            position={[x + side, 0.25, z]}
            rotation={[0, rotation, 0]}
            castShadow
            userData={{ isCollidable: true, isTerrainObject: true, objectType: 'bench' }}
          >
            <boxGeometry args={[0.1, 0.5, 0.1]} />
            <meshStandardMaterial
              color="#444444"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        )
      }
    }
    
    // Generate trash cans
    const trashCanCount = Math.floor(BUILDING_COUNT * 0.4) // ~32 trash cans
    for (let i = 0; i < trashCanCount; i++) {
      let attempts = 0
      let x: number, z: number
      
      do {
        const gridX = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        const gridZ = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        x = gridX * spacing + (rng() - 0.5) * spacing * 0.4
        z = gridZ * spacing + (rng() - 0.5) * spacing * 0.4
        attempts++
      } while (isTooClose(x, z, 1) && attempts < 10)
      
      if (attempts >= 10) continue
      
      objectPositions.push({ x, z, radius: 1 })
      
      const trashColor = rng() > 0.5 ? '#2a2a2a' : '#1a1a1a'
      
      // Trash can body
      elements.push(
        <mesh
          key={`trashcan-${i}`}
          position={[x, 0.7, z]}
          castShadow
          receiveShadow
          userData={{ isCollidable: true, isTerrainObject: true, objectType: 'trashcan' }}
        >
          <cylinderGeometry args={[0.4, 0.4, 1.4, 16]} />
          <meshStandardMaterial
            color={trashColor}
            metalness={0.8}
            roughness={0.4}
          />
        </mesh>
      )
      
      // Trash can lid
      elements.push(
        <mesh
          key={`trashcan-lid-${i}`}
          position={[x, 1.5, z]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[0.42, 0.42, 0.1, 16]} />
          <meshStandardMaterial
            color="#333333"
            metalness={0.9}
            roughness={0.3}
          />
        </mesh>
      )
    }
    
    // Generate traffic lights (intersection-style)
    const trafficLightCount = Math.floor(BUILDING_COUNT * 0.1) // ~8 traffic lights
    for (let i = 0; i < trafficLightCount; i++) {
      let attempts = 0
      let x: number, z: number
      
      // Place at intersections
      do {
        const gridX = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        const gridZ = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        x = Math.round((gridX * spacing) / spacing) * spacing
        z = Math.round((gridZ * spacing) / spacing) * spacing
        attempts++
      } while (isTooClose(x, z, 3) && attempts < 10)
      
      if (attempts >= 10) continue
      
      objectPositions.push({ x, z, radius: 3 })
      
      const poleHeight = 5
      
      // Pole
      elements.push(
        <mesh
          key={`trafficlight-pole-${i}`}
          position={[x, poleHeight / 2, z]}
          castShadow
        >
          <cylinderGeometry args={[0.1, 0.1, poleHeight, 8]} />
          <meshStandardMaterial
            color="#333333"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      )
      
      // Traffic light box
      const lightState = Math.floor(rng() * 3) // 0=red, 1=yellow, 2=green
      const lightColors = ['#ff0000', '#ffff00', '#00ff00']
      
      elements.push(
        <mesh
          key={`trafficlight-box-${i}`}
          position={[x, poleHeight - 0.5, z]}
          castShadow
        >
          <boxGeometry args={[0.4, 1.2, 0.4]} />
          <meshStandardMaterial
            color="#222222"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
      )
      
      // Lights (only active one emits)
      const lightY = [0.3, 0, -0.3]
      for (let j = 0; j < 3; j++) {
        const isActive = j === lightState
        elements.push(
          <mesh
            key={`trafficlight-${i}-${j}`}
            position={[x, poleHeight - 0.5 + lightY[j], z]}
          >
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color={lightColors[j]}
              emissive={isActive ? lightColors[j] : '#000000'}
              emissiveIntensity={isActive ? 2 : 0}
            />
          </mesh>
        )
        
        if (isActive) {
          elements.push(
            <pointLight
              key={`trafficlight-light-${i}-${j}`}
              position={[x, poleHeight - 0.5 + lightY[j], z]}
              color={lightColors[j]}
              intensity={0.5}
              distance={10}
              decay={2}
            />
          )
        }
      }
    }
    
    // Generate mailboxes (NYC style blue mailboxes)
    const mailboxCount = Math.floor(BUILDING_COUNT * 0.15) // ~12 mailboxes
    for (let i = 0; i < mailboxCount; i++) {
      let attempts = 0
      let x: number, z: number
      
      do {
        const gridX = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        const gridZ = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        x = gridX * spacing + (rng() - 0.5) * spacing * 0.3
        z = gridZ * spacing + (rng() - 0.5) * spacing * 0.3
        attempts++
      } while (isTooClose(x, z, 1.5) && attempts < 10)
      
      if (attempts >= 10) continue
      
      objectPositions.push({ x, z, radius: 1.5 })
      
      // Mailbox post
      elements.push(
        <mesh
          key={`mailbox-post-${i}`}
          position={[x, 0.4, z]}
          castShadow
        >
          <cylinderGeometry args={[0.08, 0.08, 0.8, 8]} />
          <meshStandardMaterial
            color="#333333"
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      )
      
      // Mailbox body (blue)
      elements.push(
        <mesh
          key={`mailbox-${i}`}
          position={[x, 1.0, z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.6, 0.8, 0.5]} />
          <meshStandardMaterial
            color="#003366"
            metalness={0.6}
            roughness={0.4}
          />
        </mesh>
      )
      
      // Mailbox top
      elements.push(
        <mesh
          key={`mailbox-top-${i}`}
          position={[x, 1.45, z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.65, 0.1, 0.55]} />
          <meshStandardMaterial
            color="#002244"
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      )
    }
    
    // Generate newsstands (NYC style corner newsstands)
    const newsstandCount = Math.floor(BUILDING_COUNT * 0.08) // ~6 newsstands
    for (let i = 0; i < newsstandCount; i++) {
      let attempts = 0
      let x: number, z: number
      
      // Place at street corners
      do {
        const gridX = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        const gridZ = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        x = Math.round((gridX * spacing) / spacing) * spacing + (rng() - 0.5) * 2
        z = Math.round((gridZ * spacing) / spacing) * spacing + (rng() - 0.5) * 2
        attempts++
      } while (isTooClose(x, z, 3) && attempts < 10)
      
      if (attempts >= 10) continue
      
      objectPositions.push({ x, z, radius: 3 })
      const rotation = rng() * Math.PI * 2
      
      // Newsstand base
      elements.push(
        <mesh
          key={`newsstand-base-${i}`}
          position={[x, 0.5, z]}
          rotation={[0, rotation, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.5, 1, 2.5]} />
          <meshStandardMaterial
            color="#2a2a2a"
            metalness={0.5}
            roughness={0.6}
          />
        </mesh>
      )
      
      // Newsstand counter top
      elements.push(
        <mesh
          key={`newsstand-counter-${i}`}
          position={[x, 1.1, z]}
          rotation={[0, rotation, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.5, 0.2, 2.5]} />
          <meshStandardMaterial
            color="#1a1a1a"
            metalness={0.7}
            roughness={0.4}
          />
        </mesh>
      )
      
      // Newsstand roof
      elements.push(
        <mesh
          key={`newsstand-roof-${i}`}
          position={[x, 2.3, z]}
          rotation={[0, rotation, Math.PI / 12]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[2.8, 0.3, 2.8]} />
          <meshStandardMaterial
            color="#3a3a3a"
            metalness={0.6}
            roughness={0.5}
            emissive="#00ffff"
            emissiveIntensity={0.2}
          />
        </mesh>
      )
      
      // Neon sign on newsstand (text not currently used in rendering)
      elements.push(
        <mesh
          key={`newsstand-sign-${i}`}
          position={[x, 1.5, z]}
          rotation={[0, rotation, 0]}
        >
          <boxGeometry args={[1.5, 0.3, 0.1]} />
          <meshStandardMaterial
            color="#00ffff"
            emissive="#00ffff"
            emissiveIntensity={1.5}
          />
        </mesh>
      )
    }
    
    // Generate vehicles (taxis, cars, trucks) - NYC style
    const vehicleCount = Math.floor(BUILDING_COUNT * 0.6) // ~48 vehicles
    for (let i = 0; i < vehicleCount; i++) {
      let attempts = 0
      let x: number, z: number
      let rotation: number
      
      // Place vehicles along streets (aligned to street grid)
      do {
        const gridX = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        const gridZ = Math.floor((rng() * CITY_SIZE - halfSize) / spacing)
        
        // Align to street grid (center of street lanes)
        const streetOffset = rng() > 0.5 ? spacing * 0.25 : -spacing * 0.25 // Left or right lane
        x = gridX * spacing + streetOffset
        z = gridZ * spacing + (rng() - 0.5) * spacing * 0.8
        
        // Determine rotation based on street direction
        const streetDirection = rng() > 0.5
        rotation = streetDirection ? 0 : Math.PI / 2 // North-South or East-West
        
        attempts++
      } while (isTooClose(x, z, 3) && attempts < 15)
      
      if (attempts >= 15) continue
      
      objectPositions.push({ x, z, radius: 3 })
      
      // Determine vehicle type
      const vehicleTypeRoll = rng()
      let vehicleType: 'taxi' | 'car' | 'truck'
      let vehicleColor: string
      let vehicleWidth: number
      let vehicleLength: number
      let vehicleHeight: number
      
      if (vehicleTypeRoll < 0.3) {
        // Taxi (30% - NYC style yellow)
        vehicleType = 'taxi'
        vehicleColor = '#FFD700' // NYC taxi yellow
        vehicleWidth = 1.6 + rng() * 0.3
        vehicleLength = 3.5 + rng() * 0.5
        vehicleHeight = 1.3 + rng() * 0.2
      } else if (vehicleTypeRoll < 0.85) {
        // Regular car (55%)
        vehicleType = 'car'
        const carColors = [
          '#1a1a2a', '#2a2a3a', '#3a1a1a', // Dark colors
          '#ff0088', '#00ffff', '#ff00ff', // Bright neon
          '#0088ff', '#00ff88', '#ffaa00', // Vibrant
          '#ffffff', '#aaaaaa' // Light colors
        ]
        vehicleColor = carColors[Math.floor(rng() * carColors.length)]
        vehicleWidth = 1.5 + rng() * 0.4
        vehicleLength = 3 + rng() * 1
        vehicleHeight = 1.2 + rng() * 0.3
      } else {
        // Truck/Van (15%)
        vehicleType = 'truck'
        const truckColors = ['#1a1a1a', '#2a2a2a', '#003366', '#660000']
        vehicleColor = truckColors[Math.floor(rng() * truckColors.length)]
        vehicleWidth = 2 + rng() * 0.5
        vehicleLength = 4.5 + rng() * 1.5
        vehicleHeight = 2 + rng() * 0.5
      }
      
      // Vehicle body
      elements.push(
        <mesh
          key={`vehicle-body-${i}`}
          position={[x, vehicleHeight / 2 + 0.05, z]}
          rotation={[0, rotation, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[vehicleLength, vehicleHeight, vehicleWidth]} />
          <meshStandardMaterial
            color={vehicleColor}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      )
      
      // Vehicle windows
      const windowColor = '#1a1a2a'
      const windowOpacity = 0.7
      
      // Front windshield
      elements.push(
        <mesh
          key={`vehicle-windshield-front-${i}`}
          position={[x + vehicleLength * 0.35, vehicleHeight * 0.7, z]}
          rotation={[0, rotation, 0]}
        >
          <boxGeometry args={[vehicleLength * 0.3, vehicleHeight * 0.4, vehicleWidth * 0.98]} />
          <meshStandardMaterial
            color={windowColor}
            transparent
            opacity={windowOpacity}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
      )
      
      // Side windows (if it's a car, not a truck)
      if (vehicleType !== 'truck') {
        elements.push(
          <mesh
            key={`vehicle-window-left-${i}`}
            position={[x, vehicleHeight * 0.7, z + vehicleWidth * 0.49]}
            rotation={[0, rotation, 0]}
          >
            <boxGeometry args={[vehicleLength * 0.5, vehicleHeight * 0.4, 0.1]} />
            <meshStandardMaterial
              color={windowColor}
              transparent
              opacity={windowOpacity}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        )
        
        elements.push(
          <mesh
            key={`vehicle-window-right-${i}`}
            position={[x, vehicleHeight * 0.7, z - vehicleWidth * 0.49]}
            rotation={[0, rotation, 0]}
          >
            <boxGeometry args={[vehicleLength * 0.5, vehicleHeight * 0.4, 0.1]} />
            <meshStandardMaterial
              color={windowColor}
              transparent
              opacity={windowOpacity}
              metalness={0.9}
              roughness={0.1}
            />
          </mesh>
        )
      }
      
      // Wheels
      const wheelRadius = 0.3
      const wheelWidth = 0.2
      const wheelY = wheelRadius + 0.05
      const wheelPositions = [
        // Front left
        { x: vehicleLength * 0.3, z: vehicleWidth * 0.5 },
        // Front right
        { x: vehicleLength * 0.3, z: -vehicleWidth * 0.5 },
        // Rear left
        { x: -vehicleLength * 0.3, z: vehicleWidth * 0.5 },
        // Rear right
        { x: -vehicleLength * 0.3, z: -vehicleWidth * 0.5 },
      ]
      
      wheelPositions.forEach((wheelPos, wheelIdx) => {
        // Calculate wheel position relative to vehicle center
        const relX = wheelPos.x
        const relZ = wheelPos.z
        
        // Rotate position based on vehicle rotation
        const cosR = Math.cos(rotation)
        const sinR = Math.sin(rotation)
        const wheelX = x + relX * cosR - relZ * sinR
        const wheelZ = z + relX * sinR + relZ * cosR
        
        elements.push(
          <mesh
            key={`vehicle-wheel-${i}-${wheelIdx}`}
            position={[wheelX, wheelY, wheelZ]}
            rotation={[0, rotation + Math.PI / 2, 0]} // Perpendicular to vehicle
            castShadow
          >
            <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 16]} />
            <meshStandardMaterial
              color="#1a1a1a"
              metalness={0.9}
              roughness={0.2}
            />
          </mesh>
        )
        
        // Wheel rim
        const rimOffset = wheelWidth * 0.51
        const rimX = wheelX + rimOffset * sinR
        const rimZ = wheelZ - rimOffset * cosR
        
        elements.push(
          <mesh
            key={`vehicle-wheel-rim-${i}-${wheelIdx}`}
            position={[rimX, wheelY, rimZ]}
            rotation={[0, rotation + Math.PI / 2, 0]}
          >
            <cylinderGeometry args={[wheelRadius * 0.6, wheelRadius * 0.6, wheelWidth * 0.3, 16]} />
            <meshStandardMaterial
              color="#444444"
              metalness={0.95}
              roughness={0.1}
            />
          </mesh>
        )
      })
      
      // Taxi sign (for taxis only)
      if (vehicleType === 'taxi') {
        elements.push(
          <mesh
            key={`taxi-sign-${i}`}
            position={[x + vehicleLength * 0.4, vehicleHeight * 0.95, z]}
            rotation={[0, rotation, 0]}
          >
            <boxGeometry args={[vehicleLength * 0.2, vehicleHeight * 0.15, vehicleWidth * 0.3]} />
            <meshStandardMaterial
              color="#ff0000"
              emissive="#ff0000"
              emissiveIntensity={0.8}
            />
          </mesh>
        )
        
        // Checker pattern on taxi (NYC style)
        elements.push(
          <mesh
            key={`taxi-checker-${i}`}
            position={[x - vehicleLength * 0.2, vehicleHeight * 0.55, z]}
            rotation={[0, rotation, 0]}
          >
            <boxGeometry args={[vehicleLength * 0.15, vehicleHeight * 0.1, vehicleWidth * 0.98]} />
            <meshStandardMaterial
              color="#000000"
              metalness={0.5}
              roughness={0.5}
            />
          </mesh>
        )
      }
      
      // Headlights (emissive)
      const headlightIntensity = 0.5 + rng() * 0.5
      const headlightPositions = [
        { x: vehicleLength * 0.45, z: vehicleWidth * 0.3 },
        { x: vehicleLength * 0.45, z: -vehicleWidth * 0.3 },
      ]
      
      headlightPositions.forEach((lightPos, lightIdx) => {
        // Rotate headlight positions based on vehicle rotation
        const cosR = Math.cos(rotation)
        const sinR = Math.sin(rotation)
        const lightX = x + lightPos.x * cosR - lightPos.z * sinR
        const lightZ = z + lightPos.x * sinR + lightPos.z * cosR
        
        elements.push(
          <mesh
            key={`vehicle-headlight-${i}-${lightIdx}`}
            position={[lightX, vehicleHeight * 0.5, lightZ]}
            rotation={[0, rotation, 0]}
          >
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={headlightIntensity}
            />
          </mesh>
        )
        
        // Headlight point light
        elements.push(
          <pointLight
            key={`vehicle-headlight-light-${i}-${lightIdx}`}
            position={[lightX, vehicleHeight * 0.5, lightZ]}
            color="#ffffff"
            intensity={0.3}
            distance={10}
            decay={2}
          />
        )
      })
      
      // Taillights (red)
      const taillightPositions = [
        { x: -vehicleLength * 0.45, z: vehicleWidth * 0.3 },
        { x: -vehicleLength * 0.45, z: -vehicleWidth * 0.3 },
      ]
      
      taillightPositions.forEach((lightPos, lightIdx) => {
        const cosR = Math.cos(rotation)
        const sinR = Math.sin(rotation)
        const lightX = x + lightPos.x * cosR - lightPos.z * sinR
        const lightZ = z + lightPos.x * sinR + lightPos.z * cosR
        
        elements.push(
          <mesh
            key={`vehicle-taillight-${i}-${lightIdx}`}
            position={[lightX, vehicleHeight * 0.4, lightZ]}
            rotation={[0, rotation, 0]}
          >
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshStandardMaterial
              color="#ff0000"
              emissive="#ff0000"
              emissiveIntensity={0.8}
            />
          </mesh>
        )
      })
      
      // License plate (NYC style)
      const platePosX = -vehicleLength * 0.47
      const cosR = Math.cos(rotation)
      const sinR = Math.sin(rotation)
      const plateX = x + platePosX * cosR
      const plateZ = z + platePosX * sinR
      
      elements.push(
        <mesh
          key={`vehicle-plate-${i}`}
          position={[plateX, vehicleHeight * 0.3, plateZ]}
          rotation={[0, rotation, 0]}
        >
          <boxGeometry args={[0.05, vehicleHeight * 0.15, vehicleWidth * 0.3]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.3}
          />
        </mesh>
      )
    }
    
    return elements
  }, [roadNetwork])

  // Ground plane with texture - always render on mobile and desktop
  const groundMaterial = useMemo(() => {
    // Only include map if texture is available (THREE.js doesn't accept undefined)
    const materialConfig: any = {
      color: '#1a0a0a',
      roughness: 0.7,
      metalness: 0.3,
      emissive: '#00ffff',
      emissiveIntensity: 0.1,
    }
    
    if (groundTexture) {
      // Ensure texture settings prevent flickering
      groundTexture.generateMipmaps = true
      groundTexture.minFilter = THREE.LinearMipmapLinearFilter
      groundTexture.magFilter = THREE.LinearFilter
      // Reduce anisotropy on mobile for better performance
      groundTexture.anisotropy = typeof window !== 'undefined' && window.innerWidth < 768 ? 4 : 16
      materialConfig.map = groundTexture
    }
    
    return new THREE.MeshStandardMaterial(materialConfig)
  }, [groundTexture])

  return (
    <group>
      {/* Textured ground plane - always rendered, essential for mobile visibility */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
        renderOrder={-1}
        visible={true}
      >
        <planeGeometry args={[CITY_SIZE, CITY_SIZE]} />
        <primitive object={groundMaterial} attach="material" />
      </mesh>
      
      {/* Terrain variations (grass and pavement) - below roads */}
      {terrainMeshes}
      
      {/* Road meshes - above terrain, below grid */}
      {roadMeshes}
      
      {/* Street grid overlay - raised to prevent z-fighting (optional, can be removed) */}
      {/* <primitive object={streetGrid} /> */}
      
      {/* Perimeter walls */}
      {walls}
      
      {/* Buildings and decorations - chunk-based rendering via chunkManager */}
      {chunkBuildingsList.length > 0 && Object.keys(buildingTextures).length > 0 && (
        <BuildingRenderer buildings={chunkBuildingsList} buildingTextures={buildingTextures} />
      )}
      
      {/* City terrain objects (billboards, street furniture, etc.) */}
      {cityObjects}
      
      {/* Interactive objects (fountains and gardens) */}
      <InteractiveCityObjects citySize={CITY_SIZE} roadNetwork={roadNetwork} />
    </group>
  )
}
