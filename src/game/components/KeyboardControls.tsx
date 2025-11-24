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
        const speed = GAME_CONFIG.playerSpeed * 0.016 // Convert to per-frame speed (assuming 60 FPS)
        const newX = player.position.x + moveX * speed
        const newZ = player.position.z + moveZ * speed
        const newRotation = Math.atan2(moveX, moveZ)

        updatePlayerPosition({ x: newX, y: player.position.y, z: newZ })
        updatePlayerRotation(newRotation)
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

