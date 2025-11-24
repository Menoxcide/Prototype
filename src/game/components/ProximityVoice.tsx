import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import DraggableResizable from './DraggableResizable'

// Proximity voice chat using WebRTC
// Note: Full LiveKit integration would require LiveKit SDK
// This is a simplified version using WebRTC APIs

export default function ProximityVoice() {
  const { player, otherPlayers, isConnected } = useGameStore()
  const [isMuted, setIsMuted] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const localStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())

  useEffect(() => {
    if (!isEnabled || !player || !isConnected) return

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('MediaDevices API not available. Voice chat requires HTTPS or a supported browser.')
      setIsEnabled(false)
      return
    }

    // Request microphone access
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        localStreamRef.current = stream
        if (isMuted) {
          stream.getAudioTracks().forEach((track) => (track.enabled = false))
        }
      })
      .catch((err) => {
        console.error('Error accessing microphone:', err)
        setIsEnabled(false)
      })

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      peerConnectionsRef.current.forEach((pc) => pc.close())
      peerConnectionsRef.current.clear()
    }
  }, [isEnabled, isMuted, player, isConnected])

  // Update peer connections based on proximity
  useEffect(() => {
    if (!isEnabled || !player || !localStreamRef.current) return

    otherPlayers.forEach((otherPlayer) => {
      const distance = Math.sqrt(
        Math.pow(player.position.x - otherPlayer.position.x, 2) +
        Math.pow(player.position.z - otherPlayer.position.z, 2)
      )

      const PROXIMITY_RANGE = 15 // Voice range in game units

      if (distance <= PROXIMITY_RANGE) {
        // Should establish peer connection (simplified - would use LiveKit in production)
        if (!peerConnectionsRef.current.has(otherPlayer.id)) {
          // TODO: Establish WebRTC connection with other player
          // This would typically go through a signaling server
          console.log(`In voice range of ${otherPlayer.name}`)
        }
      } else {
        // Out of range, close connection
        const pc = peerConnectionsRef.current.get(otherPlayer.id)
        if (pc) {
          pc.close()
          peerConnectionsRef.current.delete(otherPlayer.id)
        }
      }
    })
  }, [player, otherPlayers, isEnabled])

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = isMuted
      })
    }
  }

  const toggleVoice = () => {
    setIsEnabled(!isEnabled)
  }

  if (!isConnected) return null

  return (
    <DraggableResizable
      id="proximity-voice"
      storageKey="proximityVoice"
      defaultPosition={{ 
        x: typeof window !== 'undefined' ? window.innerWidth - 200 : 200, 
        y: typeof window !== 'undefined' ? window.innerHeight - 200 : 400 
      }}
      defaultSize={{ width: 'auto', height: 'auto' }}
      resizable={false}
      draggable={true}
      className="pointer-events-auto z-30"
      header={
        <div className="flex gap-2">
          <button
            onClick={toggleVoice}
            className={`px-3 py-2 rounded-lg font-bold transition-all relative ${
              isEnabled
                ? 'bg-green-600 hover:bg-green-500 text-white border-2 border-cyan-400 neon-border'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border-2 border-transparent'
            }`}
            style={isEnabled ? {
              boxShadow: '0 0 10px rgba(0, 255, 255, 0.6), 0 0 20px rgba(0, 255, 255, 0.4), inset 0 0 5px rgba(0, 255, 255, 0.3)'
            } : {}}
          >
            {isEnabled ? '🎤' : '🔇'}
          </button>
          {isEnabled && (
            <button
              onClick={toggleMute}
              className={`px-3 py-2 rounded-lg font-bold transition-all ${
                isMuted
                  ? 'bg-red-600 hover:bg-red-500 text-white border-2 border-red-400'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300 border-2 border-transparent'
              }`}
            >
              {isMuted ? '🔇 Muted' : '🔊'}
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'none' }} />
    </DraggableResizable>
  )
}

