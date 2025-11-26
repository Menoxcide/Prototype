import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { sendChatMessage, sendWhisper, sendGuildChat } from '../network/colyseus'
import DraggableResizable from '../components/DraggableResizable'

type TabType = 'chat' | 'status' | 'combat'

export default function Chat() {
  const { 
    isChatOpen, 
    toggleChat, 
    chatMessages, 
    addChatMessage, 
    player, 
    otherPlayers,
    isConnected,
    networkLatency,
    packetLoss,
    currentZone
  } = useGameStore()
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  const [inputMessage, setInputMessage] = useState('')
  const [chatMode, setChatMode] = useState<'global' | 'guild' | 'whisper'>('global')
  const [whisperTarget, setWhisperTarget] = useState<string>('')
  const [sendButtonHighlight, setSendButtonHighlight] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const combatLogEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollCombatLogToBottom = () => {
    combatLogEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom()
    } else if (activeTab === 'combat') {
      scrollCombatLogToBottom()
    }
  }, [chatMessages, activeTab])

  const handleSend = () => {
    if (!inputMessage.trim() || !player) return

    const messageText = inputMessage.trim()
    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Optimistic update: immediately add message to chat
    addChatMessage({
      id: tempId,
      playerId: player.id,
      playerName: player.name,
      message: messageText,
      timestamp: Date.now(),
      type: chatMode,
      color: chatMode === 'guild' ? '#9d00ff' : chatMode === 'whisper' ? '#00ff00' : '#00ffff'
    })

    // Visual feedback: highlight send button
    setSendButtonHighlight(true)
    setTimeout(() => setSendButtonHighlight(false), 300)

    // Send to server if connected
    if (isConnected) {
      if (chatMode === 'whisper' && whisperTarget) {
        sendWhisper(whisperTarget, messageText)
      } else if (chatMode === 'guild') {
        sendGuildChat(messageText)
      } else {
        // Global chat
        sendChatMessage(messageText)
      }
    }
    // If offline, message is already added above

    setInputMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  if (!isChatOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-20 right-4 bg-gray-900/90 border-2 border-cyan-500 rounded-lg px-4 py-2 text-cyan-400 font-bold pointer-events-auto z-30 hover:bg-gray-800 transition-all"
      >
        💬 Chat
      </button>
    )
  }

  // Filter combat messages
  const combatMessages = chatMessages.filter(msg => {
    const isCombatLog = msg.type === 'system' && (
      msg.playerName.includes('[Combat]') ||
      msg.message.toLowerCase().includes('damage') ||
      msg.message.toLowerCase().includes('kill') ||
      msg.message.toLowerCase().includes('heal') ||
      msg.message.toLowerCase().includes('critical') ||
      msg.message.toLowerCase().includes('combo') ||
      msg.message.toLowerCase().includes('defeated') ||
      msg.message.toLowerCase().includes('attack')
    )
    return isCombatLog
  })

  const chatHeader = (
    <div className="flex justify-between items-center p-2 border-b border-cyan-500 bg-gray-900/95 rounded-t-lg">
      <div className="flex gap-1 flex-1">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-3 py-1.5 rounded text-sm font-bold transition-all ${
            activeTab === 'chat' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50' 
              : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setActiveTab('status')}
          className={`flex-1 px-3 py-1.5 rounded text-sm font-bold transition-all ${
            activeTab === 'status' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50' 
              : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
          }`}
        >
          Status
        </button>
        <button
          onClick={() => setActiveTab('combat')}
          className={`flex-1 px-3 py-1.5 rounded text-sm font-bold transition-all ${
            activeTab === 'combat' 
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/50' 
              : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
          }`}
        >
          Combat
        </button>
      </div>
      <button
        onClick={toggleChat}
        className="ml-2 text-gray-400 hover:text-cyan-400 text-xl leading-none w-6 h-6 flex items-center justify-center"
        aria-label="Close chat"
      >
        ×
      </button>
    </div>
  )

  return (
    <DraggableResizable
      id="chat-window"
      storageKey="chat"
      defaultPosition={{ 
        x: typeof window !== 'undefined' ? window.innerWidth - 340 : 200, 
        y: typeof window !== 'undefined' ? window.innerHeight - 400 : 200 
      }}
      defaultSize={{ width: 320, height: 384 }}
      minWidth={250}
      minHeight={200}
      maxWidth={600}
      maxHeight={800}
      className="pointer-events-auto z-30 bg-gray-900/95 border-2 border-cyan-500 rounded-lg neon-border"
      header={chatHeader}
    >
      <div className="flex flex-col h-full overflow-hidden rounded-b-lg">
        {/* Chat Tab Content */}
        {activeTab === 'chat' && (
          <>
            {chatMode === 'whisper' && (
              <div className="p-2 border-b border-cyan-500">
                <label htmlFor="whisper-target" className="sr-only">Select player to whisper</label>
                <select
                  id="whisper-target"
                  name="whisper-target"
                  value={whisperTarget}
                  onChange={(e) => setWhisperTarget(e.target.value)}
                  className="w-full bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-300 focus:outline-none"
                >
                  <option value="">Select player...</option>
                  {Array.from(otherPlayers.values())
                    .filter((player, index, self) => 
                      // Remove duplicates by name (keep first occurrence)
                      index === self.findIndex(p => p.name === player.name)
                    )
                    .map((otherPlayer) => (
                      <option key={otherPlayer.id} value={otherPlayer.id}>
                        {otherPlayer.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Chat Mode Buttons */}
            <div className="p-2 border-b border-cyan-500 bg-gray-900/95 flex gap-2">
              <button
                onClick={() => setChatMode('global')}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  chatMode === 'global' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
                }`}
              >
                Global
              </button>
              {player?.guildId && (
                <button
                  onClick={() => setChatMode('guild')}
                  className={`px-3 py-1 rounded text-xs font-bold ${
                    chatMode === 'guild' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-purple-400 hover:bg-gray-700'
                  }`}
                >
                  Guild
                </button>
              )}
              <button
                onClick={() => setChatMode('whisper')}
                className={`px-3 py-1 rounded text-xs font-bold ${
                  chatMode === 'whisper' ? 'bg-green-600 text-white' : 'bg-gray-800 text-green-400 hover:bg-gray-700'
                }`}
              >
                Whisper
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ minHeight: 0 }}>
              {chatMessages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">
                  No messages yet. Start chatting!
                </div>
              ) : (
                chatMessages.map(msg => {
                  const getColor = () => {
                    if (msg.type === 'guild') return '#9d00ff'
                    if (msg.type === 'whisper') return '#00ff00'
                    if (msg.type === 'system') return msg.color || '#ff00ff'
                    return msg.color || '#00ffff'
                  }

                  const isCombatLog = msg.type === 'system' && msg.playerName.includes('[Combat]')
                  const isStatusLog = msg.type === 'system' && msg.playerName.includes('[Status]')

                  return (
                    <div 
                      key={msg.id} 
                      className={`text-sm ${
                        isCombatLog ? 'bg-red-900/20 border-l-2 border-red-500 pl-2' : 
                        isStatusLog ? 'bg-blue-900/20 border-l-2 border-blue-500 pl-2' : 
                        ''
                      }`}
                    >
                      {msg.type === 'whisper' && (
                        <span className="text-green-400 text-xs">[Whisper] </span>
                      )}
                      {msg.type === 'guild' && (
                        <span className="text-purple-400 text-xs">[Guild] </span>
                      )}
                      {isCombatLog && (
                        <span className="text-red-400 text-xs">⚔️ </span>
                      )}
                      {isStatusLog && (
                        <span className="text-blue-400 text-xs">ℹ️ </span>
                      )}
                      <span
                        className="font-bold"
                        style={{ color: getColor() }}
                      >
                        {msg.playerName}:
                      </span>
                      <span className="text-gray-300 ml-2">{msg.message}</span>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t border-cyan-500 flex gap-2 shrink-0 bg-gray-900/95">
              <label htmlFor="chat-message" className="sr-only">Type a message</label>
              <input
                id="chat-message"
                name="chat-message"
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                onKeyDown={(e) => {
                  // Prevent game controls from receiving keyboard events
                  e.stopPropagation()
                  // Allow Escape to blur
                  if (e.key === 'Escape') {
                    e.currentTarget.blur()
                  }
                }}
                placeholder="Type a message..."
                maxLength={200}
                className="flex-1 min-w-0 bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
              />
              <button
                onClick={handleSend}
                className={`shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded transition-all ${
                  sendButtonHighlight ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900' : ''
                }`}
              >
                Send
              </button>
            </div>
          </>
        )}

        {/* Status Tab Content */}
        {activeTab === 'status' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-4" style={{ minHeight: 0 }}>
            {!player ? (
              <div className="text-center text-gray-400 text-sm py-4">
                No player data available
              </div>
            ) : (
              <>
                {/* System Info */}
                <div>
                  <h3 className="text-cyan-400 font-bold text-sm mb-2 border-b border-cyan-500/30 pb-1">System Info</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Connection:</span>
                      <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                        {isConnected ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    {networkLatency > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Latency:</span>
                        <span className={networkLatency < 100 ? 'text-green-400' : networkLatency < 300 ? 'text-yellow-400' : 'text-red-400'}>
                          {networkLatency}ms
                        </span>
                      </div>
                    )}
                    {packetLoss > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Packet Loss:</span>
                        <span className={packetLoss < 1 ? 'text-green-400' : packetLoss < 5 ? 'text-yellow-400' : 'text-red-400'}>
                          {packetLoss.toFixed(1)}%
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Server Status:</span>
                      <span className={isConnected ? 'text-green-400' : 'text-gray-500'}>
                        {isConnected ? 'Connected' : 'Disconnected'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Game Info */}
                <div>
                  <h3 className="text-cyan-400 font-bold text-sm mb-2 border-b border-cyan-500/30 pb-1">Game Info</h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Zone:</span>
                      <span className="text-cyan-300">{currentZone || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Server State:</span>
                      <span className="text-cyan-300">{isConnected ? 'Active' : 'Offline'}</span>
                    </div>
                  </div>
                </div>

                {/* Player Info */}
                <div>
                  <h3 className="text-cyan-400 font-bold text-sm mb-2 border-b border-cyan-500/30 pb-1">Player Info</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-cyan-300">{player.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Level:</span>
                      <span className="text-cyan-300">{player.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Race:</span>
                      <span className="text-cyan-300 capitalize">{player.race}</span>
                    </div>
                    {player.tradition && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tradition:</span>
                        <span className="text-cyan-300 capitalize">{player.tradition}</span>
                      </div>
                    )}
                    <div className="pt-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">XP:</span>
                        <span className="text-cyan-300">{player.xp} / {player.xpToNext}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-1.5">
                        <div
                          className="bg-cyan-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(player.xp / player.xpToNext) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Credits:</span>
                      <span className="text-cyan-300">{player.credits.toLocaleString()}</span>
                    </div>
                    <div className="pt-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Health:</span>
                        <span className="text-red-300">{player.health} / {player.maxHealth}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="pt-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-400">Mana:</span>
                        <span className="text-blue-300">{player.mana} / {player.maxMana}</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(player.mana / player.maxMana) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Position:</span>
                      <span className="text-cyan-300 text-[10px]">
                        ({player.position.x.toFixed(1)}, {player.position.y.toFixed(1)}, {player.position.z.toFixed(1)})
                      </span>
                    </div>
                    {player.guildId && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Guild:</span>
                          <span className="text-purple-300">{player.guildName || 'Unknown'}</span>
                        </div>
                        {player.guildTag && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Guild Tag:</span>
                            <span className="text-purple-300">[{player.guildTag}]</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Combat Tab Content */}
        {activeTab === 'combat' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Player Combat Stats */}
            <div className="p-3 border-b border-cyan-500/30 bg-gray-900/50">
              {!player ? (
                <div className="text-center text-gray-400 text-xs py-2">
                  No player data available
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">Level:</span>
                    <span className="text-cyan-300 font-bold">{player.level}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Health:</span>
                      <span className="text-red-300">{player.health} / {player.maxHealth}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                      <div
                        className="bg-red-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Mana:</span>
                      <span className="text-blue-300">{player.mana} / {player.maxMana}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2.5">
                      <div
                        className="bg-blue-500 h-2.5 rounded-full transition-all"
                        style={{ width: `${(player.mana / player.maxMana) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Combat Log */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ minHeight: 0 }}>
              {combatMessages.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">
                  No combat activity yet
                </div>
              ) : (
                combatMessages.map(msg => {
                  const getColor = () => {
                    if (msg.color) return msg.color
                    if (msg.message.toLowerCase().includes('damage dealt') || msg.message.toLowerCase().includes('kill')) return '#ff4444'
                    if (msg.message.toLowerCase().includes('damage taken')) return '#ff6666'
                    if (msg.message.toLowerCase().includes('heal')) return '#44ff44'
                    if (msg.message.toLowerCase().includes('critical')) return '#ff00ff'
                    if (msg.message.toLowerCase().includes('combo')) return '#ffff00'
                    return '#ff00ff'
                  }

                  return (
                    <div 
                      key={msg.id} 
                      className="text-sm bg-red-900/20 border-l-2 border-red-500 pl-2"
                    >
                      <span className="text-red-400 text-xs">⚔️ </span>
                      <span
                        className="font-bold"
                        style={{ color: getColor() }}
                      >
                        {msg.playerName}:
                      </span>
                      <span className="text-gray-300 ml-2">{msg.message}</span>
                    </div>
                  )
                })
              )}
              <div ref={combatLogEndRef} />
            </div>
          </div>
        )}
      </div>
    </DraggableResizable>
  )
}

