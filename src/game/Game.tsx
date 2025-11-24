import { useEffect, useRef, useState } from 'react'
import { useGameStore } from './store/useGameStore'
import EnhancedScene from './components/EnhancedScene'
import TouchControls from './components/TouchControls'
import { GAME_CONFIG } from './data/config'
import { getItem } from './data/items'
import { createSpellProjectile, updateSpellProjectile, checkSpellHit, SpellProjectile } from './systems/spellSystem'
import { joinRoom, leaveRoom, sendSpellCast, sendLootPickup } from './network/colyseus'
import { startMovementSync, stopMovementSync } from './network/syncSystem'
import { setupOfflineHandler } from './utils/offlineHandler'
import { getMobileOptimizationFlags, frameRateCap } from './utils/mobileOptimizations'

export default function Game() {
  const {
    player,
    enemies,
    addEnemy,
    removeEnemy,
    updateEnemy,
    updatePlayerHealth,
    addXP,
    addCredits,
    addItem,
    lootDrops,
    addLootDrop,
    removeLootDrop,
    isConnected
  } = useGameStore()

  const [spellProjectiles, setSpellProjectiles] = useState<SpellProjectile[]>([])
  const gameLoopRef = useRef<number | undefined>(undefined)
  const { spellCastQueue, clearSpellCastQueue } = useGameStore()

  // Setup offline handler
  useEffect(() => {
    const cleanup = setupOfflineHandler()
    return cleanup
  }, [])

  // Connect to multiplayer server
  useEffect(() => {
    if (!player) return

    let isConnecting = false
    let connectionAttempts = 0
    const MAX_RECONNECT_ATTEMPTS = 3

    const connect = async () => {
      if (isConnecting) return
      isConnecting = true

      try {
        // Get Firebase token before joining
        const { getIdToken } = await import('../firebase/auth')
        const firebaseToken = await getIdToken()
        
        await joinRoom(player.name, player.race, false, firebaseToken || undefined)
        startMovementSync()
        connectionAttempts = 0 // Reset on success
      } catch (error) {
        console.error('Failed to connect to server, playing offline:', error)
        connectionAttempts++
        
        // Only retry a few times, then give up
        if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          setTimeout(() => {
            isConnecting = false
            connect()
          }, 2000 * connectionAttempts) // Exponential backoff
        } else {
          console.warn('Max connection attempts reached, playing offline')
          isConnecting = false
        }
      } finally {
        if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
          isConnecting = false
        }
      }
    }

    connect()

    return () => {
      isConnecting = false
      leaveRoom()
      stopMovementSync()
    }
  }, [player?.id]) // Only reconnect if player ID changes, not on every player update

  // Process spell casts
  useEffect(() => {
    if (!player || spellCastQueue.length === 0) return

    const { isConnected } = useGameStore.getState()

    spellCastQueue.forEach(({ spellId }) => {
      if (isConnected) {
        // Multiplayer: send to server
        sendSpellCast(spellId, player.position, player.rotation)
      } else {
        // Offline: create projectile locally
        const projectile = createSpellProjectile(
          spellId,
          player.id,
          player.position,
          player.rotation
        )
        if (projectile) {
          setSpellProjectiles(prev => [...prev, projectile])
        }
      }
    })

    clearSpellCastQueue()
  }, [spellCastQueue, player, clearSpellCastQueue])

  // Game loop with frame rate capping
  useEffect(() => {
    if (!player) return

    const flags = getMobileOptimizationFlags()
    const targetFPS = flags.targetFPS
    const deltaTime = 1000 / targetFPS // Calculate delta based on target FPS

    const gameLoop = () => {
      // Update spell projectiles
      setSpellProjectiles(prev => {
        const updated = prev
          .map(proj => updateSpellProjectile(proj, deltaTime))
          .filter((proj): proj is SpellProjectile => proj !== null)
        
        // Release removed projectiles (handled in updateSpellProjectile)

        // Check collisions with enemies
        updated.forEach(projectile => {
          enemies.forEach(enemy => {
            if (checkSpellHit(projectile, enemy.position)) {
              // Deal damage
              const newHealth = enemy.health - projectile.spell.damage
              if (newHealth <= 0) {
                // Enemy killed
                removeEnemy(enemy.id)
                addXP(50)
                addCredits(25)

                // Drop loot
                const lootItem = getItem('cyber_scrap')
                if (lootItem) {
                  addLootDrop({
                    id: `loot_${Date.now()}`,
                    item: lootItem,
                    position: { ...enemy.position },
                    expiresAt: Date.now() + GAME_CONFIG.lootExpireTime
                  })
                }
              } else {
                updateEnemy(enemy.id, { health: newHealth })
              }
            }
          })
        })

        return updated
      })

      // Enemy spawning is handled by the server
      // Client only receives enemy updates via network sync

      // Clean up expired loot
      lootDrops.forEach(loot => {
        if (Date.now() > loot.expiresAt) {
          removeLootDrop(loot.id)
        }
      })

      // Check for loot pickup
      if (player) {
        lootDrops.forEach(loot => {
          const distance = Math.sqrt(
            Math.pow(player.position.x - loot.position.x, 2) +
            Math.pow(player.position.y - loot.position.y, 2) +
            Math.pow(player.position.z - loot.position.z, 2)
          )

            if (distance < 2 && (!loot.ownerId || loot.ownerId === player.id)) {
              // Pick up loot
              if (isConnected) {
                sendLootPickup(loot.id)
              } else {
                // Offline mode
                addItem(loot.item.id, 1)
                removeLootDrop(loot.id)
              }
            }
        })
      }
    }

    // Apply frame rate capping if on mobile
    let stopCap: (() => void) | null = null
    if (flags.isMobile && targetFPS < 60) {
      stopCap = frameRateCap.cap(targetFPS, gameLoop)
    } else {
      // Desktop: use standard requestAnimationFrame
      const standardLoop = () => {
        gameLoop()
        gameLoopRef.current = requestAnimationFrame(standardLoop)
      }
      gameLoopRef.current = requestAnimationFrame(standardLoop)
    }

    return () => {
      if (stopCap) {
        stopCap()
      } else if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [player, enemies, lootDrops, isConnected, addEnemy, removeEnemy, updateEnemy, addXP, addCredits, addItem, addLootDrop, removeLootDrop])

  // Handle player death
  useEffect(() => {
    if (player && player.health <= 0) {
      // Respawn player
      setTimeout(() => {
        updatePlayerHealth(player.maxHealth)
        useGameStore.getState().updatePlayerPosition({ x: 0, y: 1, z: 0 }) // Y=1 to stand on ground
      }, 2000)
    }
  }, [player, updatePlayerHealth])

  if (!player) return null

  return (
    <div 
      className="fixed inset-0 w-full h-full" 
      style={{ 
        zIndex: 1,
        backgroundColor: '#1a1a2e', // Lighter background color for better visibility
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto'
      }}
    >
      <EnhancedScene spellProjectiles={spellProjectiles} />
      <TouchControls />
    </div>
  )
}

