import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import DraggableResizable from './DraggableResizable'

/**
 * Proximity Voice Chat Component
 * Implements basic WebRTC peer-to-peer voice chat for nearby players
 * 
 * Features:
 * - Automatic peer connection establishment within proximity range (15 units)
 * - Mute/unmute controls
 * - WebRTC with STUN servers for NAT traversal
 * 
 * Note: This is a simplified implementation using native WebRTC APIs.
 * For production scale, consider integrating LiveKit SDK for better
 * performance, scalability, and features like server-side audio processing.
 */

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
        // Establish peer connection (simplified - would use LiveKit in production)
        if (!peerConnectionsRef.current.has(otherPlayer.id)) {
          // Create WebRTC peer connection
          const pc = new RTCPeerConnection({
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          })

          // Add local stream tracks to peer connection
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
              pc.addTrack(track, localStreamRef.current!)
            })
          }

          // Handle remote stream
          pc.ontrack = (event) => {
            const [remoteStream] = event.streams
            // In a full implementation, this would play the audio
            // For now, we just log that we received the stream
            console.log(`Received audio stream from ${otherPlayer.name}`, remoteStream)
          }

          // Handle ICE candidates (simplified - would go through signaling server)
          pc.onicecandidate = (event) => {
            if (event.candidate) {
              // In production, send this to the other player via signaling server
              console.log('ICE candidate generated for', otherPlayer.name)
            }
          }

          // Handle connection state changes
          pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${otherPlayer.name}:`, pc.connectionState)
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
              pc.close()
              peerConnectionsRef.current.delete(otherPlayer.id)
            }
          }

          // Create offer (simplified - in production, this would go through signaling server)
          pc.createOffer()
            .then(offer => pc.setLocalDescription(offer))
            .catch(err => {
              console.error('Error creating offer:', err)
              pc.close()
              peerConnectionsRef.current.delete(otherPlayer.id)
            })

          peerConnectionsRef.current.set(otherPlayer.id, pc)
          console.log(`Establishing voice connection with ${otherPlayer.name}`)
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
      defaultSize={{ width: 200, height: 150 }}
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

