/**
 * Dynamic Weather System
 * Weather particle effects (rain, snow, fog, etc.)
 */

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { getQualitySettings } from '../utils/qualitySettings'

export type WeatherType = 'none' | 'rain' | 'snow' | 'fog' | 'cyber-rain' | 'data-storm' | 'mars-dust'
export type RainIntensity = 'light' | 'medium' | 'heavy'

interface WeatherSystemProps {
  weatherType?: WeatherType
  intensity?: number
  rainIntensity?: RainIntensity
}

export default function WeatherSystem({ 
  weatherType = 'cyber-rain', // Default to neon rain for cyberpunk aesthetic
  intensity = 1.0,
  rainIntensity = 'medium'
}: WeatherSystemProps) {
  // DISABLED: Early return to disable weather system completely
  // This is a temporary measure to investigate movement stuttering
  if (true) return null
  
  const particlesRef = useRef<THREE.Points>(null)
  const { player } = useGameStore()
  const qualitySettings = getQualitySettings()

  const weatherConfig = useMemo(() => {
    const configs: Record<WeatherType, {
      count: number
      speed: number
      size: number
      color: string
      gravity: number
      spread: number
    }> = {
      none: { count: 0, speed: 0, size: 0, color: '#ffffff', gravity: 0, spread: 0 },
      rain: {
        count: rainIntensity === 'light' 
          ? (qualitySettings.preset === 'low' ? 300 : 1000)
          : rainIntensity === 'medium'
          ? (qualitySettings.preset === 'low' ? 500 : 2000)
          : (qualitySettings.preset === 'low' ? 800 : 4000), // heavy
        speed: rainIntensity === 'light' ? 15 : rainIntensity === 'medium' ? 20 : 30,
        size: rainIntensity === 'light' ? 0.08 : rainIntensity === 'medium' ? 0.12 : 0.15,
        color: '#88ccff',
        gravity: 9.8,
        spread: 50
      },
      snow: {
        count: qualitySettings.preset === 'low' ? 300 : 1500,
        speed: 2,
        size: 0.2,
        color: '#ffffff',
        gravity: 0.5,
        spread: 50
      },
      fog: {
        count: qualitySettings.preset === 'low' ? 200 : 1000,
        speed: 0.5,
        size: 2,
        color: '#888888',
        gravity: 0,
        spread: 30
      },
      'cyber-rain': {
        count: qualitySettings.preset === 'low' ? 500 : 2000,
        speed: 25,
        size: 0.15,
        color: '#00ffff', // Cyan neon
        gravity: 10,
        spread: 50
      },
      'data-storm': {
        count: qualitySettings.preset === 'low' ? 300 : 1500,
        speed: 15,
        size: 0.3,
        color: '#00ff00',
        gravity: 0,
        spread: 40
      },
      'mars-dust': {
        count: qualitySettings.preset === 'low' ? 800 : 3000,
        speed: 8,
        size: 0.4,
        color: '#ff6b35', // Mars orange dust
        gravity: 2, // Low gravity drift
        spread: 60
      }
    }
    return configs[weatherType]
  }, [weatherType, qualitySettings.preset])

  const { positions, velocities, colors, sizes } = useMemo(() => {
    const config = weatherConfig
    const positions = new Float32Array(config.count * 3)
    const velocities = new Float32Array(config.count * 3)
    const colors = new Float32Array(config.count * 3)
    const sizes = new Float32Array(config.count)

    const color = new THREE.Color(config.color)

    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3
      
      // Random starting position
      positions[i3] = (Math.random() - 0.5) * config.spread
      positions[i3 + 1] = Math.random() * 30 + 10
      positions[i3 + 2] = (Math.random() - 0.5) * config.spread

      // Velocity based on weather type
      if (weatherType === 'rain' || weatherType === 'cyber-rain') {
        // More realistic rain - slight wind effect
        const windStrength = rainIntensity === 'heavy' ? 3 : rainIntensity === 'medium' ? 2 : 1
        velocities[i3] = (Math.random() - 0.5) * windStrength
        velocities[i3 + 1] = -config.speed * (0.9 + Math.random() * 0.2) // More consistent speed
        velocities[i3 + 2] = (Math.random() - 0.5) * windStrength
      } else if (weatherType === 'snow') {
        velocities[i3] = (Math.random() - 0.5) * 1
        velocities[i3 + 1] = -config.speed * (0.5 + Math.random() * 0.5)
        velocities[i3 + 2] = (Math.random() - 0.5) * 1
      } else if (weatherType === 'fog') {
        velocities[i3] = (Math.random() - 0.5) * config.speed
        velocities[i3 + 1] = (Math.random() - 0.5) * config.speed
        velocities[i3 + 2] = (Math.random() - 0.5) * config.speed
      } else if (weatherType === 'data-storm') {
        velocities[i3] = (Math.random() - 0.5) * config.speed
        velocities[i3 + 1] = (Math.random() - 0.5) * config.speed
        velocities[i3 + 2] = (Math.random() - 0.5) * config.speed
      } else if (weatherType === 'mars-dust') {
        // Mars dust drifts horizontally with slight vertical movement
        velocities[i3] = (Math.random() - 0.5) * config.speed * 1.5
        velocities[i3 + 1] = (Math.random() - 0.5) * config.speed * 0.3
        velocities[i3 + 2] = (Math.random() - 0.5) * config.speed * 1.5
      }

      // Color
      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b

      // Size
      sizes[i] = config.size * (0.5 + Math.random() * 0.5) * intensity
    }

    return { positions, velocities, colors, sizes }
  }, [weatherConfig, weatherType, intensity])

  useFrame((_state, delta) => {
    if (!particlesRef.current || weatherType === 'none') return

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
    const config = weatherConfig

    for (let i = 0; i < config.count; i++) {
      const i3 = i * 3

      // Update position
      positions[i3] += velocities[i3] * delta
      positions[i3 + 1] += (velocities[i3 + 1] - config.gravity) * delta
      positions[i3 + 2] += velocities[i3 + 2] * delta

      // Reset if below ground or outside bounds
      if (positions[i3 + 1] < -5 || 
          Math.abs(positions[i3]) > config.spread || 
          Math.abs(positions[i3 + 2]) > config.spread) {
        // Reset to top
        positions[i3] = (Math.random() - 0.5) * config.spread
        positions[i3 + 1] = 30 + Math.random() * 10
        positions[i3 + 2] = (Math.random() - 0.5) * config.spread
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })

  if (weatherType === 'none' || weatherConfig.count === 0) return null

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
    return geom
  }, [positions, colors, sizes])

  const material = useMemo(() => {
    // Enhanced rain material - use lines for better rain effect
    if (weatherType === 'rain' || weatherType === 'cyber-rain') {
      return new THREE.PointsMaterial({
        size: weatherConfig.size * (rainIntensity === 'heavy' ? 1.5 : rainIntensity === 'medium' ? 1.2 : 1.0),
        vertexColors: true,
        transparent: true,
        opacity: rainIntensity === 'light' ? 0.6 : rainIntensity === 'medium' ? 0.8 : 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    }
    
    return new THREE.PointsMaterial({
      size: weatherConfig.size,
      vertexColors: true,
      transparent: true,
      opacity: weatherType === 'fog' ? 0.3 : 0.8,
      blending: weatherType === 'fog' ? THREE.NormalBlending : THREE.AdditiveBlending,
      depthWrite: false,
    })
  }, [weatherConfig.size, weatherType, rainIntensity])

  // Position relative to player
  const position: [number, number, number] = useMemo(() => {
    if (!player || !player.position) return [0, 0, 0]
    return [player.position.x, 0, player.position.z]
  }, [player])

  return (
    <points
      ref={particlesRef}
      position={position}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={-100} // Render before other objects
    />
  )
}


