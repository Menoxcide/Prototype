/**
 * Biome Asset Test Component
 * Tests loading and displaying converted biome assets
 */

import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { loadBiomeAsset, loadProp, getAvailableAssets, type Biome } from '../../assets/biomeAssetLoader'

interface BiomeAssetTestProps {
  biome?: Biome
}

export default function BiomeAssetTest({ biome = 'sci-fi' }: BiomeAssetTestProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [loadedAssets, setLoadedAssets] = useState<THREE.Object3D[]>([])
  const [availableAssets, setAvailableAssets] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Rotate assets for viewing
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005
    }
  })

  // Load available assets
  useEffect(() => {
    getAvailableAssets(biome)
      .then(assets => {
        setAvailableAssets(assets)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [biome])

  // Load sample assets
  useEffect(() => {
    if (!availableAssets || loading) return

    const loadSamples = async () => {
      const samples: THREE.Object3D[] = []
      let x = 0

      try {
        // Load one sample from each category
        if (availableAssets.floor.length > 0) {
          const asset = await loadBiomeAsset(biome, 'floor', availableAssets.floor[0])
          asset.position.set(x, 0, 0)
          samples.push(asset)
          x += 3
        }

        if (availableAssets.walls.length > 0) {
          const asset = await loadBiomeAsset(biome, 'walls', availableAssets.walls[0])
          asset.position.set(x, 0, 0)
          samples.push(asset)
          x += 3
        }

        if (availableAssets.props.length > 0) {
          const asset = await loadProp(availableAssets.props[0], 'sci-fi')
          asset.position.set(x, 0, 0)
          samples.push(asset)
          x += 3
        }

        if (availableAssets.columns.length > 0) {
          const asset = await loadBiomeAsset(biome, 'columns', availableAssets.columns[0])
          asset.position.set(x, 0, 2)
          samples.push(asset)
          x += 3
        }

        if (availableAssets.doors.length > 0) {
          const asset = await loadBiomeAsset(biome, 'doors', availableAssets.doors[0])
          asset.position.set(x, 0, -2)
          samples.push(asset)
          x += 3
        }

        setLoadedAssets(samples)
      } catch (err: any) {
        setError(err.message || 'Failed to load assets')
      }
    }

    loadSamples()
  }, [availableAssets, biome, loading])

  // Add loaded assets to scene
  useEffect(() => {
    if (groupRef.current && loadedAssets.length > 0) {
      // Clear existing
      while (groupRef.current.children.length > 0) {
        const child = groupRef.current.children[0]
        groupRef.current.remove(child)
        // Dispose of geometry and materials if it's a mesh
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose())
          } else {
            child.material?.dispose()
          }
        }
      }

      // Add new assets (don't clone, use directly)
      for (const asset of loadedAssets) {
        groupRef.current.add(asset)
      }
    }
  }, [loadedAssets])

  if (loading) {
    return (
      <group ref={groupRef}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="gray" />
        </mesh>
      </group>
    )
  }

  if (error) {
    return (
      <group ref={groupRef}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" />
        </mesh>
      </group>
    )
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Assets will be added here */}
      {loadedAssets.length === 0 && (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" />
        </mesh>
      )}
    </group>
  )
}

