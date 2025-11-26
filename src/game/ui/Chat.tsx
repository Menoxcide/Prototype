import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { sendChatMessage, sendWhisper, sendGuildChat } from '../network/colyseus'
import DraggableResizable from '../components/DraggableResizable'

export default function Chat() {
  const { isChatOpen, toggleChat, chatMessages, addChatMessage, player, otherPlayers } = useGameStore()
  const [inputMessage, setInputMessage] = useState('')
  const [chatMode, setChatMode] = useState<'global' | 'guild' | 'whisper'>('global')
  const [whisperTarget, setWhisperTarget] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleSend = () => {
    if (!inputMessage.trim() || !player) return

    const { isConnected } = useGameStore.getState()

    if (isConnected) {
      if (chatMode === 'whisper' && whisperTarget) {
        sendWhisper(whisperTarget, inputMessage.trim())
      } else if (chatMode === 'guild') {
        sendGuildChat(inputMessage.trim())
      } else {
        // Global chat
        sendChatMessage(inputMessage.trim())
      }
    } else {
      // Offline mode - just add locally
      addChatMessage({
        id: `msg_${Date.now()}`,
        playerId: player.id,
        playerName: player.name,
        message: inputMessage.trim(),
        timestamp: Date.now(),
        type: chatMode,
        color: '#00ffff'
      })
    }

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

  const chatHeader = (
    <div className="flex justify-between items-center p-2 border-b border-cyan-500 bg-gray-900/95 rounded-t-lg">
      <div className="flex gap-2">
        <button
          onClick={() => setChatMode('global')}
          className={`px-2 py-1 rounded text-sm font-bold ${
            chatMode === 'global' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-cyan-400'
          }`}
        >
          Global
        </button>
        {player?.guildId && (
          <button
            onClick={() => setChatMode('guild')}
            className={`px-2 py-1 rounded text-sm font-bold ${
              chatMode === 'guild' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-purple-400'
            }`}
          >
            Guild
          </button>
        )}
        <button
          onClick={() => setChatMode('whisper')}
          className={`px-2 py-1 rounded text-sm font-bold ${
            chatMode === 'whisper' ? 'bg-green-600 text-white' : 'bg-gray-800 text-green-400'
          }`}
        >
          Whisper
        </button>
      </div>
      <button
        onClick={toggleChat}
        className="text-gray-400 hover:text-cyan-400"
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
            placeholder="Type a message..."
            maxLength={200}
            className="flex-1 min-w-0 bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleSend}
            className="shrink-0 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded transition-all"
          >
            Send
          </button>
        </div>
      </div>
    </DraggableResizable>
  )
}

