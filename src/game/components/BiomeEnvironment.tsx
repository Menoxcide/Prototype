/**
 * Biome Environment Component
 * Updates sky, fog, and lighting based on current biome
 */

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { getBiome } from '../data/biomes'

export default function BiomeEnvironment() {
  const { scene } = useThree()
  const currentZone = useGameStore((state) => state.currentZone)
  const fogRef = useRef<THREE.FogExp2 | null>(null)

  useEffect(() => {
    // Get biome data for current zone
    const biome = getBiome(currentZone)
    
    // If biome not found, use default values
    if (!biome) {
      return
    }

    // Update fog color based on biome sky color
    const fogColor = biome.skyColor || '#1a1a2a'
    const fogDensity = 0.015 // Base fog density
    
    // Adjust fog density based on biome weather
    let adjustedFogDensity = fogDensity
    if (biome.weather === 'foggy') {
      adjustedFogDensity = 0.05 // Denser fog for foggy biomes
    } else if (biome.weather === 'sunny') {
      adjustedFogDensity = 0.01 // Lighter fog for sunny biomes
    }

    // Find and update fog
    const fog = scene.fog
    if (fog instanceof THREE.FogExp2) {
      fog.color.set(fogColor)
      fog.density = adjustedFogDensity
      fogRef.current = fog
    } else {
      // Create new fog if it doesn't exist
      const newFog = new THREE.FogExp2(fogColor, adjustedFogDensity)
      scene.fog = newFog
      fogRef.current = newFog
    }

    // Update scene background color to match biome sky
    scene.background = new THREE.Color(biome.skyColor || '#1a1a2a')

    // Update ambient light color slightly based on biome
    // This is subtle - main lighting is handled by other components
    const ambientLight = scene.children.find(
      (child) => child instanceof THREE.AmbientLight
    ) as THREE.AmbientLight | undefined

    if (ambientLight) {
      // Slightly tint ambient light based on biome color
      const tintIntensity = 0.1
      const biomeColor = new THREE.Color(biome.color)
      const baseColor = new THREE.Color('#ffffff')
      biomeColor.lerp(baseColor, 1 - tintIntensity)
      ambientLight.color.copy(biomeColor)
    }

    if (import.meta.env.DEV) {
      console.log(`🌍 Biome environment updated: ${biome.name}`, {
        skyColor: biome.skyColor,
        fogColor,
        fogDensity: adjustedFogDensity,
        weather: biome.weather
      })
    }
  }, [currentZone, scene])

  return null // This component doesn't render anything
}

