import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PowerUpEntity } from '../../../shared/src/types/powerUps'
import { getPowerUp } from '../data/powerUps'
import { useGameStore } from '../store/useGameStore'

interface PowerUpProps {
  powerUp: PowerUpEntity
}

export default function PowerUp({ powerUp }: PowerUpProps) {
  const meshRef = useRef<THREE.Group>(null)
  const orbRef = useRef<THREE.Mesh>(null)
  const rotationRef = useRef(0)
  const pulseRef = useRef(0)
  const { player } = useGameStore()

  const powerUpData = getPowerUp(powerUp.powerUpId)
  if (!powerUpData) return null

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Floating animation
      meshRef.current.position.set(
        powerUp.position.x,
        powerUp.position.y + Math.sin(state.clock.elapsedTime * 2) * 0.3 + 0.5,
        powerUp.position.z
      )
      
      // Rotation
      rotationRef.current += delta * 1.5
      meshRef.current.rotation.y = rotationRef.current
      
      // Pulsing animation
      pulseRef.current = Math.sin(state.clock.elapsedTime * 3) * 0.2 + 1
      if (orbRef.current) {
        orbRef.current.scale.setScalar(pulseRef.current)
      }
    }
  })

  // Check distance to player
  const distance = player ? Math.sqrt(
    Math.pow(player.position.x - powerUp.position.x, 2) +
    Math.pow(player.position.y - powerUp.position.y, 2) +
    Math.pow(player.position.z - powerUp.position.z, 2)
  ) : Infinity

  const isClose = distance < 2.5
  const glowIntensity = isClose ? 1.2 : 0.8

  // Rarity-based visual effects
  const rarityScale = {
    common: 0.8,
    uncommon: 1.0,
    rare: 1.2,
    epic: 1.4
  }[powerUpData.rarity] || 1.0

  return (
    <group ref={meshRef}>
      {/* Main glowing orb */}
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.4 * rarityScale, 16, 16]} />
        <meshStandardMaterial
          color={powerUpData.color}
          emissive={powerUpData.color}
          emissiveIntensity={glowIntensity}
          metalness={0.3}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Outer glow ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5 * rarityScale, 0.7 * rarityScale, 32]} />
        <meshStandardMaterial
          color={powerUpData.color}
          emissive={powerUpData.color}
          emissiveIntensity={0.6}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Particle effect sphere */}
      <mesh>
        <sphereGeometry args={[0.6 * rarityScale, 16, 16]} />
        <meshStandardMaterial
          color={powerUpData.color}
          emissive={powerUpData.color}
          emissiveIntensity={0.2}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Icon display */}
      <mesh position={[0, 0.8, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Nameplate */}
      <mesh position={[0, 1.4, 0]}>
        <planeGeometry args={[2.5, 0.5]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rarity indicator rings */}
      {powerUpData.rarity !== 'common' && (
        <>
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.45 * rarityScale, 0.55 * rarityScale, 32]} />
            <meshStandardMaterial
              color={powerUpData.color}
              emissive={powerUpData.color}
              emissiveIntensity={0.8}
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {/* Pickup indicator */}
      {isClose && (
        <>
          <mesh position={[0, 1.8, 0]}>
            <planeGeometry args={[2, 0.4]} />
            <meshBasicMaterial
              color="#00ff00"
              transparent
              opacity={0.9}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/* Pulsing pickup ring */}
          <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.6 * rarityScale, 0.8 * rarityScale, 32]} />
            <meshStandardMaterial
              color="#00ff00"
              emissive="#00ff00"
              emissiveIntensity={1.0}
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {/* Enhanced glow effect */}
      <pointLight
        position={[0, 0.5, 0]}
        intensity={glowIntensity}
        color={powerUpData.color}
        distance={6}
        decay={2}
      />

      {/* Additional point lights for rare power-ups */}
      {powerUpData.rarity === 'rare' || powerUpData.rarity === 'epic' ? (
        <>
          <pointLight
            position={[0.5, 0.5, 0]}
            intensity={0.5}
            color={powerUpData.color}
            distance={4}
            decay={2}
          />
          <pointLight
            position={[-0.5, 0.5, 0]}
            intensity={0.5}
            color={powerUpData.color}
            distance={4}
            decay={2}
          />
        </>
      ) : null}
    </group>
  )
}

