import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { sendGuildCreate, sendGuildJoin, sendGuildLeave, sendGuildChat } from '../network/colyseus'

export default function GuildModal() {
  const { player, isGuildOpen, toggleGuild } = useGameStore()
  const [guildName, setGuildName] = useState('')
  const [guildTag, setGuildTag] = useState('')
  const [guildIdToJoin, setGuildIdToJoin] = useState('')
  const [guildChatMessage, setGuildChatMessage] = useState('')
  const [guildChat] = useState<Array<{ playerName: string; message: string; timestamp: number }>>([])

  if (!isGuildOpen || !player) return null

  const handleCreateGuild = () => {
    if (guildName.length < 3 || guildName.length > 20) {
      alert('Guild name must be 3-20 characters')
      return
    }
    if (guildTag.length < 2 || guildTag.length > 4) {
      alert('Guild tag must be 2-4 characters')
      return
    }
    sendGuildCreate(guildName, guildTag.toUpperCase())
    setGuildName('')
    setGuildTag('')
  }

  const handleJoinGuild = () => {
    if (!guildIdToJoin) {
      alert('Please enter a guild ID')
      return
    }
    sendGuildJoin(guildIdToJoin)
    setGuildIdToJoin('')
  }

  const handleLeaveGuild = () => {
    if (confirm('Are you sure you want to leave your guild?')) {
      sendGuildLeave()
    }
  }

  const handleSendGuildChat = () => {
    if (!guildChatMessage.trim()) return
    sendGuildChat(guildChatMessage)
    setGuildChatMessage('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400 neon-glow">Guilds</h2>
          <button
            onClick={toggleGuild}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        {player.guildId ? (
          // In a guild
          <div>
            <div className="mb-4 p-3 bg-gray-800 rounded-lg">
              <div className="text-cyan-300 font-bold mb-1">
                [{player.guildTag}] {player.guildName || player.guildId}
              </div>
              <div className="text-sm text-gray-400">You are in a guild</div>
            </div>

            {/* Guild Chat */}
            <div className="mb-4">
              <h3 className="text-lg font-bold text-cyan-300 mb-2">Guild Chat</h3>
              <div className="bg-gray-800 rounded-lg p-3 mb-2 h-40 overflow-y-auto">
                {guildChat.length === 0 ? (
                  <div className="text-gray-400 text-sm">No messages yet</div>
                ) : (
                  guildChat.map((msg, idx) => (
                    <div key={idx} className="text-sm mb-1">
                      <span className="text-cyan-400 font-bold">{msg.playerName}:</span>
                      <span className="text-gray-300 ml-2">{msg.message}</span>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <label htmlFor="guild-chat-message" className="sr-only">Type guild message</label>
                <input
                  id="guild-chat-message"
                  name="guild-chat-message"
                  type="text"
                  value={guildChatMessage}
                  onChange={(e) => setGuildChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendGuildChat()}
                  placeholder="Type guild message..."
                  className="flex-1 bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-300 focus:outline-none"
                />
                <button
                  onClick={handleSendGuildChat}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-2 rounded"
                >
                  Send
                </button>
              </div>
            </div>

            <button
              onClick={handleLeaveGuild}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded"
            >
              Leave Guild
            </button>
          </div>
        ) : (
          // Not in a guild
          <div>
            {/* Create Guild */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-cyan-300 mb-3">Create Guild</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="guild-name" className="block text-cyan-400 mb-1">Guild Name</label>
                  <input
                    id="guild-name"
                    name="guild-name"
                    type="text"
                    value={guildName}
                    onChange={(e) => setGuildName(e.target.value)}
                    maxLength={20}
                    placeholder="Enter guild name (3-20 chars)"
                    className="w-full bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="guild-tag" className="block text-cyan-400 mb-1">Guild Tag</label>
                  <input
                    id="guild-tag"
                    name="guild-tag"
                    type="text"
                    value={guildTag}
                    onChange={(e) => setGuildTag(e.target.value.toUpperCase())}
                    maxLength={4}
                    placeholder="Enter tag (2-4 chars)"
                    className="w-full bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-300 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleCreateGuild}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded"
                >
                  Create Guild
                </button>
              </div>
            </div>

            {/* Join Guild */}
            <div>
              <h3 className="text-lg font-bold text-cyan-300 mb-3">Join Guild</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="guild-id-join" className="block text-cyan-400 mb-1">Guild ID</label>
                  <input
                    id="guild-id-join"
                    name="guild-id-join"
                    type="text"
                    value={guildIdToJoin}
                    onChange={(e) => setGuildIdToJoin(e.target.value)}
                    placeholder="Enter guild ID"
                    className="w-full bg-gray-800 border border-cyan-500 rounded px-3 py-2 text-cyan-300 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleJoinGuild}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded"
                >
                  Join Guild
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

