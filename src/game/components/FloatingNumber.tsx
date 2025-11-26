import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'

export type FloatingNumberType = 
  | 'damage' 
  | 'healing' 
  | 'status' 
  | 'xp' 
  | 'level-up' 
  | 'mana' 
  | 'buff' 
  | 'debuff'
  | 'combo'
  | 'critical'

interface FloatingNumberProps {
  id: string
  value: number | string
  position: { x: number; y: number; z: number }
  type: FloatingNumberType
  isCrit?: boolean
}

export default function FloatingNumber({ id, value, position, type, isCrit = false }: FloatingNumberProps) {
  const groupRef = useRef<THREE.Group>(null)
  const { updateFloatingNumber, removeFloatingNumber } = useGameStore()
  
  useFrame((_state, delta) => {
    const floatingNumber = useGameStore.getState().floatingNumbers.get(id)
    if (!floatingNumber || !groupRef.current) return
    
    // Update position and opacity based on type
    const speed = type === 'level-up' ? 1.5 : type === 'combo' ? 1.2 : 2.0
    const newYOffset = floatingNumber.yOffset + delta * speed
    const newOpacity = Math.max(0, floatingNumber.opacity - delta * (type === 'level-up' ? 0.3 : 0.5))
    
    // Add slight horizontal drift for variety
    const drift = Math.sin(floatingNumber.createdAt * 0.01) * 0.1
    groupRef.current.position.set(
      floatingNumber.position.x + drift,
      floatingNumber.position.y + newYOffset,
      floatingNumber.position.z
    )
    
    // Update store
    updateFloatingNumber(id, {
      yOffset: newYOffset,
      opacity: newOpacity
    })
    
    // Remove if faded out
    if (newOpacity <= 0) {
      removeFloatingNumber(id)
    }
  })

  const getStyle = () => {
    const baseStyle: React.CSSProperties = {
      pointerEvents: 'none',
      userSelect: 'none',
      transform: 'translate3d(-50%, -50%, 0)',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      textShadow: '0 0 8px currentColor, 0 2px 4px rgba(0,0,0,0.8)',
      whiteSpace: 'nowrap',
      transition: 'opacity 0.1s ease-out',
    }

    switch (type) {
      case 'damage':
        return {
          ...baseStyle,
          color: isCrit ? '#ff00ff' : '#ff4444',
          fontSize: isCrit ? '32px' : '24px',
        }
      case 'healing':
        return {
          ...baseStyle,
          color: '#00ff88',
          fontSize: '22px',
        }
      case 'status':
        return {
          ...baseStyle,
          color: '#00aaff',
          fontSize: '18px',
        }
      case 'xp':
        return {
          ...baseStyle,
          color: '#ffff00',
          fontSize: '20px',
        }
      case 'level-up':
        return {
          ...baseStyle,
          color: '#ff00ff',
          fontSize: '36px',
          textShadow: '0 0 16px #ff00ff, 0 4px 8px rgba(0,0,0,0.9)',
        }
      case 'mana':
        return {
          ...baseStyle,
          color: '#00aaff',
          fontSize: '20px',
        }
      case 'buff':
        return {
          ...baseStyle,
          color: '#00ff00',
          fontSize: '18px',
        }
      case 'debuff':
        return {
          ...baseStyle,
          color: '#ff8800',
          fontSize: '18px',
        }
      case 'combo':
        return {
          ...baseStyle,
          color: '#ff00ff',
          fontSize: '28px',
          textShadow: '0 0 12px #ff00ff, 0 2px 6px rgba(0,0,0,0.8)',
        }
      case 'critical':
        return {
          ...baseStyle,
          color: '#ff00ff',
          fontSize: '30px',
          textShadow: '0 0 16px #ff00ff, 0 4px 8px rgba(0,0,0,0.9)',
        }
      default:
        return {
          ...baseStyle,
          color: '#ffffff',
          fontSize: '20px',
        }
    }
  }

  const formatValue = () => {
    if (typeof value === 'string') return value
    if (type === 'damage' || type === 'healing') {
      return Math.floor(value).toString()
    }
    if (type === 'xp') {
      return `+${value} XP`
    }
    if (type === 'mana') {
      return `+${value} MP`
    }
    return value.toString()
  }

  const floatingNumber = useGameStore.getState().floatingNumbers.get(id)
  if (!floatingNumber) return null

  return (
    <group ref={groupRef} position={[position.x, position.y, position.z]}>
      <Html
        center
        distanceFactor={10}
        style={{
          opacity: floatingNumber.opacity,
        }}
      >
        <div style={getStyle()}>
          {type === 'damage' && isCrit && <span style={{ marginRight: '4px' }}>⚡</span>}
          {type === 'level-up' && <span style={{ marginRight: '4px' }}>⭐</span>}
          {type === 'combo' && <span style={{ marginRight: '4px' }}>🔥</span>}
          {formatValue()}
        </div>
      </Html>
    </group>
  )
}

