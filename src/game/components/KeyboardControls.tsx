import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'
import { isMobile } from '../data/config'
import { GAME_CONFIG } from '../data/config'

export default function KeyboardControls() {
  const { 
    player, 
    updatePlayerPosition, 
    updatePlayerRotation, 
    getEquippedSpell, 
    updatePlayerMana, 
    queueSpellCast,
    isInventoryOpen,
    isCraftingOpen,
    isMarketOpen,
    isSpellbookOpen,
    isChatOpen,
    isGuildOpen,
    isQuestOpen,
    isBattlePassOpen,
    isShopOpen,
    isTradeOpen,
    isAchievementOpen
  } = useGameStore()
  const keysPressed = useRef<Set<string>>(new Set())
  const spellCooldowns = useRef<Map<number, number>>(new Map())
  const lastUpdateTime = useRef<number>(0)

  // Check if any modal/UI is open
  const isAnyModalOpen = isInventoryOpen || isCraftingOpen || isMarketOpen || 
    isSpellbookOpen || isChatOpen || isGuildOpen || isQuestOpen || 
    isBattlePassOpen || isShopOpen || isTradeOpen || isAchievementOpen

  // Keyboard input handling
  useEffect(() => {
    if (isMobile()) return // Only for desktop

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if any modal is open
      const { 
        isInventoryOpen, isCraftingOpen, isMarketOpen, isSpellbookOpen, 
        isChatOpen, isGuildOpen, isQuestOpen, isBattlePassOpen, 
        isShopOpen, isTradeOpen, isAchievementOpen 
      } = useGameStore.getState()
      
      const isAnyModalOpen = isInventoryOpen || isCraftingOpen || isMarketOpen || 
        isSpellbookOpen || isChatOpen || isGuildOpen || isQuestOpen || 
        isBattlePassOpen || isShopOpen || isTradeOpen || isAchievementOpen

      // Don't register movement/spell keys if any modal is open
      if (isAnyModalOpen && ['w', 'a', 's', 'd', '1', '2', '3', '4', '5'].includes(e.key.toLowerCase())) {
        return
      }

      // Camera mode toggle (V key)
      if (e.key.toLowerCase() === 'v') {
        e.preventDefault()
        const { toggleCameraMode } = useGameStore.getState()
        toggleCameraMode()
        return
      }

      // Test movement (T key) - force move player for debugging
      if (e.key.toLowerCase() === 't' && import.meta.env.DEV) {
        e.preventDefault()
        const { player, updatePlayerPosition } = useGameStore.getState()
        if (player) {
          const testPos = { 
            x: player.position.x + 5, 
            y: player.position.y, 
            z: player.position.z + 5 
          }
          console.log('🧪 TEST: Forcing position update:', testPos)
          updatePlayerPosition(testPos)
        }
        return
      }

      // Prevent default for game controls
      if (['w', 'a', 's', 'd', ' ', '1', '2', '3', '4', '5'].includes(e.key.toLowerCase())) {
        e.preventDefault()
      }
      keysPressed.current.add(e.key.toLowerCase())
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase())
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Movement update using useFrame - synced with React Three Fiber rendering
  useFrame((state, delta) => {
    if (!player || isMobile()) return

    // Get fresh state every frame
    const currentPlayer = useGameStore.getState().player
    if (!currentPlayer) return
    
    // Don't process movement if any modal is open
    const { 
      isInventoryOpen, isCraftingOpen, isMarketOpen, isSpellbookOpen, 
      isChatOpen, isGuildOpen, isQuestOpen, isBattlePassOpen, 
      isShopOpen, isTradeOpen, isAchievementOpen 
    } = useGameStore.getState()
    
    const isAnyModalOpen = isInventoryOpen || isCraftingOpen || isMarketOpen || 
      isSpellbookOpen || isChatOpen || isGuildOpen || isQuestOpen || 
      isBattlePassOpen || isShopOpen || isTradeOpen || isAchievementOpen

    if (isAnyModalOpen) {
      // Clear movement keys when modal opens
      keysPressed.current.delete('w')
      keysPressed.current.delete('a')
      keysPressed.current.delete('s')
      keysPressed.current.delete('d')
      return
    }

    const keys = keysPressed.current
    let moveX = 0
    let moveZ = 0

    // WASD movement
    if (keys.has('w')) moveZ -= 1
    if (keys.has('s')) moveZ += 1
    if (keys.has('a')) moveX -= 1
    if (keys.has('d')) moveX += 1

    // Normalize diagonal movement
    if (moveX !== 0 && moveZ !== 0) {
      moveX *= 0.707 // 1/sqrt(2)
      moveZ *= 0.707
    }

    if (moveX !== 0 || moveZ !== 0) {
      const { setIsPlayerMoving } = useGameStore.getState()
      setIsPlayerMoving(true)
      
      // Calculate movement using delta time (frame-based, not interval-based)
      const speed = GAME_CONFIG.playerSpeed * delta * 3.0 // Speed multiplier for visibility
      const oldX = currentPlayer.position.x
      const oldZ = currentPlayer.position.z
      const newX = oldX + moveX * speed
      const newZ = oldZ + moveZ * speed
      const newRotation = Math.atan2(moveX, moveZ)

      // Debug logging - log movement with actual values
      if (import.meta.env.DEV && (Math.abs(newX - oldX) > 0.01 || Math.abs(newZ - oldZ) > 0.01)) {
        console.log('🎮 MOVEMENT:', {
          keys: Array.from(keys),
          speed: speed.toFixed(4),
          oldPos: `(${oldX.toFixed(2)}, ${oldZ.toFixed(2)})`,
          newPos: `(${newX.toFixed(2)}, ${newZ.toFixed(2)})`,
          moved: `${((newX - oldX) * 100).toFixed(1)}m, ${((newZ - oldZ) * 100).toFixed(1)}m`
        })
      }

      // Update position immediately
      updatePlayerPosition({ x: newX, y: currentPlayer.position.y, z: newZ })
      updatePlayerRotation(newRotation)
    } else {
      // No keys pressed - player stopped moving
      const { setIsPlayerMoving } = useGameStore.getState()
      setIsPlayerMoving(false)
    }

    // Spell casting (number keys 1-5)
    if (!isAnyModalOpen) {
      for (let slot = 0; slot < 5; slot++) {
        const key = String(slot + 1)
        if (keys.has(key)) {
          const cooldown = spellCooldowns.current.get(slot) || 0
          if (cooldown <= 0) {
            const spell = getEquippedSpell(slot)
            if (spell && currentPlayer.mana >= spell.manaCost) {
              updatePlayerMana(currentPlayer.mana - spell.manaCost)
              spellCooldowns.current.set(slot, spell.cooldown)
              queueSpellCast(spell.id)
              keysPressed.current.delete(key)
            }
          }
        }
      }
    }

    // Update spell cooldowns
    spellCooldowns.current.forEach((time, slot) => {
      if (time > 0) {
        spellCooldowns.current.set(slot, Math.max(0, time - delta * 1000))
      } else {
        spellCooldowns.current.delete(slot)
      }
    })
  })

  // This component doesn't render anything
  return null
}
