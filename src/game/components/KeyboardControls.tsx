import { useEffect, useRef } from 'react'
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
  const isMovingRef = useRef(false) // Track if player is actively moving

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
        const { toggleCameraMode, cameraMode } = useGameStore.getState()
        const newMode = cameraMode === 'first-person' ? 'third-person' : 'first-person'
        toggleCameraMode()
        console.log('🔹 Camera mode toggled:', newMode, 'Current mode:', cameraMode)
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

  // Movement update loop
  useEffect(() => {
    if (!player || isMobile()) return

    const interval = setInterval(() => {
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
        // Clear movement keys when modal opens to prevent stuck movement
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
        isMovingRef.current = true
        const { setIsPlayerMoving } = useGameStore.getState()
        setIsPlayerMoving(true) // Mark player as actively moving
        
        // Calculate speed based on actual interval time (16ms = ~60 FPS)
        // Increased speed multiplier for better visibility during testing
        const deltaTime = 16 / 1000 // Convert ms to seconds
        const speedMultiplier = import.meta.env.DEV ? 2.0 : 1.0 // 2x speed in dev mode
        const speed = GAME_CONFIG.playerSpeed * deltaTime * speedMultiplier
        const oldX = player.position.x
        const oldZ = player.position.z
        const newX = oldX + moveX * speed
        const newZ = oldZ + moveZ * speed
        const newRotation = Math.atan2(moveX, moveZ)

        // Debug: Log every movement calculation
        if (import.meta.env.DEV) {
          console.log('🎮 WASD Movement:', {
            keys: Array.from(keys),
            moveDir: { x: moveX, z: moveZ },
            speed: speed.toFixed(4),
            oldPos: { x: oldX.toFixed(2), z: oldZ.toFixed(2) },
            newPos: { x: newX.toFixed(2), z: newZ.toFixed(2) },
            delta: { x: (newX - oldX).toFixed(4), z: (newZ - oldZ).toFixed(4) }
          })
        }

        // Update position locally (client-side prediction)
        // Force update by creating new position object
        const newPosition = { x: newX, y: player.position.y, z: newZ }
        updatePlayerPosition(newPosition)
        updatePlayerRotation(newRotation)
      } else {
        // No keys pressed - player stopped moving
        if (isMovingRef.current) {
          isMovingRef.current = false
          const { setIsPlayerMoving } = useGameStore.getState()
          setIsPlayerMoving(false) // Mark player as not moving
          if (import.meta.env.DEV) {
            console.log('⏹️ Player stopped moving')
          }
        }
      }

      // Spell casting (number keys 1-5) - also disabled when modals are open
      if (!isAnyModalOpen) {
        for (let slot = 0; slot < 5; slot++) {
          const key = String(slot + 1)
          if (keys.has(key)) {
            const cooldown = spellCooldowns.current.get(slot) || 0
            if (cooldown <= 0) {
              const spell = getEquippedSpell(slot)
              if (spell && player.mana >= spell.manaCost) {
                // Consume mana
                updatePlayerMana(player.mana - spell.manaCost)
                
                // Set cooldown
                spellCooldowns.current.set(slot, spell.cooldown)
                
                // Queue spell cast
                queueSpellCast(spell.id)
                
                // Remove key to prevent spam (will be re-added if still held)
                keysPressed.current.delete(key)
              }
            }
          }
        }
      }
    }, 16) // ~60 FPS

    return () => clearInterval(interval)
  }, [player, updatePlayerPosition, updatePlayerRotation, getEquippedSpell, updatePlayerMana, queueSpellCast, isAnyModalOpen])

  // Spell cooldown updates
  useEffect(() => {
    if (isMobile()) return

    const interval = setInterval(() => {
      spellCooldowns.current.forEach((time, slot) => {
        if (time > 0) {
          spellCooldowns.current.set(slot, time - 16) // Subtract frame time
        } else {
          spellCooldowns.current.delete(slot)
        }
      })
    }, 16)

    return () => clearInterval(interval)
  }, [])

  // This component doesn't render anything
  return null
}

