import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { isMobile } from '../data/config'
import { triggerHapticPattern, HAPTIC_PATTERNS } from '../utils/haptics'
import { calculateResponsiveScale, hapticFeedback } from '../utils/mobileOptimizations'
import { createGestureRecognizer, SwipeDirection } from '../utils/gestureRecognition'

export default function TouchControls() {
  const { player, getEquippedSpell, updatePlayerPosition, updatePlayerRotation, updatePlayerMana } = useGameStore()
  const joystickRef = useRef<HTMLDivElement>(null)
  const spellWheelRef = useRef<HTMLDivElement>(null)
  const gestureAreaRef = useRef<HTMLDivElement>(null)
  const [_joystick, setJoystick] = useState<any>(null)
  const [spellCooldowns, setSpellCooldowns] = useState<Map<number, number>>(new Map())
  const moveDirectionRef = useRef({ x: 0, y: 0 })
  const gestureRecognizerRef = useRef<ReturnType<typeof createGestureRecognizer> | null>(null)
  
  // Debounce state for spell casting to reduce input lag
  const lastSpellCastTime = useRef<number>(0)
  const SPELL_CAST_DEBOUNCE = 20 // 20ms debounce

  // Setup gesture recognition for swipe gestures (dodge/dash)
  useEffect(() => {
    if (!isMobile() || !gestureAreaRef.current) return

    gestureRecognizerRef.current = createGestureRecognizer(gestureAreaRef.current, {
      onSwipe: (direction: SwipeDirection, distance: number, velocity: number) => {
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
      onLongPress: (position) => {
        // Long press for context menu (future feature)
        hapticFeedback.warning()
      },
      onPinch: (scale, center) => {
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
        fadeTime: 250,
        dynamicPage: true, // Better touch handling
        restOpacity: 0.5, // Visual feedback
        catchDistance: 150 // Larger catch distance for easier interaction
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

  // Spell cooldown updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSpellCooldowns(prev => {
        const newCooldowns = new Map(prev)
        newCooldowns.forEach((time, slot) => {
          if (time > 0) {
            newCooldowns.set(slot, time - 100)
          } else {
            newCooldowns.delete(slot)
          }
        })
        return newCooldowns
      })
    }, 100)

    return () => clearInterval(interval)
  }, [])

  const handleSpellCast = (slot: number) => {
    // Debounce spell casting to reduce input lag by 20ms
    const now = Date.now()
    if (now - lastSpellCastTime.current < SPELL_CAST_DEBOUNCE) {
      return
    }
    lastSpellCastTime.current = now

    if (spellCooldowns.get(slot) && spellCooldowns.get(slot)! > 0) {
      // Haptic feedback for cooldown
      hapticFeedback.warning()
      return
    }

    const spell = getEquippedSpell(slot)
    if (!spell || !player) {
      hapticFeedback.light()
      return
    }

    if (player.mana < spell.manaCost) {
      // Haptic feedback for insufficient mana
      hapticFeedback.error()
      return
    }

    // Consume mana
    updatePlayerMana(player.mana - spell.manaCost)

    // Set cooldown
    setSpellCooldowns(prev => {
      const newCooldowns = new Map(prev)
      newCooldowns.set(slot, spell.cooldown)
      return newCooldowns
    })

    // Haptic feedback for successful spell cast
    triggerHapticPattern(HAPTIC_PATTERNS.spellCast)
    hapticFeedback.medium()

    // Queue spell cast for Game component to process (with debounce)
    setTimeout(() => {
      useGameStore.getState().queueSpellCast(spell.id)
    }, SPELL_CAST_DEBOUNCE)
  }

  if (!isMobile()) return null

  const uiScale = calculateResponsiveScale()
  const buttonSize = Math.max(uiScale.buttonSize, 44) // Ensure minimum 44px touch target

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
      
      {/* Left Joystick */}
      <div
        ref={joystickRef}
        className="absolute left-0 bottom-0 pointer-events-auto"
        style={{ 
          touchAction: 'none',
          width: `${uiScale.buttonSize * 2.5}px`,
          height: `${uiScale.buttonSize * 2.5}px`,
          zIndex: 20
        }}
      />

      {/* Right Side - Spell Wheel/Hotbar */}
      <div
        ref={spellWheelRef}
        className="absolute right-4 bottom-4 pointer-events-auto"
        style={{
          gap: `${uiScale.spacing}px`
        }}
      >
        <div className="flex flex-col" style={{ gap: `${uiScale.spacing}px` }}>
          {[0, 1, 2, 3, 4].map(slot => {
            const spell = getEquippedSpell(slot)
            const cooldown = spellCooldowns.get(slot) || 0
            const cooldownPercent = spell ? (cooldown / spell.cooldown) * 100 : 0
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

