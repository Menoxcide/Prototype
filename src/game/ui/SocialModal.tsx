/**
 * Social Modal - Friend list, friend requests, and social features
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import EnhancedModal from './components/EnhancedModal'
import { requestFriends, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, blockPlayer, reportPlayer } from '../network/colyseus'

export default function SocialModal() {
  const { isSocialOpen, toggleSocial, player, friends, friendRequests, otherPlayers } = useGameStore()
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'find' | 'party' | 'guild'>('friends')
  const [searchPlayer, setSearchPlayer] = useState('')
  const [friendCategory, setFriendCategory] = useState<'all' | 'online' | 'offline'>('all')
  const [playerNotes, setPlayerNotes] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    if (isSocialOpen && player) {
      requestFriends()
    }
  }, [isSocialOpen, player])

  if (!isSocialOpen || !player) return null

  const handleSendFriendRequest = (targetPlayerId: string) => {
    sendFriendRequest(targetPlayerId)
    setSearchPlayer('')
  }

  const handleAcceptRequest = (requestId: string) => {
    acceptFriendRequest(requestId)
  }

  const handleRejectRequest = (requestId: string) => {
    rejectFriendRequest(requestId)
  }

  const handleRemoveFriend = (friendId: string) => {
    if (confirm('Remove this friend?')) {
      removeFriend(friendId)
    }
  }

  const handleBlockPlayer = (targetPlayerId: string) => {
    if (confirm('Block this player? They will not be able to send you messages or friend requests.')) {
      blockPlayer(targetPlayerId)
    }
  }

  const handleReportPlayer = (targetPlayerId: string, reason: string) => {
    const description = prompt(`Please describe the issue with ${targetPlayerId}:`)
    if (description) {
      reportPlayer(targetPlayerId, reason, description)
    }
  }

  const filteredOtherPlayers = Array.from(otherPlayers.values()).filter(p =>
    p.name.toLowerCase().includes(searchPlayer.toLowerCase()) &&
    p.id !== player.id &&
    !friends.some(f => f.id === p.id)
  )

  return (
    <EnhancedModal
      isOpen={isSocialOpen}
      onClose={toggleSocial}
      title="Social"
      size="lg"
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'friends'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'requests'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Requests ({friendRequests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('find')}
            className={`px-4 py-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'find'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Find Players
          </button>
          <button
            onClick={() => setActiveTab('party')}
            className={`px-4 py-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'party'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Party
          </button>
          <button
            onClick={() => setActiveTab('guild')}
            className={`px-4 py-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'guild'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Guild
          </button>
        </div>

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-2 overflow-y-auto flex-1">
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setFriendCategory('all')}
                className={`px-3 py-1 rounded text-sm ${
                  friendCategory === 'all' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                All ({friends.length})
              </button>
              <button
                onClick={() => setFriendCategory('online')}
                className={`px-3 py-1 rounded text-sm ${
                  friendCategory === 'online' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Online ({friends.filter(f => f.isOnline).length})
              </button>
              <button
                onClick={() => setFriendCategory('offline')}
                className={`px-3 py-1 rounded text-sm ${
                  friendCategory === 'offline' ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Offline ({friends.filter(f => !f.isOnline).length})
              </button>
            </div>
            {friends.filter(f => 
              friendCategory === 'all' || 
              (friendCategory === 'online' && f.isOnline) ||
              (friendCategory === 'offline' && !f.isOnline)
            ).length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-6xl mb-4">👥</div>
                <div className="text-xl">No friends {friendCategory === 'online' ? 'online' : friendCategory === 'offline' ? 'offline' : 'yet'}</div>
                {friendCategory === 'all' && (
                  <div className="text-sm text-gray-500 mt-2">Add friends from the "Find Players" tab</div>
                )}
              </div>
            ) : (
              friends
                .filter(f => 
                  friendCategory === 'all' || 
                  (friendCategory === 'online' && f.isOnline) ||
                  (friendCategory === 'offline' && !f.isOnline)
                )
                .map(friend => (
                  <div
                    key={friend.id}
                    className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-3 h-3 rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                      <div className="flex-1">
                        <div className="text-cyan-300 font-bold">{friend.name}</div>
                        <div className="text-xs text-gray-400">
                          Level {friend.level} • {friend.isOnline ? 'Online' : `Last seen ${new Date(friend.lastSeen).toLocaleDateString()}`}
                        </div>
                        {playerNotes.get(friend.id) && (
                          <div className="text-xs text-yellow-400 mt-1">📝 {playerNotes.get(friend.id)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const note = prompt('Add a note for this friend:', playerNotes.get(friend.id) || '')
                          if (note !== null) {
                            setPlayerNotes(prev => new Map(prev).set(friend.id, note))
                          }
                        }}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded"
                        title="Add note"
                      >
                        📝
                      </button>
                      {friend.isOnline && (
                        <button
                          onClick={() => {
                            // Whisper to friend
                            console.log('Whisper to', friend.name)
                          }}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1 rounded"
                        >
                          Message
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-2 overflow-y-auto flex-1">
            {friendRequests.filter(r => r.status === 'pending').length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-6xl mb-4">📬</div>
                <div className="text-xl">No pending requests</div>
              </div>
            ) : (
              friendRequests
                .filter(r => r.status === 'pending')
                .map(request => (
                  <div
                    key={request.id}
                    className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-cyan-300 font-bold">{request.fromPlayerName}</div>
                      <div className="text-xs text-gray-400">
                        {new Date(request.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1 rounded"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* Find Players Tab */}
        {activeTab === 'find' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div>
              <input
                type="text"
                placeholder="Search for players..."
                value={searchPlayer}
                onChange={(e) => setSearchPlayer(e.target.value)}
                className="w-full bg-gray-800 border border-cyan-500 rounded-lg px-4 py-2 text-cyan-300"
              />
            </div>

            {filteredOtherPlayers.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-6xl mb-4">🔍</div>
                <div className="text-xl">No players found</div>
                <div className="text-sm text-gray-500 mt-2">Try a different search term</div>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredOtherPlayers.map(otherPlayer => (
                  <div
                    key={otherPlayer.id}
                    className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-cyan-300 font-bold">{otherPlayer.name}</div>
                      <div className="text-xs text-gray-400">Level {otherPlayer.level}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSendFriendRequest(otherPlayer.id)}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1 rounded"
                      >
                        Add Friend
                      </button>
                      <button
                        onClick={() => handleBlockPlayer(otherPlayer.id)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded"
                      >
                        Block
                      </button>
                      <button
                        onClick={() => handleReportPlayer(otherPlayer.id, 'harassment')}
                        className="bg-orange-600 hover:bg-orange-500 text-white text-xs px-3 py-1 rounded"
                      >
                        Report
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Party Tab */}
        {activeTab === 'party' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-cyan-400 font-bold mb-2">Party System</h3>
              <p className="text-gray-400 text-sm mb-4">
                Invite friends to form a party and share XP and loot!
              </p>
              <button className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded">
                Create Party
              </button>
            </div>
            <div className="text-center text-gray-400 py-8">
              <div className="text-6xl mb-4">🎉</div>
              <div className="text-xl">No active party</div>
              <div className="text-sm text-gray-500 mt-2">Create or join a party to start playing together</div>
            </div>
          </div>
        )}

        {/* Guild Tab */}
        {activeTab === 'guild' && (
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-cyan-400 font-bold mb-2">Guild System</h3>
              <p className="text-gray-400 text-sm mb-4">
                Join or create a guild to connect with other players!
              </p>
              <div className="flex gap-2">
                <button className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded">
                  Create Guild
                </button>
                <button className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
                  Browse Guilds
                </button>
              </div>
            </div>
            <div className="text-center text-gray-400 py-8">
              <div className="text-6xl mb-4">🏰</div>
              <div className="text-xl">Not in a guild</div>
              <div className="text-sm text-gray-500 mt-2">Create or join a guild to unlock guild features</div>
            </div>
          </div>
        )}
      </div>
    </EnhancedModal>
  )
}

