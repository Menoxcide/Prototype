import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Enemy as EnemyType } from '../types'
import { useGameStore } from '../store/useGameStore'
import { getLODLevel, getPerformanceSettings } from '../systems/performanceSystem'
import { assetManager } from '../assets/assetManager'
import { addSnapshot, getInterpolatedState } from '../network/snapshotInterpolation'

interface EnemyProps {
  enemy: EnemyType
}

export default function Enemy({ enemy }: EnemyProps) {
  const groupRef = useRef<THREE.Group>(null)
  const modelRef = useRef<THREE.Group | THREE.Object3D | null>(null)
  // Use selective subscription to reduce re-renders
  const player = useGameStore((state) => state.player)
  const settings = getPerformanceSettings()
  const [modelLoaded, setModelLoaded] = useState(false)

  // Determine enemy type based on level
  const isBoss = enemy.level > 20
  const isElite = enemy.level > 10 && !isBoss
  const enemyType = isBoss ? 'enemy-boss' : isElite ? 'enemy-elite' : 'enemy-basic'
  
  const healthPercent = enemy.health / enemy.maxHealth
  const enemyColor = healthPercent > 0.5 ? '#ff0000' : healthPercent > 0.25 ? '#ff6600' : '#ff0000'
  
  // Load enemy model
  useEffect(() => {
    const loadModel = async () => {
      try {
        const modelId = `enemy-${enemy.id}`
        let model: THREE.Group | THREE.Object3D | null = null
        
        // Check cache first
        model = assetManager.getModel(modelId, 'high')
        
        if (!model) {
          // Load procedural model
          model = await assetManager.loadModel(
            modelId,
            enemyType,
            {
              color: enemyColor,
              emissive: enemyColor,
              scale: isBoss ? 1.5 : isElite ? 1.2 : 1.0
            }
          )
        }
        
        if (model && groupRef.current) {
          if (modelRef.current) {
            groupRef.current.remove(modelRef.current)
          }
          
          const clonedModel = model.clone()
          modelRef.current = clonedModel
          groupRef.current.add(clonedModel)
          setModelLoaded(true)
        }
      } catch (error) {
        console.error('Failed to load enemy model:', error)
        setModelLoaded(false)
      }
    }
    
    loadModel()
    
    return () => {
      if (modelRef.current && groupRef.current) {
        groupRef.current.remove(modelRef.current)
        modelRef.current = null
      }
      assetManager.releaseModel(`enemy-${enemy.id}`)
    }
  }, [enemy.id, enemyType, enemyColor, isBoss, isElite])

  // Add snapshot for interpolation when position changes
  useEffect(() => {
    addSnapshot(enemy.id, enemy.position, enemy.rotation)
  }, [enemy.position.x, enemy.position.y, enemy.position.z, enemy.rotation, enemy.id])

  useFrame(() => {
    if (groupRef.current) {
      // Use interpolated state for smooth movement
      const interpolated = getInterpolatedState(enemy.id)
      const position = interpolated?.position || enemy.position
      const rotation = interpolated?.rotation ?? enemy.rotation
      
      groupRef.current.position.set(
        position.x,
        position.y,
        position.z
      )
      groupRef.current.rotation.y = rotation
    }
  })

  // LOD: Calculate distance to player
  const distance = player ? Math.sqrt(
    Math.pow(player.position.x - enemy.position.x, 2) +
    Math.pow(player.position.y - enemy.position.y, 2) +
    Math.pow(player.position.z - enemy.position.z, 2)
  ) : 0

  const lodLevel = getLODLevel(distance, settings.renderDistance)

  // Cull if too far
  if (distance > settings.renderDistance) {
    return null
  }

  return (
    <group ref={groupRef}>
      {/* 3D Model loaded from model loader */}
      {modelLoaded && modelRef.current && (
        <primitive 
          object={modelRef.current} 
          castShadow 
          receiveShadow
        />
      )}

      {/* Fallback geometry if model not loaded */}
      {!modelLoaded && (
        <mesh>
          <boxGeometry args={lodLevel === 'low' ? [0.8, 0.8, 0.8] : [1, 1, 1]} />
          <meshStandardMaterial
            color={enemyColor}
            emissive={enemyColor}
            emissiveIntensity={lodLevel === 'low' ? 0.2 : 0.3}
          />
        </mesh>
      )}

      {/* Health bar - only show for medium/high LOD */}
      {lodLevel !== 'low' && (
        <>
          <mesh position={[0, 1.5, 0]}>
            <planeGeometry args={[1, 0.1]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh
            position={[
              -(1 - healthPercent) * 0.5,
              1.5,
              0.01
            ]}
          >
            <planeGeometry args={[healthPercent, 0.08]} />
            <meshBasicMaterial color={enemyColor} />
          </mesh>
        </>
      )}

      {/* Level indicator - only for high LOD */}
      {lodLevel === 'high' && (
        <mesh position={[0, 1.8, 0]}>
          <planeGeometry args={[0.5, 0.2]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Glow - only for medium/high LOD */}
      {lodLevel !== 'low' && (
        <pointLight
          position={[0, 0, 0]}
          intensity={lodLevel === 'high' ? 0.3 : 0.2}
          color={enemyColor}
          distance={3}
        />
      )}
    </group>
  )
}

