/**
 * Premium Crosshair Component
 * Sophisticated crosshair system with integrated grapple indicator
 * Features dynamic state transitions and smooth animations
 */

import { useState, useEffect } from 'react'

// Store crosshair state globally (shared with GrappleIndicator)
let crosshairState: {
  hasGrappleTarget: boolean
  grappleInRange: boolean
} = {
  hasGrappleTarget: false,
  grappleInRange: false
}

// Export function to update crosshair state (called by GrappleIndicator)
export function updateCrosshairState(state: { hasGrappleTarget: boolean; grappleInRange: boolean }) {
  crosshairState = state
}

export default function Crosshair() {
  const [state, setState] = useState(crosshairState)

  // Poll crosshair state for smooth updates
  useEffect(() => {
    let animationFrameId: number
    
    const updateState = () => {
      setState({ ...crosshairState })
      animationFrameId = requestAnimationFrame(updateState)
    }
    
    animationFrameId = requestAnimationFrame(updateState)
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  const isActive = state.hasGrappleTarget
  const isReady = state.grappleInRange
  
  // Color scheme: cyan for idle, transitions to orange/cyan gradient when active
  const primaryColor = isActive 
    ? (isReady ? '#00ffff' : '#ff6b35') 
    : '#00ffff'
  const secondaryColor = isActive && isReady ? '#00d4ff' : '#00ffff'
  const glowColor = isActive 
    ? (isReady ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 107, 53, 0.4)')
    : 'rgba(0, 255, 255, 0.3)'

  return (
    <>
      <div
        className="fixed pointer-events-none z-30"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '32px',
          height: '32px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Outer ring - expands when grapple target available */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: isActive ? '28px' : '24px',
            height: isActive ? '28px' : '24px',
            border: `1.5px solid ${primaryColor}`,
            borderRadius: '50%',
            opacity: isActive ? 0.8 : 0.4,
            boxShadow: `0 0 ${isActive ? '12px' : '6px'} ${glowColor}`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: isActive && isReady ? 'crosshair-pulse 2s ease-in-out infinite' : 'none',
          }}
        />

        {/* Inner crosshair lines */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            filter: `drop-shadow(0 0 4px ${glowColor})`,
          }}
        >
          {/* Top line */}
          <line
            x1="16"
            y1={isActive ? "4" : "8"}
            x2="16"
            y2="12"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          {/* Bottom line */}
          <line
            x1="16"
            y1={isActive ? "28" : "24"}
            x2="16"
            y2="20"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          {/* Left line */}
          <line
            x1={isActive ? "4" : "8"}
            y1="16"
            x2="12"
            y2="16"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          {/* Right line */}
          <line
            x1={isActive ? "28" : "24"}
            y1="16"
            x2="20"
            y2="16"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            style={{
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>

        {/* Center dot with gradient effect */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: isActive ? '4px' : '3px',
            height: isActive ? '4px' : '3px',
            backgroundColor: secondaryColor,
            borderRadius: '50%',
            boxShadow: `
              0 0 ${isActive ? '8px' : '4px'} ${glowColor},
              0 0 ${isActive ? '16px' : '8px'} ${glowColor},
              inset 0 0 2px rgba(255, 255, 255, 0.3)
            `,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: isActive && isReady ? 'center-pulse 1.5s ease-in-out infinite' : 'none',
          }}
        />

        {/* Corner indicators - appear when grapple target available */}
        {isActive && (
          <>
            {/* Top-left corner */}
            <div
              className="absolute"
              style={{
                left: '2px',
                top: '2px',
                width: '6px',
                height: '6px',
                borderTop: `2px solid ${primaryColor}`,
                borderLeft: `2px solid ${primaryColor}`,
                opacity: isReady ? 1 : 0.5,
                boxShadow: `0 0 4px ${glowColor}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: isReady ? 'corner-pulse 2s ease-in-out 0s infinite' : 'none',
              }}
            />
            {/* Top-right corner */}
            <div
              className="absolute"
              style={{
                right: '2px',
                top: '2px',
                width: '6px',
                height: '6px',
                borderTop: `2px solid ${primaryColor}`,
                borderRight: `2px solid ${primaryColor}`,
                opacity: isReady ? 1 : 0.5,
                boxShadow: `0 0 4px ${glowColor}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: isReady ? 'corner-pulse 2s ease-in-out 0.5s infinite' : 'none',
              }}
            />
            {/* Bottom-left corner */}
            <div
              className="absolute"
              style={{
                left: '2px',
                bottom: '2px',
                width: '6px',
                height: '6px',
                borderBottom: `2px solid ${primaryColor}`,
                borderLeft: `2px solid ${primaryColor}`,
                opacity: isReady ? 1 : 0.5,
                boxShadow: `0 0 4px ${glowColor}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: isReady ? 'corner-pulse 2s ease-in-out 1s infinite' : 'none',
              }}
            />
            {/* Bottom-right corner */}
            <div
              className="absolute"
              style={{
                right: '2px',
                bottom: '2px',
                width: '6px',
                height: '6px',
                borderBottom: `2px solid ${primaryColor}`,
                borderRight: `2px solid ${primaryColor}`,
                opacity: isReady ? 1 : 0.5,
                boxShadow: `0 0 4px ${glowColor}`,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: isReady ? 'corner-pulse 2s ease-in-out 1.5s infinite' : 'none',
              }}
            />
          </>
        )}
      </div>

      <style>{`
        @keyframes crosshair-pulse {
          0%, 100% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }

        @keyframes center-pulse {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            opacity: 0.7;
            transform: translate(-50%, -50%) scale(1.2);
          }
        }

        @keyframes corner-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
      `}</style>
    </>
  )
}

