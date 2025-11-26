/**
 * Admin Dashboard
 * Admin tools for player management, server console, and economy management
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import EnhancedModal from './components/EnhancedModal'

interface PlayerData {
  id: string
  name: string
  level: number
  credits: number
  xp: number
  online: boolean
}

export default function AdminDashboard() {
  const { player } = useGameStore()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'players' | 'console' | 'economy' | 'content'>('players')
  const [players, _setPlayers] = useState<PlayerData[]>([])
  const [consoleOutput, setConsoleOutput] = useState<string[]>([])
  const [consoleInput, setConsoleInput] = useState('')

  // Check if player is admin (would check server-side in production)
  const isAdmin = import.meta.env.DEV || player?.name === 'admin'

  useEffect(() => {
    // Toggle with Ctrl+Shift+A
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A' && isAdmin) {
        setIsOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isAdmin])

  if (!isAdmin) return null

  const handleConsoleCommand = (command: string) => {
    setConsoleOutput(prev => [...prev, `> ${command}`])
    
    // Execute server command (would send to server in production)
    const [cmd, ...args] = command.split(' ')
    
    switch (cmd) {
      case 'help':
        setConsoleOutput(prev => [...prev, 'Available commands: kick, ban, unban, give, setlevel'])
        break
      case 'kick':
        setConsoleOutput(prev => [...prev, `Kicked player: ${args[0]}`])
        break
      case 'ban':
        setConsoleOutput(prev => [...prev, `Banned player: ${args[0]}`])
        break
      default:
        setConsoleOutput(prev => [...prev, `Unknown command: ${cmd}`])
    }
    
    setConsoleInput('')
  }

  return (
    <EnhancedModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Admin Dashboard"
      size="xl"
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-700">
          {(['players', 'console', 'economy', 'content'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-bold transition-all ${
                activeTab === tab
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="space-y-2 overflow-y-auto flex-1">
            <div className="text-gray-400 text-sm mb-4">
              Player Management (Server integration required)
            </div>
            {players.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-6xl mb-4">👥</div>
                <div className="text-xl">No players loaded</div>
              </div>
            ) : (
              players.map(p => (
                <div key={p.id} className="bg-gray-800 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="text-cyan-300 font-bold">{p.name}</div>
                    <div className="text-xs text-gray-400">
                      Level {p.level} • {p.credits} credits • {p.online ? 'Online' : 'Offline'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1 rounded">
                      View
                    </button>
                    <button className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs px-3 py-1 rounded">
                      Edit
                    </button>
                    <button className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded">
                      Kick
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Console Tab */}
        {activeTab === 'console' && (
          <div className="flex flex-col h-full">
            <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400 flex-1 overflow-y-auto mb-2">
              {consoleOutput.length === 0 ? (
                <div className="text-gray-500">Server console output will appear here...</div>
              ) : (
                consoleOutput.map((line, i) => (
                  <div key={i}>{line}</div>
                ))
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (consoleInput.trim()) {
                  handleConsoleCommand(consoleInput)
                }
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                className="flex-1 bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-300"
                placeholder="Enter server command..."
              />
              <button
                type="submit"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded"
              >
                Execute
              </button>
            </form>
          </div>
        )}

        {/* Economy Tab */}
        {activeTab === 'economy' && (
          <div className="space-y-4">
            <div className="text-gray-400 text-sm mb-4">
              Economy Management (Server integration required)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-cyan-400 font-bold mb-2">Total Credits</h3>
                <div className="text-2xl text-yellow-400">0</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-cyan-400 font-bold mb-2">Items in Circulation</h3>
                <div className="text-2xl text-cyan-400">0</div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-cyan-400 font-bold mb-2">Economy Actions</h3>
              <div className="flex gap-2">
                <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded">
                  Add Credits to All
                </button>
                <button className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded">
                  Reset Economy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4">
            <div className="text-gray-400 text-sm mb-4">
              Content Management (Server integration required)
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button className="bg-gray-800 hover:bg-gray-700 text-cyan-300 p-4 rounded-lg">
                Manage Quests
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 text-cyan-300 p-4 rounded-lg">
                Manage Items
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 text-cyan-300 p-4 rounded-lg">
                Manage Spells
              </button>
              <button className="bg-gray-800 hover:bg-gray-700 text-cyan-300 p-4 rounded-lg">
                Manage NPCs
              </button>
            </div>
          </div>
        )}
      </div>
    </EnhancedModal>
  )
}

