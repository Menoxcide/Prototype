import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { isMobile } from '../data/config'
import { triggerHapticPattern, HAPTIC_PATTERNS } from '../utils/haptics'

export default function TouchControls() {
  const { player, getEquippedSpell, updatePlayerPosition, updatePlayerRotation, updatePlayerMana } = useGameStore()
  const joystickRef = useRef<HTMLDivElement>(null)
  const spellWheelRef = useRef<HTMLDivElement>(null)
  const [_joystick, setJoystick] = useState<any>(null)
  const [spellCooldowns, setSpellCooldowns] = useState<Map<number, number>>(new Map())
  const moveDirectionRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!isMobile() || !joystickRef.current) return

    // Dynamically import nipplejs
    import('nipplejs').then((nipplejs) => {
      const manager = nipplejs.default.create({
        zone: joystickRef.current!,
        mode: 'static',
        position: { left: '80px', bottom: '80px' },
        color: '#00ffff',
        size: 100,
        threshold: 0.1,
        fadeTime: 250
      })

      manager.on('move', (_, data) => {
        const angle = data.angle.radian
        const force = data.force
        moveDirectionRef.current = {
          x: Math.cos(angle) * force,
          y: Math.sin(angle) * force
        }
      })

      manager.on('end', () => {
        moveDirectionRef.current = { x: 0, y: 0 }
      })

      setJoystick(manager)

      return () => {
        manager.destroy()
      }
    })
  }, [])

  // Movement update loop
  useEffect(() => {
    if (!player) return

    const interval = setInterval(() => {
      const { x, y } = moveDirectionRef.current
      if (x !== 0 || y !== 0) {
        const speed = 0.1
        const newX = player.position.x + x * speed
        const newZ = player.position.z + y * speed
        const newRotation = Math.atan2(x, y)

        updatePlayerPosition({ x: newX, y: player.position.y, z: newZ })
        updatePlayerRotation(newRotation)
      }
    }, 16) // ~60 FPS

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
    if (spellCooldowns.get(slot) && spellCooldowns.get(slot)! > 0) return

    const spell = getEquippedSpell(slot)
    if (!spell || !player) return

    if (player.mana < spell.manaCost) return

    // Consume mana
    updatePlayerMana(player.mana - spell.manaCost)

    // Set cooldown
    setSpellCooldowns(prev => {
      const newCooldowns = new Map(prev)
      newCooldowns.set(slot, spell.cooldown)
      return newCooldowns
    })

    // Haptic feedback
    triggerHapticPattern(HAPTIC_PATTERNS.spellCast)

    // Queue spell cast for Game component to process
    useGameStore.getState().queueSpellCast(spell.id)
  }

  if (!isMobile()) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-20">
      {/* Left Joystick */}
      <div
        ref={joystickRef}
        className="absolute left-0 bottom-0 w-32 h-32 pointer-events-auto"
        style={{ touchAction: 'none' }}
      />

      {/* Right Side - Spell Wheel/Hotbar */}
      <div
        ref={spellWheelRef}
        className="absolute right-4 bottom-4 pointer-events-auto"
      >
        <div className="flex flex-col gap-2">
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
                className={`relative w-14 h-14 rounded-lg border-2 font-bold text-xl transition-all ${
                  canCast
                    ? 'bg-gray-800 border-cyan-500 hover:border-cyan-400 active:scale-95'
                    : 'bg-gray-900 border-gray-700 opacity-50'
                }`}
                style={{
                  touchAction: 'manipulation'
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

