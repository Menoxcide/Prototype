/**
 * Puddle Reflections Component
 * Adds neon rain reflections on puddles using reflection probes
 */

import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { getQualitySettings } from '../utils/qualitySettings'

export default function PuddleReflections() {
  const { scene } = useThree()
  const qualitySettings = getQualitySettings()
  const puddlesRef = useRef<THREE.Mesh[]>([])

  // Create puddle meshes (simplified - would be placed procedurally in production)
  useEffect(() => {
    if (qualitySettings.preset === 'low') return // Skip on low quality

    // Create a few puddle meshes on the ground
    const puddleCount = 5
    const puddles: THREE.Mesh[] = []

    for (let i = 0; i < puddleCount; i++) {
      const puddleGeometry = new THREE.CircleGeometry(2 + Math.random() * 3, 16)
      const puddleMaterial = new THREE.MeshStandardMaterial({
        color: 0x001122, // Dark blue-black for water
        transparent: true,
        opacity: 0.6,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x00ffff, // Cyan neon glow
        emissiveIntensity: 0.3
      })

      const puddle = new THREE.Mesh(puddleGeometry, puddleMaterial)
      puddle.rotation.x = -Math.PI / 2 // Lay flat on ground
      puddle.position.set(
        (Math.random() - 0.5) * 100,
        0.01, // Slightly above ground
        (Math.random() - 0.5) * 100
      )
      puddle.userData.isPuddle = true

      scene.add(puddle)
      puddles.push(puddle)
    }

    puddlesRef.current = puddles

    return () => {
      puddles.forEach(puddle => {
        scene.remove(puddle)
        puddle.geometry.dispose()
        if (Array.isArray(puddle.material)) {
          puddle.material.forEach(mat => mat.dispose())
        } else {
          puddle.material.dispose()
        }
      })
      puddlesRef.current = []
    }
  }, [scene, qualitySettings])

  // Animate puddle reflections (ripple effect)
  useFrame(() => {
    if (qualitySettings.preset === 'low') return

    puddlesRef.current.forEach((puddle, index) => {
      const material = puddle.material as THREE.MeshStandardMaterial
      const time = Date.now() * 0.001 + index

      // Subtle ripple animation
      const ripple = Math.sin(time * 2) * 0.1 + 0.9
      material.emissiveIntensity = 0.3 * ripple

      // Add slight color variation for neon effect
      const hue = (time * 0.1) % 1
      const color = new THREE.Color().setHSL(hue, 0.8, 0.5)
      material.emissive = color
    })
  })

  return null
}

