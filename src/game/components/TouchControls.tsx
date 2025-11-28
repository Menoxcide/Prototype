import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { isMobile } from '../data/config'
import { hapticManager } from '../utils/haptics'
import { calculateResponsiveScale, hapticFeedback } from '../utils/mobileOptimizations'
import { createGestureRecognizer, SwipeDirection } from '../utils/gestureRecognition'

export default function TouchControls() {
  const { player, getEquippedSpell, updatePlayerPosition, updatePlayerRotation, updatePlayerMana, grappledBuilding, isOnCooldown, startCooldown, getRemainingCooldown, getCooldownProgress } = useGameStore()
  const joystickRef = useRef<HTMLDivElement>(null)
  const spellWheelRef = useRef<HTMLDivElement>(null)
  const gestureAreaRef = useRef<HTMLDivElement>(null)
  const [_joystick, setJoystick] = useState<any>(null)
  const moveDirectionRef = useRef({ x: 0, y: 0 })
  const gestureRecognizerRef = useRef<ReturnType<typeof createGestureRecognizer> | null>(null)
  
  // Debounce state for spell casting to reduce input lag
  const lastSpellCastTime = useRef<number>(0)
  const SPELL_CAST_DEBOUNCE = 20 // 20ms debounce

  // Setup gesture recognition for swipe gestures (dodge/dash)
  useEffect(() => {
    if (!isMobile() || !gestureAreaRef.current) return

    gestureRecognizerRef.current = createGestureRecognizer(gestureAreaRef.current, {
      onSwipe: (direction: SwipeDirection, _distance: number, _velocity: number) => {
        if (!player) return
        
        // Swipe gestures for dodge/dash
        const dashDistance = 2.0 // Distance to dash
        const dashSpeed = 0.3 // Speed multiplier for dash
        
        let dashX = 0
        let dashZ = 0
        
        switch (direction) {
          case 'up':
            dashZ = -dashDistance
            break
          case 'down':
            dashZ = dashDistance
            break
          case 'left':
            dashX = -dashDistance
            break
          case 'right':
            dashX = dashDistance
            break
        }
        
        // Apply dash movement with debouncing
        setTimeout(() => {
          if (player) {
            const newX = player.position.x + dashX * dashSpeed
            const newZ = player.position.z + dashZ * dashSpeed
            updatePlayerPosition({ x: newX, y: player.position.y, z: newZ })
            hapticFeedback.medium()
          }
        }, 20) // 20ms debounce
      },
      onLongPress: (_position) => {
        // Long press for context menu (future feature)
        hapticFeedback.warning()
      },
      onPinch: (scale, _center) => {
        // Pinch to zoom camera (if camera zoom is implemented)
        // For now, just provide haptic feedback
        if (scale > 1.1 || scale < 0.9) {
          hapticFeedback.light()
        }
      }
    })

    return () => {
      gestureRecognizerRef.current?.destroy()
      gestureRecognizerRef.current = null
    }
  }, [player, updatePlayerPosition])

  useEffect(() => {
    if (!isMobile() || !joystickRef.current) return

    // Dynamically import nipplejs
    import('nipplejs').then((nipplejs) => {
      const       manager = nipplejs.default.create({
        zone: joystickRef.current!,
        mode: 'static',
        position: { left: '80px', bottom: '80px' },
        color: '#00ffff',
        size: 100,
        threshold: 0.05, // Lower threshold for better responsiveness
        fadeTime: 250
      })

      let lastHapticTime = 0
      const HAPTIC_INTERVAL = 200 // Haptic feedback every 200ms max

      manager.on('start', () => {
        hapticFeedback.light()
      })

      manager.on('move', (_, data) => {
        const angle = data.angle.radian
        const force = data.force
        moveDirectionRef.current = {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force
        }
        
        // Provide subtle haptic feedback during movement (throttled)
        const now = Date.now()
        if (now - lastHapticTime > HAPTIC_INTERVAL && force > 0.8) {
          hapticFeedback.light()
          lastHapticTime = now
        }
      })

      manager.on('end', () => {
        moveDirectionRef.current = { x: 0, y: 0 }
        hapticFeedback.light()
      })

      setJoystick(manager)

      return () => {
        manager.destroy()
      }
    })
  }, [])

  // Movement update loop with debouncing to reduce input lag
  useEffect(() => {
    if (!player) return

    let lastUpdateTime = 0
    const UPDATE_INTERVAL = 16 // ~60 FPS, but with debouncing

    const interval = setInterval(() => {
      const now = Date.now()
      // Debounce movement updates by 20ms to reduce input lag
      if (now - lastUpdateTime < 20) return
      lastUpdateTime = now

      const { x, y } = moveDirectionRef.current
      if (x !== 0 || y !== 0) {
        const speed = 0.1
        const newX = player.position.x + x * speed
        const newZ = player.position.z + y * speed
        const newRotation = Math.atan2(x, y)

        updatePlayerPosition({ x: newX, y: player.position.y, z: newZ })
        updatePlayerRotation(newRotation)
      }
    }, UPDATE_INTERVAL)

    return () => clearInterval(interval)
  }, [player, updatePlayerPosition, updatePlayerRotation])


  const handleJump = () => {
    if (!player) return
    
    // If grappling, release grapple first (Space releases grapple)
    if (grappledBuilding) {
      // Dispatch Space key event to trigger grapple release in BuildingGrappleSystem
      const spaceEvent = new KeyboardEvent('keydown', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true
      })
      window.dispatchEvent(spaceEvent)
      
      // Also trigger keyup after a short delay
      setTimeout(() => {
        const spaceUpEvent = new KeyboardEvent('keyup', {
          code: 'Space',
          key: ' ',
          bubbles: true,
          cancelable: true
        })
        window.dispatchEvent(spaceUpEvent)
      }, 50)
      
      hapticFeedback.medium()
      return
    }
    
    // Otherwise, trigger jump (Space key for jump)
    const spaceEvent = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true
    })
    window.dispatchEvent(spaceEvent)
    
    // Trigger keyup after a short delay
    setTimeout(() => {
      const spaceUpEvent = new KeyboardEvent('keyup', {
        code: 'Space',
        key: ' ',
        bubbles: true,
        cancelable: true
      })
      window.dispatchEvent(spaceUpEvent)
    }, 50)
    
    hapticFeedback.light()
  }

  const handleSpellCast = (slot: number) => {
    // Debounce spell casting to reduce input lag by 20ms
    const now = Date.now()
    if (now - lastSpellCastTime.current < SPELL_CAST_DEBOUNCE) {
      return
    }
    lastSpellCastTime.current = now

    const spell = getEquippedSpell(slot)
    if (!spell || !player) {
      hapticFeedback.light()
      return
    }

    // Check cooldown using centralized system
    const actionId = `spell:${spell.id}`
    if (isOnCooldown(actionId)) {
      // Haptic feedback for cooldown
      hapticFeedback.warning()
      return
    }

    if (player.mana < spell.manaCost) {
      // Haptic feedback for insufficient mana
      hapticFeedback.error()
      return
    }

    // Consume mana
    updatePlayerMana(player.mana - spell.manaCost)

    // Start cooldown using centralized system
    startCooldown(actionId, spell.cooldown)

    // Haptic feedback for successful spell cast
    hapticManager.damage() // Use damage pattern for spell cast
    hapticFeedback.medium()

    // Queue spell cast for Game component to process (with debounce)
    setTimeout(() => {
      useGameStore.getState().queueSpellCast(spell.id)
    }, SPELL_CAST_DEBOUNCE)
  }

  if (!isMobile()) return null

  const uiScale = calculateResponsiveScale()
  const buttonSize = Math.max(uiScale.buttonSize, 44) // Ensure minimum 44px touch target
  
  // Calculate safe areas to avoid HUD overlap
  // Action buttons bar is at bottom, so leave space
  const actionBarHeight = 60 + 8 // height + padding
  const bottomSafeArea = actionBarHeight

  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      {/* Gesture recognition area (covers entire screen for swipe gestures) */}
      <div
        ref={gestureAreaRef}
        className="absolute inset-0 pointer-events-auto"
        style={{ 
          touchAction: 'none',
          zIndex: 10
        }}
      />
      
      {/* Left Joystick - positioned to avoid player stats panel */}
      <div
        ref={joystickRef}
        className="absolute pointer-events-auto"
        style={{ 
          touchAction: 'none',
          left: '8px',
          bottom: `${bottomSafeArea}px`,
          width: `${uiScale.buttonSize * 2.5}px`,
          height: `${uiScale.buttonSize * 2.5}px`,
          zIndex: 20
        }}
      />

      {/* Right Side - Jump Button and Spell Wheel/Hotbar - positioned to avoid top-right buttons and action bar */}
      <div
        ref={spellWheelRef}
        className="absolute pointer-events-auto"
        style={{
          right: '8px',
          bottom: `${bottomSafeArea}px`,
          gap: `${uiScale.spacing}px`,
          zIndex: 20
        }}
      >
        {/* Jump Button */}
        <button
          onClick={handleJump}
          className="relative rounded-lg border-2 font-bold text-xl transition-all bg-gray-800 border-cyan-500 hover:border-cyan-400 active:scale-95 mb-2"
          style={{
            touchAction: 'manipulation',
            width: `${buttonSize}px`,
            height: `${buttonSize}px`,
            fontSize: `${uiScale.fontSize}px`,
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span className="text-cyan-400">↑</span>
        </button>
        
        <div className="flex flex-col" style={{ gap: `${uiScale.spacing}px` }}>
          {[0, 1, 2, 3, 4].map(slot => {
            const spell = getEquippedSpell(slot)
            const actionId = spell ? `spell:${spell.id}` : ''
            const cooldown = actionId ? getRemainingCooldown(actionId) : 0
            const cooldownPercent = spell && actionId ? (1 - getCooldownProgress(actionId, spell.cooldown)) * 100 : 0
            const canCast = spell && player && player.mana >= spell.manaCost && cooldown === 0

            return (
              <button
                key={slot}
                onClick={() => handleSpellCast(slot)}
                disabled={!canCast}
                className={`relative rounded-lg border-2 font-bold text-xl transition-all ${
                  canCast
                    ? 'bg-gray-800 border-cyan-500 hover:border-cyan-400 active:scale-95'
                    : 'bg-gray-900 border-gray-700 opacity-50'
                }`}
                style={{
                  touchAction: 'manipulation',
                  width: `${buttonSize}px`,
                  height: `${buttonSize}px`,
                  fontSize: `${uiScale.fontSize}px`,
                  minWidth: '44px',
                  minHeight: '44px'
                }}
              >
                {spell && (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center">
                      {spell.icon}
                    </div>
                    {cooldown > 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-black/50 rounded-b-lg"
                        style={{ height: `${cooldownPercent}%` }}
                      />
                    )}
                    {player && player.mana < spell.manaCost && (
                      <div className="absolute top-0 right-0 text-xs text-red-400">
                        MP
                      </div>
                    )}
                  </>
                )}
                {!spell && (
                  <div className="text-gray-600 text-xs">Empty</div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

