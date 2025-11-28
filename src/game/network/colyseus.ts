import { Client, Room } from 'colyseus.js'
import { useGameStore } from '../store/useGameStore'
import { getItem } from '../data/items'
import { getIdToken } from '../../firebase/auth'
import { createDamageNumber, createComboNumber } from '../utils/floatingNumbers'
import type { StateDelta, QuestUpdateMessage, AvailableQuestsMessage, BattlePassUpdateMessage, HousingDataMessage, FriendsListMessage, FriendRequestsMessage, FriendRequestReceivedMessage, FriendRequestSentMessage } from '../../../shared/src/types/network'
import type { PowerUpType } from '../../../shared/src/types/powerUps'
import { sendBinaryMessage, receiveBinaryMessage, negotiateProtocol } from './binaryProtocolAdapter'
import { getServerWsUrl } from '../utils/serverConfig'
import { isFeatureEnabled } from '../utils/featureFlags'

// Type definitions for room state
interface PlayerSchema {
  id: string
  name: string
  race: string
  x: number
  y: number
  z: number
  rotation: number
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  level: number
  guildId?: string
  guildTag?: string
  guildName?: string
}

interface EnemySchema {
  id: string
  type: string
  x: number
  y: number
  z: number
  rotation: number
  health: number
  maxHealth: number
  level: number
  ownerId?: string
}

interface LootDropSchema {
  id: string
  itemId: string
  x: number
  y: number
  z: number
  ownerId?: string
  expiresAt: number
}

interface PowerUpSchema {
  id: string
  powerUpId: string
  type: string
  x: number
  y: number
  z: number
  spawnTime: number
  expiresAt: number
}

interface NexusRoomState {
  players: Map<string, PlayerSchema>
  enemies: Map<string, EnemySchema>
  powerUps: Map<string, PowerUpSchema>
  resourceNodes: any
  lootDrops: Map<string, LootDropSchema>
  spellProjectiles: any
}

let client: Client | null = null
let room: Room | null = null
let isConnecting = false
let isInitialConnectionPhase = false // Track if we're in the initial connection setup phase
let connectionPromise: Promise<Room> | null = null // Track ongoing connection promise to prevent duplicates

/**
 * Get the server URL from environment variables or use default
 * @deprecated Use getServerWsUrl() from serverConfig instead for runtime config
 */
function getServerUrl(): string {
  // Check for WebSocket URL first (for Colyseus)
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL
  }
  // Fallback to HTTP URL converted to WebSocket
  if (import.meta.env.VITE_SERVER_URL) {
    const url = import.meta.env.VITE_SERVER_URL
    // Convert http:// to ws:// and https:// to wss://
    return url.replace(/^http/, 'ws')
  }
  // Default to localhost
  return 'ws://localhost:2567'
}

/**
 * Initialize the Colyseus client with the server URL
 * Fetches server config at runtime to ensure we're using the current server URL
 */
export async function initializeClient(serverUrl?: string) {
  let url: string
  
  if (serverUrl) {
    url = serverUrl
  } else {
    // Fetch server config at runtime to get the current server URL
    try {
      url = await getServerWsUrl()
    } catch (error) {
      console.warn('Failed to fetch server config, using fallback:', error)
      url = getServerUrl() // Fallback to build-time env vars
    }
  }
  
  if (import.meta.env.DEV) {
    console.log('🔌 Initializing Colyseus client:', url)
  }
  client = new Client(url)
  return client
}

export async function joinRoom(playerName: string, race: string, isReconnectAttempt = false, firebaseToken?: string) {
  // If already connected and not a reconnect attempt, don't reconnect
  if (room && room.connection.isOpen && !isReconnectAttempt) {
    if (import.meta.env.DEV) {
      console.log('Already connected to room:', room.sessionId)
    }
    return room
  }

  // Prevent multiple simultaneous connection attempts
  // If there's an ongoing connection promise, wait for it instead of starting a new one
  if (connectionPromise && !isReconnectAttempt) {
    try {
      const existingRoom = await connectionPromise
      if (existingRoom && existingRoom.connection.isOpen) {
        if (import.meta.env.DEV) {
          console.log('🔌 Reusing existing connection promise')
        }
        return existingRoom
      }
    } catch (error) {
      // Previous connection failed, continue with new attempt
      connectionPromise = null
    }
  }

  // Prevent multiple simultaneous connection attempts
  if (isConnecting && !isReconnectAttempt) {
    // Wait for existing connection to complete (max 2 seconds)
    const maxWaitTime = 2000
    const startTime = Date.now()
    while (isConnecting && connectionPromise && (Date.now() - startTime) < maxWaitTime) {
      try {
        const existingRoom = await connectionPromise
        if (existingRoom && existingRoom.connection.isOpen) {
          if (import.meta.env.DEV) {
            console.log('🔌 Reusing existing connection')
          }
          return existingRoom
        }
      } catch {
        // Connection failed, break out of loop
        break
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    if (room && room.connection.isOpen) {
      return room
    }
  }

  // Clean up existing room if disconnected or during reconnection
  if (room) {
    // During reconnection, always close the old room
    if (isReconnectAttempt) {
      try {
        room.leave()
      } catch (e) {
        // Room already closed, ignore
      }
      room = null
    } else if (!room.connection.isOpen) {
      // Room is closed, clean it up
      try {
        room.leave()
      } catch (e) {
        // Room already closed, ignore
      }
      room = null
    } else {
      // Room is still open and not a reconnect attempt, return it
      return room
    }
  }

  isConnecting = true
  isInitialConnectionPhase = true // Mark that we're starting initial connection

  // Reinitialize client if needed or if server URL changed
  if (!client) {
    client = await initializeClient()
  } else {
    // Check if we need to reinitialize with a new URL
    // Note: Colyseus Client doesn't expose the URL, so we'll just reinitialize if client is null
    // In practice, the URL shouldn't change during runtime
  }

  // Create connection promise to track this connection attempt
  const createConnection = async (): Promise<Room> => {
    try {
    // Get Firebase token if not provided
    let idToken: string | undefined = firebaseToken
    if (!idToken) {
      idToken = await getIdToken() || undefined
    }

    // Validate client is initialized
    if (!client) {
      throw new Error('Colyseus client not initialized')
    }

    // Get server URL for logging and error messages
    let serverUrl: string
    try {
      serverUrl = await getServerWsUrl()
    } catch (error) {
      serverUrl = getServerUrl() // Fallback to build-time env vars
    }

    if (import.meta.env.DEV) {
      console.log('🔌 Attempting to connect to server:', serverUrl)
    }

    // Set a timeout for the connection attempt
    // Increased to 20s to allow more time for state initialization
    // Server's seat reservation timeout is typically 15-30s, so 20s is safe
    const connectionTimeout = 20000 // 20 seconds
    const joinPromise = client.joinOrCreate<NexusRoomState>('nexus', {
      name: playerName,
      race,
      firebaseToken: idToken || undefined // Send Firebase token for verification
    })

    // Race between connection and timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        // Provide more helpful error message with troubleshooting tips
        const errorMsg = `Connection timeout: Server at ${serverUrl} did not respond within ${connectionTimeout}ms. ` +
          `This could mean: (1) The server is down or not deployed, (2) The server URL is incorrect, ` +
          `(3) The server is experiencing a cold start (Cloud Run), or (4) Network/firewall issues. ` +
          `The game will continue in offline mode.`
        reject(new Error(errorMsg))
      }, connectionTimeout)
    })

    room = await Promise.race([joinPromise, timeoutPromise])

    // Validate room object is properly initialized IMMEDIATELY after assignment
    // This prevents the "Room is null after creation" error
    if (!room) {
      isConnecting = false
      const errorMsg = 'Failed to create room: room object is null after connection attempt'
      console.error('❌', errorMsg, {
        serverUrl,
        playerName,
        hasClient: !!client,
        connectionTimeout
      })
      throw new Error(errorMsg)
    }

    // Store room reference immediately to prevent it from being cleared
    const roomRef = room

    // Check if room disconnected during creation (defensive check)
    if (!roomRef || !roomRef.connection || !roomRef.connection.isOpen) {
      isConnecting = false
      isInitialConnectionPhase = false
      const errorMsg = 'Room disconnected immediately after creation - connection may have been interrupted'
      console.error('❌', errorMsg, {
        hasRoomRef: !!roomRef,
        hasConnection: !!roomRef?.connection,
        isOpen: roomRef?.connection?.isOpen,
        sessionId: roomRef?.sessionId
      })
      throw new Error(errorMsg)
    }

    if (typeof roomRef.onStateChange !== 'function' || typeof roomRef.onMessage !== 'function') {
      isConnecting = false
      console.error('Room object missing required methods:', {
        hasOnStateChange: typeof roomRef.onStateChange === 'function',
        hasOnMessage: typeof roomRef.onMessage === 'function',
        roomType: typeof roomRef,
        roomKeys: roomRef ? Object.keys(roomRef) : [],
        sessionId: roomRef?.sessionId
      })
      throw new Error('Room object is not properly initialized - missing required methods')
    }

    if (import.meta.env.DEV) {
      console.log('Joined room:', roomRef.sessionId)
    }

    // Negotiate protocol on connection
    const protocol = negotiateProtocol()
    if (protocol.useBinary && import.meta.env.DEV) {
      console.log('📦 Binary protocol enabled (version', protocol.version, ')')
    }
    
    // Register message handlers IMMEDIATELY to prevent "not registered" warnings
    // These must be registered before any messages can arrive
    // Use roomRef consistently to prevent issues if room variable gets cleared
    roomRef.onMessage('stateDelta', (data: { deltas: StateDelta[] } | ArrayBuffer) => {
      // Deserialize binary message if needed
      const deserialized = receiveBinaryMessage('stateDelta', data)
      const deltaData = deserialized.deltas ? deserialized : data as { deltas: StateDelta[] }
      
      // Apply delta updates to game state
      // This is handled by the onAdd/onRemove/onChange listeners in setupRoomListeners
      // but we register the handler early to prevent warnings
      if (deltaData.deltas && deltaData.deltas.length > 0) {
        // Delta updates are already applied through schema listeners
        // This handler just prevents the "not registered" warning
      }
    })

    // Register chat handler EARLY to ensure it's always available
    roomRef.onMessage('chat', (message: { playerId: string; playerName: string; message: string; timestamp: number }) => {
      // Chat messages are frequent, don't log them
      useGameStore.getState().addChatMessage({
        id: `msg_${message.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        playerId: message.playerId,
        playerName: message.playerName,
        message: message.message,
        timestamp: message.timestamp,
        type: 'global',
        color: '#00ffff'
      })
    })

    // Register whisper handler EARLY
    roomRef.onMessage('whisper', (data: { fromId: string; fromName: string; message: string; timestamp: number }) => {
      // Whisper messages are frequent, don't log them
      useGameStore.getState().addChatMessage({
        id: `whisper_${data.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        playerId: data.fromId,
        playerName: data.fromName,
        message: data.message,
        timestamp: data.timestamp,
        type: 'whisper',
        color: '#00ff00'
      })
    })

    // Register positionCorrection handler EARLY to prevent "not registered" warnings
    // This must be registered before any movement messages can arrive
    roomRef.onMessage('positionCorrection', (data: { x: number; y: number; z: number; rotation: number }) => {
      // Server rejected movement - reconcile position
      import('./syncSystem').then(({ reconcilePosition }) => {
        reconcilePosition({ x: data.x, y: data.y, z: data.z }, data.rotation)
      })
    })

    // Wait for state to be fully decoded and ready
    // The most reliable way is to wait for the first state change event
    // which indicates the state has been decoded and MapSchema methods are available
    // Use roomRef consistently to prevent issues if room variable gets cleared
    await new Promise<void>((resolve, reject) => {
      if (!roomRef || !roomRef.connection || !roomRef.connection.isOpen) {
        // Room disconnected during wait - reject with specific error
        const errorMsg = 'Room disconnected during state initialization - connection was lost'
        console.error('❌', errorMsg, {
          hasRoomRef: !!roomRef,
          hasConnection: !!roomRef?.connection,
          isOpen: roomRef?.connection?.isOpen,
          sessionId: roomRef?.sessionId
        })
        reject(new Error(errorMsg))
        return
      }

      // Verify room has the expected methods
      if (typeof roomRef.onStateChange !== 'function') {
        console.error('Room does not have onStateChange method', roomRef)
        // Proceed anyway after a short delay
        setTimeout(() => resolve(), 100)
        return
      }

      let resolved = false
      const doResolve = () => {
        if (resolved) return
        resolved = true
        resolve()
      }

      // Check if state is already ready with methods
      const checkStateReady = () => {
        // Check roomRef instead of room to prevent race conditions
        if (!roomRef || !roomRef.connection || !roomRef.connection.isOpen || resolved) return false

        const playersReady = roomRef.state?.players && typeof roomRef.state.players.onAdd === 'function'
        
        if (playersReady) {
          doResolve()
          return true
        }
        return false
      }

      // Check immediately
      if (checkStateReady()) {
        return
      }

      // Wait for first state change event (most reliable indicator that state is decoded)
      // Use onStateChange (Colyseus API) - manually remove after first call for one-time behavior
      let stateChangeHandled = false
      let cleanupListener: (() => void) | null = null
      
      const stateChangeHandler = (_state: unknown) => {
        // Check roomRef instead of room to prevent race conditions
        if (!stateChangeHandled && roomRef && roomRef.connection && roomRef.connection.isOpen && !resolved) {
          stateChangeHandled = true
          // Clean up listener after first call
          if (cleanupListener) {
            cleanupListener()
            cleanupListener = null
          }
          // Give a tiny delay to ensure methods are fully attached after state change
          setTimeout(() => {
            if (!checkStateReady()) {
              // Even if methods aren't ready, proceed - they may become available later
              doResolve()
            }
          }, 50)
        }
      }

      // Set up state change listener with cleanup
      try {
        roomRef.onStateChange(stateChangeHandler)
        // Store cleanup function (onStateChange returns cleanup in some versions)
        // If it doesn't return cleanup, we'll handle it differently
        cleanupListener = () => {
          // Try to remove listener if possible
          if (roomRef && typeof roomRef.removeAllListeners === 'function') {
            // Note: This removes ALL listeners, so be careful
            // In practice, we rely on the handler flag to prevent re-execution
          }
        }
      } catch (error) {
        console.error('Failed to set up state change listener:', error)
        // Proceed anyway after a short delay
        setTimeout(() => resolve(), 100)
        return
      }

      // Fallback timeout (5 seconds max) - increased further to handle slow state initialization
      // Some connections may take longer, especially on slower networks, during server load, or when main thread is blocked
      setTimeout(() => {
        if (!resolved) {
          // Check if room disconnected during wait
          if (!roomRef || !roomRef.connection || !roomRef.connection.isOpen) {
            const errorMsg = 'Room disconnected during state initialization timeout - connection was lost'
            console.error('❌', errorMsg, {
              hasRoomRef: !!roomRef,
              hasConnection: !!roomRef?.connection,
              isOpen: roomRef?.connection?.isOpen,
              sessionId: roomRef?.sessionId
            })
            reject(new Error(errorMsg))
            return
          }
          // Mark as handled to prevent handler from running
          stateChangeHandled = true
          if (cleanupListener) {
            cleanupListener()
            cleanupListener = null
          }
          // Proceed even if methods aren't ready - they'll become available eventually
          // Log a warning in dev mode if we're proceeding without methods ready
          if (import.meta.env.DEV && !checkStateReady()) {
            console.warn('⚠️ Proceeding with connection despite state methods not being ready - they may become available later')
          }
          doResolve()
        }
      }, 5000)
    })

    // Set up room event listeners
    // Use roomRef to ensure we're using the validated room object
    // Double-check roomRef is still valid and connected (defensive programming)
    if (!roomRef || !roomRef.connection || !roomRef.connection.isOpen) {
      isConnecting = false
      isInitialConnectionPhase = false
      const errorMsg = 'Room is null or disconnected after creation - connection may have been interrupted'
      console.error('❌', errorMsg, {
        hasRoomRef: !!roomRef,
        hasConnection: !!roomRef?.connection,
        isOpen: roomRef?.connection?.isOpen,
        sessionId: roomRef?.sessionId
      })
      throw new Error(errorMsg)
    }
    
    try {
      await setupRoomListeners(roomRef)
    } catch (error) {
      isConnecting = false
      console.error('Failed to set up room listeners:', error)
      // Re-throw to let caller handle it
      throw error
    }

    // Sync initial player state from room state (only on first connection)
    // Use roomRef to ensure consistency
    if (roomRef && roomRef.state && roomRef.state.players) {
      const playerInState = roomRef.state.players.get(roomRef.sessionId)
      if (playerInState) {
        const { player, setPlayer } = useGameStore.getState()
        if (player) {
          // Only sync position if player hasn't moved yet (initial spawn)
          // This prevents overwriting local movement during gameplay
          const hasMoved = Math.abs(player.position.x) > 0.1 || Math.abs(player.position.z) > 0.1
          
          // Update player state from room state (server is authoritative for initial spawn)
          setPlayer({
            ...player,
            // Only update position if player hasn't moved (initial sync)
            ...(hasMoved ? {} : {
              position: { x: playerInState.x, y: playerInState.y, z: playerInState.z },
              rotation: playerInState.rotation
            }),
            health: playerInState.health,
            maxHealth: playerInState.maxHealth,
            mana: playerInState.mana,
            maxMana: playerInState.maxMana,
            level: playerInState.level,
            guildId: playerInState.guildId || undefined,
            guildTag: playerInState.guildTag || undefined,
            guildName: playerInState.guildName || undefined
          })
          // Initial sync is expected, don't log it
        }
      }

      // Sync existing other players (for whisper dropdown)
      // onAdd only fires for NEW players, so we need to sync existing ones
      // Use roomRef consistently to prevent issues if room variable gets cleared
      if (roomRef && roomRef.state && roomRef.state.players) {
        roomRef.state.players.forEach((player: PlayerSchema, sessionId: string) => {
          if (sessionId !== roomRef?.sessionId) {
          const { otherPlayers } = useGameStore.getState()
          // Only add if not already present
          if (!otherPlayers.has(sessionId)) {
            useGameStore.getState().addOtherPlayer({
              id: sessionId,
              name: player.name,
              race: player.race as any,
              level: player.level,
              xp: 0,
              xpToNext: 100,
              credits: 0,
              position: { x: player.x, y: player.y, z: player.z },
              rotation: player.rotation,
              health: player.health,
              maxHealth: player.maxHealth,
              mana: player.mana,
              maxMana: player.maxMana,
              guildId: player.guildId || undefined,
              guildTag: player.guildTag || undefined,
              guildName: player.guildName || undefined
            })
          }
          }
        })
      }
    }

    // Handle disconnection with reconnection logic
    // Use roomRef consistently to prevent issues if room variable gets cleared
    roomRef.onLeave(async (code) => {
      // Only log non-normal disconnections in dev mode
      // Suppress common error codes that are expected
      if (code !== 1000 && code !== 4002 && import.meta.env.DEV) {
        console.log('Left room, code:', code)
      }
      useGameStore.getState().setConnected(false)
      
      // Don't clear room reference if we're still in initial connection phase
      // This prevents race conditions where room gets cleared during setup
      const oldRoom = room
      const wasInInitialPhase = isInitialConnectionPhase
      
      // Only clear room if not in initial connection phase
      // If in initial phase, let the connection logic handle the error
      if (!isInitialConnectionPhase) {
        room = null
        isConnecting = false
      } else {
        // Still in initial phase - mark as disconnected but don't clear yet
        // The connection logic will handle cleanup and error reporting
        if (import.meta.env.DEV) {
          console.warn('Room disconnected during initial connection phase, connection logic will handle cleanup')
        }
      }
      
      listenersSetup = false // Reset listeners flag on leave
      
      // Only attempt reconnection if not intentionally left (code 1000 = normal closure)
      // Also skip reconnection for code 4002 (ROOM_NOT_FOUND) if it happens during initial connection
      // Don't attempt reconnection if we're still in initial connection phase - let the connection logic handle it
      if (code !== 1000 && !wasInInitialPhase) {
        // Code 4002 means room not found - might happen during initial connection
        // In that case, don't spam reconnection attempts immediately
        const shouldReconnect = code !== 4002 || oldRoom?.sessionId
        
        if (shouldReconnect) {
          const { reconnectionManager } = await import('./reconnection')
          const playerName = useGameStore.getState().player?.name || 'Player'
          const race = useGameStore.getState().player?.race || 'human'
          
          reconnectionManager.startReconnection(
            async () => {
              try {
                // Get Firebase token for reconnection
                // getIdToken is already imported at the top
                const firebaseToken = await getIdToken()
                
                // Pass isReconnectAttempt flag to bypass "already connected" check
                // Reset listeners flag before reconnecting
                listenersSetup = false
                // joinRoom is defined in this same file, no need to import
                const newRoom = await joinRoom(playerName, race, true, firebaseToken || undefined)
                return newRoom
              } catch (error) {
                console.error('Reconnection failed:', error)
                return null
              }
            },
            (reconnectedRoom) => {
              // Reconnection success is expected, don't log it
              room = reconnectedRoom
              useGameStore.getState().setConnected(true)
            },
            () => {
              console.error('Max reconnection attempts reached')
              useGameStore.getState().addChatMessage({
                id: `reconnect_failed_${Date.now()}`,
                playerId: 'system',
                playerName: 'System',
                message: 'Failed to reconnect. Please refresh the page.',
                timestamp: Date.now(),
                type: 'system',
                color: '#ff0000'
              })
            }
          )
        } else if (code === 4002) {
          // Room not found during initial connection - this is expected sometimes
          console.warn('Room not found (code 4002) during connection - will retry on next connection attempt')
        }
      }
      
      // Clean up old room listeners if needed
      if (oldRoom) {
        try {
          oldRoom.removeAllListeners()
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    })

    // Handle errors
    // Use roomRef consistently to prevent issues if room variable gets cleared
    roomRef.onError((code, message) => {
      // Only log non-trivial errors (suppress common expected errors)
      if (code !== 0 && code !== 4002 && import.meta.env.DEV) {
        console.error('Room error:', code, message)
      }
      useGameStore.getState().setConnected(false)
    })

    // Connection setup complete - mark initial phase as done
    isInitialConnectionPhase = false
    useGameStore.getState().setConnected(true)
    isConnecting = false
    
    const { reconnectionManager } = await import('./reconnection')
    reconnectionManager.startLatencyMonitoring(roomRef)

    // Update room variable now that setup is complete
    room = roomRef
    connectionPromise = null // Clear connection promise on success
    return roomRef
    } catch (error) {
      connectionPromise = null // Clear connection promise on error
      throw error
    }
  }

  // Store the connection promise to prevent duplicate connections
  connectionPromise = createConnection()

  try {
    const connectedRoom = await connectionPromise
    return connectedRoom
  } catch (error) {
    isConnecting = false
    isInitialConnectionPhase = false // Reset connection phase flag
    listenersSetup = false // Reset listeners flag on error
    connectionPromise = null // Clear connection promise on error
    room = null
    useGameStore.getState().setConnected(false)
    
    // Provide more helpful error messages
    const serverUrl = getServerUrl()
    let errorMessage = 'Failed to connect to game server'
    
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes('seat reservation expired') || error.message.includes('reservation expired')) {
        // Seat reservation expired - client took too long to connect
        // This is recoverable, suggest retrying
        errorMessage = `Connection timeout: Took too long to establish connection. Please try again.`
        // Don't log as error in production - this is expected sometimes
        if (import.meta.env.DEV) {
          console.warn('⚠️  Seat reservation expired - client took too long to connect')
        }
      } else if (error.message.includes('timeout')) {
        errorMessage = error.message
      } else if (error.message.includes('get')) {
        errorMessage = `Server connection failed: The game server at ${serverUrl} is not responding. Please make sure the server is running.`
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
        errorMessage = `Cannot connect to server at ${serverUrl}. Is the server running?`
      } else {
        errorMessage = `Connection error: ${error.message}`
      }
    }
    
    // Check for seat reservation expired errors (from Colyseus client)
    const isSeatReservationExpired = error instanceof Error && 
      (error.message.includes('seat reservation expired') || 
       error.message.includes('reservation expired') ||
       (error as any).code === 4002)
    
    // Log connection errors with helpful context
    // Suppress duplicate logs and reduce noise in production
    const isTimeout = errorMessage.includes('timeout')
    const shouldLogError = import.meta.env.DEV || (!isTimeout && !isSeatReservationExpired)
    
    if (shouldLogError) {
      // Only log first occurrence to prevent spam
      if (!(window as any).__lastConnectionError || 
          (window as any).__lastConnectionError !== errorMessage) {
        console.error('❌ Failed to join room:', errorMessage)
        if (import.meta.env.DEV) {
          console.error('   Server URL:', serverUrl)
          console.error('   Original error:', error)
          console.error('   Troubleshooting:')
          console.error('     - Check if server is deployed: gcloud run services list')
          console.error('     - Check server logs: gcloud run services logs read mars-nexus-server')
          console.error('     - Verify URL matches deployed service')
        }
        (window as any).__lastConnectionError = errorMessage
        // Clear after 5 seconds to allow new error types to be logged
        setTimeout(() => {
          (window as any).__lastConnectionError = null
        }, 5000)
      }
    } else if (isSeatReservationExpired) {
      // Seat reservation expired - this is recoverable, only log in dev
      if (import.meta.env.DEV) {
        console.warn('⚠️ Seat reservation expired - connection will retry')
      }
    } else if (isTimeout) {
      // In production, log timeout but don't spam - it's expected behavior
      const lastTimeoutLog = (window as any).__lastTimeoutLog as number | undefined
      if (!lastTimeoutLog || Date.now() - lastTimeoutLog > 10000) {
        console.warn('⚠️ Server connection timeout - continuing in offline mode')
        ;(window as any).__lastTimeoutLog = Date.now()
      }
    }
    
    // Create a more user-friendly error
    const friendlyError = new Error(errorMessage)
    if (error instanceof Error && error.stack) {
      friendlyError.stack = error.stack
    }
    throw friendlyError
  }
}

export function leaveRoom() {
  if (room) {
    try {
      room.leave() // Normal closure
    } catch (e) {
      // Room already closed, ignore
    }
    room = null
  }
  isConnecting = false
  listenersSetup = false // Reset listeners flag on leave
  useGameStore.getState().setConnected(false)
}

// Track if listeners have been set up to prevent duplicate registrations
let listenersSetup = false

/**
 * Wait for room state to be fully initialized
 * Checks that state properties are MapSchema instances
 * Currently unused - kept for potential future use
 */
/*
function _waitForStateInitialization(room: Room): Promise<void> {
  return new Promise((resolve) => {
    // Helper to check if a property is a valid MapSchema
    // Check for both onAdd method (when fully initialized) and MapSchema structure ($items, $indexes)
    const isMapSchema = (obj: unknown): boolean => {
      if (!obj || typeof obj !== 'object') return false
      // Check for MapSchema structure (has $items and $indexes properties)
      const hasMapSchemaStructure = obj.$items !== undefined && obj.$indexes !== undefined
      // Check for onAdd method (when fully decoded)
      const hasOnAddMethod = typeof obj.onAdd === 'function'
      // Either structure or method indicates it's a MapSchema
      return hasMapSchemaStructure || hasOnAddMethod
    }

    // If state is already initialized with MapSchema instances, resolve immediately
    if (room.state && 
        isMapSchema(room.state.players) && 
        isMapSchema(room.state.enemies) && 
        isMapSchema(room.state.lootDrops) &&
        isMapSchema(room.state.powerUps)) {
      resolve()
      return
    }

    // Poll for state initialization (Colyseus doesn't have a generic 'statechange' event)
    let timeoutId: number | null = null
    let checkIntervalId: number | null = null
    
    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      if (checkIntervalId !== null) {
        clearInterval(checkIntervalId)
        checkIntervalId = null
      }
    }

    const checkState = () => {
      // Check if room is still connected
      if (!room.connection.isOpen) {
        cleanup()
        resolve() // Resolve anyway, connection will be handled elsewhere
        return
      }

      if (room.state && 
          isMapSchema(room.state.players) && 
          isMapSchema(room.state.enemies) && 
          isMapSchema(room.state.lootDrops)) {
        cleanup()
        resolve()
      }
    }

    // Poll periodically to check for state initialization (every 50ms)
    checkIntervalId = window.setInterval(checkState, 50)

    // Set timeout (2 seconds max wait)
    timeoutId = window.setTimeout(() => {
      cleanup()
      if (room.state && 
          (isMapSchema(room.state.players) || 
           isMapSchema(room.state.enemies) || 
           isMapSchema(room.state.lootDrops) ||
           isMapSchema(room.state.powerUps))) {
        // At least some state is initialized, proceed silently
        resolve()
      } else {
        // No state initialized, but resolve anyway to prevent hanging
        console.warn('State initialization timeout - No MapSchema instances ready, proceeding anyway')
        resolve()
      }
    }, 2000)

    // Initial check
    checkState()
  })
}
*/

async function setupRoomListeners(room: Room | null) {
  // Validate room exists
  if (!room) {
    console.error('Room is null, cannot setup listeners')
    return
  }

  // Prevent duplicate listener setup during reconnection
  if (listenersSetup) {
    console.log('Listeners already setup, skipping duplicate registration')
    return
  }

  // Validate state exists before proceeding
  if (!room.state) {
    console.error('Room state not initialized, cannot setup listeners')
    return
  }

  // Register message handlers FIRST to prevent "not registered" warnings
  // These must be registered before any messages can arrive
  // Note: stateDelta, chat, whisper, and positionCorrection handlers are already registered in joinRoom() before this function is called

  // Listen for loot pickup confirmation
  room.onMessage('lootPickedUp', (data) => {
    if (data.playerId === room?.sessionId) {
      // You picked up the loot - item already added by server
      useGameStore.getState().addItem(data.itemId, 1)
    }
    // Remove from world
    useGameStore.getState().removeLootDrop(data.lootId)
  })

  // Listen for power-up pickup confirmation
  room.onMessage('powerUpPickedUp', (data) => {
    // Remove from world (effect already applied client-side)
    useGameStore.getState().removePowerUp(data.powerUpId)
  })

  room.onMessage('powerUpPickupConfirmed', (data) => {
    // Power-up pickup confirmed by server
    // Effect was already applied client-side, just remove from world
    useGameStore.getState().removePowerUp(data.powerUpId)
  })

  // Note: Chat and whisper handlers are registered early in joinRoom() to ensure they're always available
  // No need to register them here again

  // Listen for quest updates
  room.onMessage('questUpdate', (data: QuestUpdateMessage) => {
    useGameStore.getState().setActiveQuests(data.activeQuests)
  })

  room.onMessage('questAccepted', (_data: { questId: string }) => {
    // Quest was accepted, refresh quest list
    const { player } = useGameStore.getState()
    if (player) {
      // Request updated quest list
    }
  })

  room.onMessage('questCompleted', (_data: { questId: string }) => {
    // Quest was completed, show notification
    useGameStore.getState().addChatMessage({
      id: `quest_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `Quest completed!`,
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
  })

  room.onMessage('questError', (data: { message: string }) => {
    console.error('Quest error:', data.message)
  })

  room.onMessage('availableQuests', (data: AvailableQuestsMessage) => {
    useGameStore.getState().setAvailableQuests(data.quests)
  })

  // Listen for battle pass updates
  room.onMessage('battlePassUpdate', (data: BattlePassUpdateMessage) => {
    useGameStore.getState().setBattlePassProgress(data.progress)
    useGameStore.getState().setBattlePassSeason(data.season)
  })

  room.onMessage('battlePassRewardClaimed', (data: { tier: number; track: string }) => {
    // Show notification
    useGameStore.getState().addChatMessage({
      id: `battlepass_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `Battle pass reward claimed! Tier ${data.tier} (${data.track})`,
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
  })

  room.onMessage('battlePassPremiumUnlocked', () => {
    useGameStore.getState().addChatMessage({
      id: `battlepass_premium_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: 'Premium battle pass unlocked!',
      timestamp: Date.now(),
      type: 'system',
      color: '#ffd700'
    })
  })

  room.onMessage('battlePassError', (data: { message: string }) => {
    console.error('Battle pass error:', data.message)
  })

  // Listen for housing updates
  room.onMessage('housingData', (data: HousingDataMessage) => {
    // Store housing data in game store
    useGameStore.getState().setHousing(data)
  })

  // Listen for social updates
  room.onMessage('friendsList', (data: FriendsListMessage) => {
    // Store friends list in game store
    const friends = Array.isArray(data) ? data : (data.friends || [])
    useGameStore.getState().setFriends(friends.map(f => ({
      id: f.id,
      name: f.name,
      level: 1, // Default level if not provided
      isOnline: f.online,
      lastSeen: f.lastSeen
    })))
  })

  room.onMessage('friendRequests', (data: FriendRequestsMessage) => {
    // Store friend requests in game store
    const requests = Array.isArray(data) ? data : (data.requests || [])
    useGameStore.getState().setFriendRequests(requests.map(r => ({
      id: r.id,
      fromPlayerId: r.fromId,
      fromPlayerName: r.fromName,
      toPlayerId: '', // Will be set by server
      timestamp: r.timestamp,
      status: 'pending'
    })))
  })

  room.onMessage('friendRequestReceived', (data: FriendRequestReceivedMessage) => {
    // Show notification for new friend request
    useGameStore.getState().addChatMessage({
      id: `friend_req_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `${data.fromName} sent you a friend request!`,
      timestamp: Date.now(),
      type: 'system',
      color: '#00ffff'
    })
  })

  room.onMessage('friendRequestSent', (_data: FriendRequestSentMessage) => {
    // Confirm friend request was sent (no need to log)
  })

  room.onMessage('reportSubmitted', (_data: any) => {
    // Confirm report was submitted
    useGameStore.getState().addChatMessage({
      id: `report_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: 'Report submitted successfully. Thank you!',
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
  })

  // Listen for trade updates
  room.onMessage('tradeInitiated', (data: { session: any; isPlayer1: boolean }) => {
    useGameStore.getState().setCurrentTrade(data.session)
    useGameStore.getState().toggleTrade()
  })

  room.onMessage('tradeUpdated', (data: { session: any }) => {
    useGameStore.getState().setCurrentTrade(data.session)
  })

  room.onMessage('tradeCompleted', (_data: { session: any }) => {
    useGameStore.getState().addChatMessage({
      id: `trade_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: 'Trade completed successfully!',
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
    useGameStore.getState().setCurrentTrade(null)
    useGameStore.getState().toggleTrade()
  })

  room.onMessage('tradeCancelled', (_data: { sessionId: string }) => {
    useGameStore.getState().setCurrentTrade(null)
    useGameStore.getState().toggleTrade()
  })

  room.onMessage('tradeError', (data: { message: string }) => {
    console.error('Trade error:', data.message)
    useGameStore.getState().addChatMessage({
      id: `trade_error_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `Trade error: ${data.message}`,
      timestamp: Date.now(),
      type: 'system',
      color: '#ff0000'
    })
  })

  // Listen for dungeon messages
  room.onMessage('dungeonEntered', (data: { dungeonId: string; dungeon?: any }) => {
    if (data.dungeon) {
      useGameStore.getState().setCurrentDungeon(data.dungeon)
    }
    useGameStore.getState().addChatMessage({
      id: `dungeon_entered_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `Entered dungeon: ${data.dungeonId}`,
      timestamp: Date.now(),
      type: 'system',
      color: '#9d00ff'
    })
  })

  room.onMessage('dungeonProgress', (data: { dungeonId: string; progress: any }) => {
    useGameStore.getState().setDungeonProgress(data.dungeonId, data.progress)
  })

  room.onMessage('dungeonCompleted', (_data: { dungeonId: string }) => {
    useGameStore.getState().addChatMessage({
      id: `dungeon_completed_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `Dungeon completed!`,
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
    useGameStore.getState().setCurrentDungeon(null)
  })

  room.onMessage('dungeonError', (data: { message: string }) => {
    console.error('Dungeon error:', data.message)
    useGameStore.getState().addChatMessage({
      id: `dungeon_error_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `Dungeon error: ${data.message}`,
      timestamp: Date.now(),
      type: 'system',
      color: '#ff0000'
    })
  })

  // Listen for achievement updates
  room.onMessage('achievementProgress', (data: { achievements: any[]; progress: any[] }) => {
    useGameStore.getState().setAchievements(data.achievements)
    useGameStore.getState().setAchievementProgress(data.progress)
  })

  room.onMessage('achievementUnlocked', (data: { achievement: any }) => {
    useGameStore.getState().addChatMessage({
      id: `achievement_${Date.now()}`,
      playerId: '',
      playerName: 'System',
      message: `🏆 Achievement Unlocked: ${data.achievement.name}!`,
      timestamp: Date.now(),
      type: 'system',
      color: '#ffd700'
    })
    
    // Update progress
    const currentProgress = useGameStore.getState().achievementProgress
    const updated = currentProgress.map(p => 
      p.id === data.achievement.id
        ? { ...p, completed: true, progress: p.maxProgress }
        : p
    )
    useGameStore.getState().setAchievementProgress(updated)
  })

  // Listen for world boss spawn
  room.onMessage('worldBossSpawned', async (data: { message: string; position: { x: number; y: number; z: number }; bossId: string }) => {
    const store = useGameStore.getState()
    
    // Add chat message
    store.addChatMessage({
      id: `boss_${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      message: data.message,
      timestamp: Date.now(),
      type: 'system',
      color: '#ff00ff'
    })
    
    // Initialize world boss system and add boss to store
    const { worldBossSystem } = await import('../systems/worldBoss')
    // Get active bosses to populate the store (if needed)
    worldBossSystem.getActiveBosses()
    
    // Find or create boss from server data
    const bossData = {
      id: data.bossId,
      bossId: data.bossId,
      type: 'boss',
      level: 50,
      health: 10000,
      maxHealth: 10000,
      position: data.position,
      rotation: 0,
      phase: 1,
      maxPhase: 3,
      participants: []
    }
    
    store.setActiveBoss(data.bossId, bossData)
  })
  
  // Listen for boss ability usage
  room.onMessage('bossAbility', (data: { bossId: string; ability: { id: string; name: string } }) => {
    const store = useGameStore.getState()
    store.addChatMessage({
      id: `boss_ability_${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      message: `⚠️ Boss used ${data.ability.name}!`,
      timestamp: Date.now(),
      type: 'system',
      color: '#ff4444'
    })
  })
  
  // Listen for boss phase transition
  room.onMessage('bossPhaseTransition', (data: { bossId: string; phase: number }) => {
    const store = useGameStore.getState()
    store.updateBoss(data.bossId, { phase: data.phase })
    store.addChatMessage({
      id: `boss_phase_${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      message: `⚡ Boss entered Phase ${data.phase}!`,
      timestamp: Date.now(),
      type: 'system',
      color: '#ff00ff'
    })
  })
  
  // Listen for dynamic events
  room.onMessage('dynamicEvent', (data: { event: any }) => {
    const store = useGameStore.getState()
    store.addActiveEvent(data.event)
    store.addChatMessage({
      id: `event_${Date.now()}`,
      playerId: 'system',
      playerName: 'System',
      message: `🌟 ${data.event.name}: ${data.event.description}`,
      timestamp: Date.now(),
      type: 'system',
      color: '#00ff00'
    })
  })
  
  // Listen for event completion
  room.onMessage('eventCompleted', (data: { eventId: string; rewards: any[] }) => {
    const store = useGameStore.getState()
    store.removeActiveEvent(data.eventId)
    if (data.rewards && data.rewards.length > 0) {
      store.addChatMessage({
        id: `event_reward_${Date.now()}`,
        playerId: 'system',
        playerName: 'System',
        message: `🎁 Event completed! Rewards received.`,
        timestamp: Date.now(),
        type: 'system',
        color: '#ffd700'
      })
    }
  })

  // Listen for damage numbers
  room.onMessage('damageNumber', async (data: { enemyId: string; damage: number; isCrit: boolean; position: { x: number; y: number; z: number } }) => {
    // Create enhanced floating number
    const { logDamageDealt } = await import('../utils/combatLog')
    
    createDamageNumber(data.damage, data.position, data.isCrit)
    
    // Get enemy name for combat log
    const enemy = useGameStore.getState().enemies.get(data.enemyId)
    const enemyName = enemy?.type || 'Enemy'
    logDamageDealt(data.damage, enemyName, data.isCrit)
  })

  // Listen for kills
  room.onMessage('kill', async (data) => {
    const { logKill } = await import('../utils/combatLog')
    logKill(data.killerName, data.enemyType)
  })

  // Listen for combo updates
  room.onMessage('combo', async (data) => {
    if (data.playerId === room?.sessionId) {
      // Your combo!
      const { logCombo } = await import('../utils/combatLog')
      const { player } = useGameStore.getState()
      
      logCombo(data.kills, data.multiplier)
      
      // Show floating combo number above player
      if (player) {
        createComboNumber(
          `${data.kills}x COMBO!`,
          { x: player.position.x, y: player.position.y + 2, z: player.position.z }
        )
      }
    }
  })

  // Listen for guild events
  room.onMessage('guildCreated', (data) => {
    const { player, setPlayer } = useGameStore.getState()
    if (player) {
      setPlayer({
        ...player,
        guildId: data.guildId,
        guildName: data.guildName,
        guildTag: data.guildTag
      })
    }
  })

  room.onMessage('guildJoined', (data) => {
    const { player, setPlayer } = useGameStore.getState()
    if (player) {
      setPlayer({
        ...player,
        guildId: data.guildId,
        guildName: data.guildName,
        guildTag: data.guildTag
      })
    }
  })

  room.onMessage('guildChat', (data) => {
    // Handle guild chat messages
    useGameStore.getState().addChatMessage({
      id: `guild_${data.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: data.playerId,
      playerName: data.playerName,
      message: data.message,
      timestamp: data.timestamp,
      type: 'guild',
      color: '#9d00ff'
    })
  })

  // Whisper handler is registered early in joinRoom() to ensure it's always available
  // Registering here as well for redundancy (safe to have multiple handlers)
  room.onMessage('whisper', (data: { fromId: string; fromName: string; message: string; timestamp: number }) => {
    useGameStore.getState().addChatMessage({
      id: `whisper_${data.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: data.fromId,
      playerName: data.fromName,
      message: data.message,
      timestamp: data.timestamp,
      type: 'whisper',
      color: '#00ff00'
    })
  })

  room.onMessage('emote', (data) => {
    // Display emote notification
    useGameStore.getState().addChatMessage({
      id: `emote_${data.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      playerId: data.playerId,
      playerName: data.playerName,
      message: `*${data.playerName} ${data.emote}s*`,
      timestamp: data.timestamp,
      type: 'system',
      color: '#ffff00'
    })
  })

  // Validate state properties exist and are MapSchema instances before accessing them
  // Do this BEFORE setting listenersSetup = true to ensure we don't mark as setup if validation fails
  // Check for both MapSchema structure ($items, $indexes) and onAdd method
  const isMapSchema = (obj: any): boolean => {
    if (!obj || typeof obj !== 'object') return false
    // Check for MapSchema structure (has $items and $indexes properties)
    const hasMapSchemaStructure = obj.$items !== undefined && obj.$indexes !== undefined
    // Check for onAdd method (when fully decoded)
    const hasOnAddMethod = typeof obj.onAdd === 'function'
    // Either structure or method indicates it's a MapSchema
    return hasMapSchemaStructure || hasOnAddMethod
  }

  // Check if methods are actually available (not just structure)
  const hasMapSchemaMethods = (obj: any): boolean => {
    return obj && typeof obj.onAdd === 'function' && typeof obj.onRemove === 'function' && typeof obj.onChange === 'function'
  }

  // At this point, we've already waited for methods to be available
  // But double-check to be safe - players is critical, others are optional
  // Add defensive check for room and room.state
  if (!room || !room.state || !room.state.players || !isMapSchema(room.state.players)) {
    // Set up a fallback to retry when state changes
    let retryHandled = false
    const retryOnStateChange = (_state: any) => {
      if (!retryHandled && room && room.state && isMapSchema(room.state.players) && hasMapSchemaMethods(room.state.players)) {
        retryHandled = true
        setupRoomListeners(room)
      }
    }
    // Use onStateChange (Colyseus API) instead of room.once which doesn't exist
    if (room) {
      room.onStateChange(retryOnStateChange)
    }
    
    // Also retry after a delay as fallback
    setTimeout(() => {
      if (!retryHandled && room && room.state && isMapSchema(room.state.players) && hasMapSchemaMethods(room.state.players)) {
        retryHandled = true
        setupRoomListeners(room)
      }
    }, 500)
    return
  }

  // If players MapSchema exists but methods aren't ready, wait a bit more
  if (!hasMapSchemaMethods(room.state.players)) {
    // Set up a fallback to retry when state changes
    let retryHandled = false
    const retryOnStateChange = (_state: any) => {
      if (!retryHandled && room && room.state && hasMapSchemaMethods(room.state.players)) {
        retryHandled = true
        setupRoomListeners(room)
      }
    }
    // Use onStateChange (Colyseus API) instead of room.once which doesn't exist
    if (room) {
      room.onStateChange(retryOnStateChange)
    }
    
    // Also retry after a delay as fallback
    setTimeout(() => {
      if (!retryHandled && room && room.state && hasMapSchemaMethods(room.state.players)) {
        retryHandled = true
        setupRoomListeners(room)
      }
    }, 500)
    return
  }

  // Add defensive checks for all state accesses
  if (!room || !room.state) {
    console.error('Room or room.state is null, cannot setup listeners')
    return
  }

  if (!room.state.enemies || !isMapSchema(room.state.enemies)) {
    // Silently continue - enemies might not be critical for initial setup
  }

  if (!room.state.lootDrops || !isMapSchema(room.state.lootDrops)) {
    // Silently continue - lootDrops might not be critical for initial setup
  }

  if (!room.state.powerUps || !isMapSchema(room.state.powerUps)) {
    // Silently continue - powerUps might not be critical for initial setup
  }

  // Now set up state listeners AFTER message handlers are registered and validation passes
  // Use try-catch to prevent errors during listener setup from causing disconnects
  try {
    listenersSetup = true
    
    // Track state change timing for latency monitoring
    let lastStateChangeTime = Date.now()
    
    // Listen for state changes
    room.onStateChange((state) => {
      // Add defensive check - room might have been closed
      if (!room || !room.state) {
        return
      }
      
      // Measure latency based on state change frequency
      // This provides a proxy for connection quality
      const now = Date.now()
      const timeSinceLastChange = now - lastStateChangeTime
      lastStateChangeTime = now
      
      // Record connection quality metrics (time between state updates is a proxy for latency)
      // Only record if we have a reasonable interval (not the first update)
      if (timeSinceLastChange > 0 && timeSinceLastChange < 1000) {
        // Import connectionMonitor dynamically to avoid circular dependencies
        import('./connectionMonitor').then(({ connectionMonitor }) => {
          // Use time between state changes as a latency indicator
          // Lower intervals = better connection, higher intervals = worse connection
          // Convert interval to a latency-like metric (inverse relationship)
          const latencyProxy = Math.min(timeSinceLastChange, 500) // Cap at 500ms
          connectionMonitor.recordPacket(latencyProxy)
        }).catch(() => {
          // Silently fail if connectionMonitor is not available
        })
      }
      
      syncGameState(state)
    })

    // Listen for player updates
    // Double-check onAdd exists before calling (defensive programming)
    // Add defensive check for room and room.state
    if (room && room.state && room.state.players && typeof room.state.players.onAdd === 'function') {
      room.state.players.onAdd((player: PlayerSchema, sessionId: string) => {
      // Prevent duplicate additions - check if player already exists
      const { otherPlayers } = useGameStore.getState()
      
      // Don't add ourselves or if player already exists
      if (sessionId === room?.sessionId || otherPlayers.has(sessionId)) {
        return
      }
      
      // Other player joined
      useGameStore.getState().addOtherPlayer({
        id: sessionId,
        name: player.name,
        race: player.race as any,
        level: player.level,
        xp: 0,
        xpToNext: 100,
        credits: 0,
        position: { x: player.x, y: player.y, z: player.z },
        rotation: player.rotation,
        health: player.health,
        maxHealth: player.maxHealth,
        mana: player.mana,
        maxMana: player.maxMana,
        guildId: player.guildId || undefined,
        guildTag: player.guildTag || undefined,
        guildName: player.guildName || undefined
      })
    })
  } else {
    console.error('room.state.players.onAdd is not a function')
  }

  if (typeof room.state.players.onRemove === 'function') {
    room.state.players.onRemove((_player: PlayerSchema, sessionId: string) => {
      if (sessionId !== room?.sessionId) {
        useGameStore.getState().removeOtherPlayer(sessionId)
      }
    })
  }

  if (typeof room.state.players.onChange === 'function') {
    room.state.players.onChange((player: PlayerSchema, sessionId: string) => {
      // Guard against null/undefined player
      if (!player) return
      
      if (sessionId === room?.sessionId) {
        // For own player, use reconciliation instead of direct overwrite
        // This allows client-side prediction to work properly
        const { player: currentPlayer } = useGameStore.getState()
        if (currentPlayer) {
          // Check if player is actively moving (keys pressed)
          // We need to access the keysPressed from KeyboardControls, but we can't directly
          // Instead, check if local position is different from server (indicating active movement)
          const positionDiff = Math.sqrt(
            Math.pow(player.x - currentPlayer.position.x, 2) +
            Math.pow(player.z - currentPlayer.position.z, 2)
          )
          
          // Check if player is actively moving - if so, completely ignore server position updates
          const { isPlayerMoving } = useGameStore.getState()
          
          // If player is actively moving, NEVER update position from server (client-side prediction)
          // This is critical for responsive movement and prevents stuttering/rubberbanding
          if (isPlayerMoving) {
            // Only update non-position stats, preserve local position completely
            // Use a more efficient update that doesn't trigger unnecessary re-renders
            const currentState = useGameStore.getState()
            if (
              currentState.player &&
              (currentState.player.health !== player.health ||
              currentState.player.mana !== player.mana ||
              currentState.player.level !== player.level)
            ) {
              // Only update if stats actually changed to prevent unnecessary state updates
              useGameStore.setState({
                player: {
                  ...currentPlayer,
                  health: player.health,
                  maxHealth: player.maxHealth,
                  mana: player.mana,
                  maxMana: player.maxMana,
                  level: player.level,
                  guildId: player.guildId || undefined,
                  guildTag: player.guildTag || undefined,
                  guildName: player.guildName || undefined
                }
              })
            }
            return // Exit early - don't process position update at all
          }
          
          // Check if local position is significantly different from server
          // If difference is large, server is correcting (anti-cheat or lag correction)
          // If difference is small, player is moving locally - ignore server update
          const shouldReconcile = positionDiff > 5.0 // Increased threshold to 5.0 units to prevent overwriting during movement
          
          // IMPORTANT: Only update position from server if reconciliation is needed
          // Completely ignore server updates when difference < 5.0 units to allow client-side prediction
          if (shouldReconcile) {
            // Check if network reconciliation is enabled via feature flag
            if (!isFeatureEnabled('networkReconciliationEnabled')) {
              // Skip reconciliation - rely on client-side prediction only
              return
            }
            
            // Large difference - server correction needed (anti-cheat or significant lag)
            // Only log in dev mode and very rarely to avoid spam
            if (import.meta.env.DEV && Math.random() < 0.01) {
              console.warn('⚠️ Server position correction (large diff):', {
                local: { x: currentPlayer.position.x.toFixed(2), y: currentPlayer.position.y.toFixed(2), z: currentPlayer.position.z.toFixed(2) },
                server: { x: player.x.toFixed(2), y: player.y.toFixed(2), z: player.z.toFixed(2) },
                diff: positionDiff.toFixed(2)
              })
            }
            import('./syncSystem').then(({ reconcilePosition }) => {
              reconcilePosition({ x: player.x, y: player.y, z: player.z }, player.rotation)
            })
          }
          // Removed verbose logging of ignored updates - they're expected during movement
          // If difference is small (< 5.0 units), ignore server position update
          // This allows client-side prediction to work smoothly
          
          // Always update non-position stats (health, mana, etc.) from server
          // BUT preserve local position if player is actively moving
          const { setPlayer } = useGameStore.getState()
          setPlayer({
            ...currentPlayer,
            // Only update position/rotation if reconciling, otherwise preserve local state
            ...(shouldReconcile ? {
              position: { x: player.x, y: player.y, z: player.z },
              rotation: player.rotation
            } : {}),
            health: player.health,
            maxHealth: player.maxHealth,
            mana: player.mana,
            maxMana: player.maxMana,
            level: player.level,
            guildId: player.guildId || undefined,
            guildTag: player.guildTag || undefined,
            guildName: player.guildName || undefined
          })
        }
      } else {
        useGameStore.getState().updateOtherPlayer(sessionId, {
          position: { x: player.x, y: player.y, z: player.z },
          rotation: player.rotation,
          health: player.health,
          mana: player.mana,
          guildId: player.guildId || undefined,
          guildTag: player.guildTag || undefined,
          guildName: player.guildName || undefined
        })
      }
    })
  }

  // Listen for enemy updates (with defensive check)
  if (room && room.state && room.state.enemies && typeof room.state.enemies.onAdd === 'function') {
    room.state.enemies.onAdd((enemy: EnemySchema) => {
      useGameStore.getState().addEnemy({
        id: enemy.id,
        type: enemy.type,
        position: { x: enemy.x, y: enemy.y, z: enemy.z },
        rotation: enemy.rotation,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        level: enemy.level,
        ownerId: enemy.ownerId || undefined
      })
    })

    if (typeof room.state.enemies.onRemove === 'function') {
      room.state.enemies.onRemove((enemy: EnemySchema) => {
        useGameStore.getState().removeEnemy(enemy.id)
      })
    }

    if (typeof room.state.enemies.onChange === 'function') {
      room.state.enemies.onChange((enemy: EnemySchema) => {
        useGameStore.getState().updateEnemy(enemy.id, {
          position: { x: enemy.x, y: enemy.y, z: enemy.z },
          rotation: enemy.rotation,
          health: enemy.health
        })
      })
    }
  }

  // Listen for loot drops (with defensive check)
  if (room && room.state && room.state.lootDrops && typeof room.state.lootDrops.onAdd === 'function') {
    room.state.lootDrops.onAdd((loot: LootDropSchema) => {
      const item = getItem(loot.itemId)
      if (item) {
        useGameStore.getState().addLootDrop({
          id: loot.id,
          item,
          position: { x: loot.x, y: loot.y, z: loot.z },
          ownerId: loot.ownerId || undefined,
          expiresAt: loot.expiresAt
        })
      }
    })

    if (typeof room.state.lootDrops.onRemove === 'function') {
      room.state.lootDrops.onRemove((loot: LootDropSchema) => {
        useGameStore.getState().removeLootDrop(loot.id)
      })
    }
  }

  // Listen for power-ups (with defensive check)
  if (room && room.state && room.state.powerUps && typeof room.state.powerUps.onAdd === 'function') {
    room.state.powerUps.onAdd((powerUp: PowerUpSchema) => {
      useGameStore.getState().addPowerUp({
        id: powerUp.id,
        powerUpId: powerUp.powerUpId,
        type: powerUp.type as PowerUpType,
        position: { x: powerUp.x, y: powerUp.y, z: powerUp.z },
        spawnTime: powerUp.spawnTime,
        expiresAt: powerUp.expiresAt
      })
    })

    if (typeof room.state.powerUps.onRemove === 'function') {
      room.state.powerUps.onRemove((powerUp: PowerUpSchema) => {
        useGameStore.getState().removePowerUp(powerUp.id)
      })
    }
  }
  } catch (error) {
    console.error('Error setting up room listeners:', error)
    // Don't mark as setup if there was an error, so it can be retried
    listenersSetup = false
    // Re-throw to let caller handle it, but log it first
    throw error
  }
}

function syncGameState(state: NexusRoomState) {
  if (!room?.sessionId) return

  const serverPlayer = state.players.get(room.sessionId)
  if (!serverPlayer) return

  const { player, isPlayerMoving } = useGameStore.getState()
  if (!player) return

  // Calculate distance between local and server position
  const dx = player.position.x - serverPlayer.x
  const dz = player.position.z - serverPlayer.z
  const distance = Math.sqrt(dx * dx + dz * dz)

  // Check if network reconciliation is enabled via feature flag
  if (!isFeatureEnabled('networkReconciliationEnabled')) {
    // Skip reconciliation - rely on client-side prediction only
    return
  }
  
  // ONLY reconcile when player is NOT moving OR if there's a significant discrepancy
  // This prevents server from overwriting client-side prediction during active movement
  if (!isPlayerMoving || distance > 5.0) {
    // Only update if difference is significant to prevent micro-corrections
    if (distance > 2.0 || !isPlayerMoving) {
      useGameStore.getState().updatePlayerPosition({
        x: serverPlayer.x,
        y: serverPlayer.y,
        z: serverPlayer.z
      })
      useGameStore.getState().updatePlayerRotation(serverPlayer.rotation)
    }
  }

  // Update other stats always
  useGameStore.getState().setPlayer({
    ...player,
    health: serverPlayer.health,
    mana: serverPlayer.mana,
    level: serverPlayer.level,
  })
}

export function sendMovement(x: number, y: number, z: number, rotation: number) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      sendBinaryMessage(room, 'move', { x, y, z, rotation })
    } catch (error) {
      // Connection might have closed between check and send
      if (import.meta.env.DEV) {
        console.warn('Failed to send movement:', error)
      }
    }
  }
}

export function sendSpellCast(spellId: string, position: { x: number; y: number; z: number }, rotation: number) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      sendBinaryMessage(room, 'castSpell', { spellId, position, rotation })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send spell cast:', error)
      }
    }
  }
}

export function sendChatMessage(message: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      sendBinaryMessage(room, 'chat', { text: message })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send chat message:', error)
      }
    }
  }
}

export function sendLootPickup(lootId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      sendBinaryMessage(room, 'pickupLoot', { lootId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send loot pickup:', error)
      }
    }
  }
}

export function sendPowerUpPickup(powerUpId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      sendBinaryMessage(room, 'pickupPowerUp', { powerUpId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send power-up pickup:', error)
      }
    }
  }
}

export function sendGuildCreate(name: string, tag: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('createGuild', { name, tag })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send guild create:', error)
      }
    }
  }
}

export function sendGuildJoin(guildId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('joinGuild', { guildId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send guild join:', error)
      }
    }
  }
}

export function sendGuildLeave() {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('leaveGuild', {})
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send guild leave:', error)
      }
    }
  }
}

// Housing functions
export function requestHousing() {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('requestHousing', {})
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to request housing:', error)
      }
    }
  }
}

export function createHousing() {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('createHousing', {})
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to create housing:', error)
      }
    }
  }
}

export function placeFurniture(furnitureId: string, position: { x: number; y: number; z: number }, rotation: number) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('placeFurniture', { furnitureId, position, rotation })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to place furniture:', error)
      }
    }
  }
}

export function removeFurniture(furnitureItemId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('removeFurniture', { furnitureItemId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to remove furniture:', error)
      }
    }
  }
}

// Social functions
export function sendFriendRequest(targetPlayerId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('sendFriendRequest', { targetPlayerId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send friend request:', error)
      }
    }
  }
}

export function acceptFriendRequest(requestId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('acceptFriendRequest', { requestId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to accept friend request:', error)
      }
    }
  }
}

export function rejectFriendRequest(requestId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('rejectFriendRequest', { requestId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to reject friend request:', error)
      }
    }
  }
}

export function requestFriends() {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('requestFriends', {})
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to request friends:', error)
      }
    }
  }
}

export function removeFriend(friendId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('removeFriend', { friendId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to remove friend:', error)
      }
    }
  }
}

export function blockPlayer(targetPlayerId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('blockPlayer', { targetPlayerId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to block player:', error)
      }
    }
  }
}

export function reportPlayer(targetPlayerId: string, reason: string, description: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('reportPlayer', { targetPlayerId, reason, description })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to report player:', error)
      }
    }
  }
}

export function sendGuildChat(message: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('guildChat', { text: message })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send guild chat:', error)
      }
    }
  }
}

// Dungeon functions
export function createDungeon(difficulty: number, level: number) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('createDungeon', { difficulty, level })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to create dungeon:', error)
      }
    }
  }
}

export function enterDungeon(dungeonId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('enterDungeon', { dungeonId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to enter dungeon:', error)
      }
    }
  }
}

export function exitDungeon(dungeonId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('exitDungeon', { dungeonId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to exit dungeon:', error)
      }
    }
  }
}

export function requestDungeonProgress(dungeonId: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('requestDungeonProgress', { dungeonId })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to request dungeon progress:', error)
      }
    }
  }
}

export function sendWhisper(targetId: string, message: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('whisper', { targetId, text: message })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send whisper:', error)
      }
    }
  }
}

export function sendEmote(emote: string) {
  if (room && room.connection && room.connection.isOpen) {
    try {
      room.send('emote', { emote })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('Failed to send emote:', error)
      }
    }
  }
}

export function getRoom(): Room | null {
  return room
}


