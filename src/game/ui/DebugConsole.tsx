/**
 * Debug Console Component
 * In-game debug command console for development
 */

import { useState, useEffect, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'

interface Command {
  name: string
  description: string
  execute: (args: string[]) => void
}

export default function DebugConsole() {
  const { player, setPlayer, addItem, addCredits, addXP } = useGameStore()
  const [isOpen, setIsOpen] = useState(false)
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const commands: Map<string, Command> = new Map([
    ['help', {
      name: 'help',
      description: 'Show available commands',
      execute: () => {
        console.log('Available commands:')
        commands.forEach(cmd => {
          console.log(`  ${cmd.name}: ${cmd.description}`)
        })
      }
    }],
    ['teleport', {
      name: 'teleport',
      description: 'Teleport to coordinates (x y z)',
      execute: (args: string[]) => {
        if (args.length < 3) {
          console.log('Usage: teleport <x> <y> <z>')
          return
        }
        const x = parseFloat(args[0])
        const y = parseFloat(args[1])
        const z = parseFloat(args[2])
        if (player) {
          setPlayer({ ...player, position: { x, y, z } })
          console.log(`Teleported to ${x}, ${y}, ${z}`)
        }
      }
    }],
    ['spawn', {
      name: 'spawn',
      description: 'Spawn item (itemId quantity)',
      execute: (args: string[]) => {
        if (args.length < 1) {
          console.log('Usage: spawn <itemId> [quantity]')
          return
        }
        const quantity = args[1] ? parseInt(args[1]) : 1
        addItem(args[0], quantity)
        console.log(`Spawned ${quantity}x ${args[0]}`)
      }
    }],
    ['give', {
      name: 'give',
      description: 'Give credits or XP (credits|xp amount)',
      execute: (args: string[]) => {
        if (args.length < 2) {
          console.log('Usage: give <credits|xp> <amount>')
          return
        }
        const amount = parseInt(args[1])
        if (args[0] === 'credits') {
          addCredits(amount)
          console.log(`Gave ${amount} credits`)
        } else if (args[0] === 'xp') {
          addXP(amount)
          console.log(`Gave ${amount} XP`)
        }
      }
    }],
    ['level', {
      name: 'level',
      description: 'Set player level',
      execute: (args: string[]) => {
        if (args.length < 1) {
          console.log('Usage: level <level>')
          return
        }
        const level = parseInt(args[0])
        if (player) {
          setPlayer({ ...player, level })
          console.log(`Set level to ${level}`)
        }
      }
    }],
    ['health', {
      name: 'health',
      description: 'Set player health',
      execute: (args: string[]) => {
        if (args.length < 1) {
          console.log('Usage: health <amount>')
          return
        }
        const health = parseInt(args[0])
        if (player) {
          setPlayer({ ...player, health, maxHealth: Math.max(player.maxHealth, health) })
          console.log(`Set health to ${health}`)
        }
      }
    }],
    ['mana', {
      name: 'mana',
      description: 'Set player mana',
      execute: (args: string[]) => {
        if (args.length < 1) {
          console.log('Usage: mana <amount>')
          return
        }
        const mana = parseInt(args[0])
        if (player) {
          setPlayer({ ...player, mana, maxMana: Math.max(player.maxMana, mana) })
          console.log(`Set mana to ${mana}`)
        }
      }
    }],
    ['clear', {
      name: 'clear',
      description: 'Clear console',
      execute: () => {
        console.clear()
      }
    }],
    ['inspect', {
      name: 'inspect',
      description: 'Inspect entity (enemy|loot|player <id>)',
      execute: (args: string[]) => {
        if (args.length < 2) {
          console.log('Usage: inspect <type> <id>')
          console.log('Types: enemy, loot, player')
          return
        }
        const [type, id] = args
        const store = useGameStore.getState()
        
        switch (type) {
          case 'enemy':
            const enemy = store.enemies.get(id)
            if (enemy) {
              console.log('Enemy:', {
                id: enemy.id,
                type: enemy.type,
                level: enemy.level,
                health: `${enemy.health}/${enemy.maxHealth}`,
                position: enemy.position,
                rotation: enemy.rotation
              })
            } else {
              console.log(`Enemy ${id} not found`)
            }
            break
          case 'loot':
            const loot = store.lootDrops.get(id)
            if (loot) {
              console.log('Loot:', {
                id: loot.id,
                item: loot.item,
                position: loot.position,
                ownerId: loot.ownerId,
                expiresAt: new Date(loot.expiresAt).toLocaleString()
              })
            } else {
              console.log(`Loot ${id} not found`)
            }
            break
          case 'player':
            if (id === 'self' || id === player?.id) {
              console.log('Player (self):', player)
            } else {
              const otherPlayer = store.otherPlayers.get(id)
              if (otherPlayer) {
                console.log('Player:', otherPlayer)
              } else {
                console.log(`Player ${id} not found`)
              }
            }
            break
          default:
            console.log(`Unknown entity type: ${type}`)
        }
      }
    }],
    ['list', {
      name: 'list',
      description: 'List entities (enemies|loot|players)',
      execute: (args: string[]) => {
        if (args.length < 1) {
          console.log('Usage: list <type>')
          console.log('Types: enemies, loot, players')
          return
        }
        const store = useGameStore.getState()
        
        switch (args[0]) {
          case 'enemies':
            console.log(`Enemies (${store.enemies.size}):`)
            store.enemies.forEach((enemy, id) => {
              console.log(`  ${id}: ${enemy.type} Lv${enemy.level} HP:${enemy.health}/${enemy.maxHealth}`)
            })
            break
          case 'loot':
            console.log(`Loot Drops (${store.lootDrops.size}):`)
            store.lootDrops.forEach((loot, id) => {
              console.log(`  ${id}: ${loot.item.id} (${loot.item.name})`)
            })
            break
          case 'players':
            console.log(`Players (${store.otherPlayers.size + (player ? 1 : 0)}):`)
            if (player) {
              console.log(`  ${player.id}: ${player.name} (self)`)
            }
            store.otherPlayers.forEach((p, id) => {
              console.log(`  ${id}: ${p.name} Lv${p.level}`)
            })
            break
          default:
            console.log(`Unknown entity type: ${args[0]}`)
        }
      }
    }]
  ])

  // Toggle console with backtick key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '`' && import.meta.env.DEV) {
        setIsOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Focus input when console opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const [commandName, ...args] = input.trim().split(/\s+/)
    const command = commands.get(commandName.toLowerCase())

    if (command) {
      command.execute(args)
    } else {
      console.log(`Unknown command: ${commandName}. Type 'help' for available commands.`)
    }

    // Add to history
    setCommandHistory(prev => [...prev, input])
    setHistoryIndex(-1)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1)
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex >= 0) {
        const newIndex = historyIndex + 1
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1)
          setInput('')
        } else {
          setHistoryIndex(newIndex)
          setInput(commandHistory[newIndex])
        }
      }
    }
  }

  if (!isOpen || !import.meta.env.DEV) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/90 border-t-2 border-cyan-500 z-50 pointer-events-auto">
      <div className="p-2">
        <div className="text-cyan-400 text-xs mb-1">Debug Console (Press ` to close)</div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <span className="text-cyan-400">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-cyan-300 outline-none"
            placeholder="Enter command..."
            autoComplete="off"
          />
        </form>
        <div className="text-xs text-gray-500 mt-1">
          Type 'help' for available commands
        </div>
      </div>
    </div>
  )
}

