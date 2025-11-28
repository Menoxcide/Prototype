/**
 * Premium Grapple Indicator Component
 * Integrates seamlessly with crosshair system
 * Shows sophisticated grapple hook icon when target is available
 * 
 * Split into two parts:
 * - GrappleIndicatorLogic: Canvas component that does raycast (must be inside Canvas)
 * - GrappleIndicatorUI: Regular React component that displays the indicator
 */

import { useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../store/useGameStore'
import { updateCrosshairState } from './Crosshair'

const GRAPPLE_DISTANCE = 60 // Maximum distance to grapple (must match BuildingGrappleSystem)
const GRAPPLE_COST = 20 // Stamina cost per grapple (must match BuildingGrappleSystem)
const GRAPPLE_ACTION_ID = 'grapple'

// Store indicator state globally so UI component can access it
let indicatorState: {
  visible: boolean
  inRange: boolean
} = {
  visible: false,
  inRange: false
}

// Canvas component - must be inside Canvas
export function GrappleIndicatorLogic() {
  const { camera, scene, raycaster } = useThree()
  const player = useGameStore((s) => s.player)
  const stamina = useGameStore((s) => s.stamina)
  const grappledBuilding = useGameStore((s) => s.grappledBuilding)
  const isOnCooldown = useGameStore((s) => s.isOnCooldown)
  
  // Update indicator state every frame
  useFrame(() => {
    if (!player || grappledBuilding) {
      // Hide indicator when already grappling
      indicatorState.visible = false
      updateCrosshairState({ hasGrappleTarget: false, grappleInRange: false })
      return
    }

    // Raycast from camera center (crosshair position)
    const centerScreen = new THREE.Vector2(0, 0) // Center of screen
    raycaster.setFromCamera(centerScreen, camera)
    
    // Find all grappleable objects
    const allObjects: THREE.Object3D[] = []
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        // Skip player, UI elements, and explicitly non-grappleable objects
        if (obj.userData.isPlayer || obj.userData.isUI || obj.userData.isGrappleable === false) {
          return
        }
        // Include all other meshes (walls, buildings, objects)
        allObjects.push(obj)
      }
    })
    
    const intersects = raycaster.intersectObjects(allObjects, true)
    
    if (intersects.length > 0) {
      const hit = intersects[0]
      const hitPoint = hit.point
      
      // Calculate distance from player to hit point
      const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z)
      const distance = playerPos.distanceTo(hitPoint)
      
      // Check if in range, has stamina, and not on cooldown
      const onCooldown = isOnCooldown(GRAPPLE_ACTION_ID)
      const inRange = !onCooldown && distance <= GRAPPLE_DISTANCE && stamina >= GRAPPLE_COST
      
      indicatorState = {
        visible: true,
        inRange
      }
      
      // Update crosshair state
      updateCrosshairState({ hasGrappleTarget: true, grappleInRange: inRange })
    } else {
      indicatorState.visible = false
      updateCrosshairState({ hasGrappleTarget: false, grappleInRange: false })
    }
  })

  return null // This component doesn't render anything
}

// UI component - regular React component
export default function GrappleIndicator() {
  const [state, setState] = useState(indicatorState)

  // Poll indicator state (update every frame via requestAnimationFrame)
  useEffect(() => {
    let animationFrameId: number
    
    const updateState = () => {
      setState({ ...indicatorState })
      animationFrameId = requestAnimationFrame(updateState)
    }
    
    animationFrameId = requestAnimationFrame(updateState)
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  // Don't render if not visible
  if (!state.visible) {
    return null
  }

  const isReady = state.inRange
  const primaryColor = isReady ? '#00ffff' : '#ff6b35'
  const secondaryColor = isReady ? '#00d4ff' : '#ff8c5a'
  const glowColor = isReady ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 107, 53, 0.4)'

  return (
    <div
      className="fixed pointer-events-none z-31"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Grapple hook SVG - premium design */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        style={{
          filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor})`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isReady ? 'scale(1)' : 'scale(0.9)',
          opacity: isReady ? 1 : 0.7,
          animation: isReady ? 'grapple-ready 2s ease-in-out infinite' : 'grapple-wait 1.5s ease-in-out infinite',
        }}
      >
        <defs>
          <linearGradient id="grappleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
            <stop offset="100%" stopColor={secondaryColor} stopOpacity="1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main hook body */}
        <path
          d="M 16 8 
             C 12 8, 8 12, 8 16
             C 8 20, 12 24, 16 24
             C 20 24, 24 20, 24 16
             C 24 12, 20 8, 16 8
             Z
             M 16 12
             C 18 12, 20 14, 20 16
             C 20 18, 18 20, 16 20
             C 14 20, 12 18, 12 16
             C 12 14, 14 12, 16 12
             Z"
          fill="none"
          stroke="url(#grappleGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />
        
        {/* Hook point */}
        <path
          d="M 20 16
             L 24 12
             L 26 14
             L 22 18
             Z"
          fill="url(#grappleGradient)"
          filter="url(#glow)"
        />
        
        {/* Rope/chain link */}
        <circle
          cx="16"
          cy="10"
          r="2"
          fill="url(#grappleGradient)"
          filter="url(#glow)"
          opacity="0.8"
        />
        
        {/* Energy particles when ready */}
        {isReady && (
          <>
            <circle
              cx="10"
              cy="16"
              r="1.5"
              fill={primaryColor}
              opacity="0.8"
              style={{
                animation: 'particle-float 2s ease-in-out infinite',
                animationDelay: '0s',
              }}
            />
            <circle
              cx="22"
              cy="16"
              r="1.5"
              fill={primaryColor}
              opacity="0.8"
              style={{
                animation: 'particle-float 2s ease-in-out infinite',
                animationDelay: '0.5s',
              }}
            />
            <circle
              cx="16"
              cy="22"
              r="1.5"
              fill={primaryColor}
              opacity="0.8"
              style={{
                animation: 'particle-float 2s ease-in-out infinite',
                animationDelay: '1s',
              }}
            />
          </>
        )}
      </svg>

      {/* Status ring - appears when ready */}
      {isReady && (
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '40px',
            height: '40px',
            border: `2px solid ${primaryColor}`,
            borderRadius: '50%',
            opacity: 0.6,
            boxShadow: `0 0 12px ${glowColor}`,
            animation: 'status-ring 2s ease-in-out infinite',
          }}
        />
      )}

      <style>{`
        @keyframes grapple-ready {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
          25% {
            transform: scale(1.05) rotate(-2deg);
            opacity: 0.95;
          }
          50% {
            transform: scale(1.1) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: scale(1.05) rotate(2deg);
            opacity: 0.95;
          }
        }

        @keyframes grapple-wait {
          0%, 100% {
            transform: scale(0.9) rotate(0deg);
            opacity: 0.7;
          }
          50% {
            transform: scale(0.95) rotate(0deg);
            opacity: 0.8;
          }
        }

        @keyframes particle-float {
          0%, 100% {
            opacity: 0.8;
            transform: translate(0, 0);
          }
          50% {
            opacity: 0.4;
            transform: translate(0, -4px);
          }
        }

        @keyframes status-ring {
          0%, 100% {
            opacity: 0.6;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(1.1);
          }
        }
      `}</style>
    </div>
  )
}
