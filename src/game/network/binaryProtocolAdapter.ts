/**
 * Binary Protocol Adapter for Colyseus
 * Provides binary serialization for state updates with JSON fallback
 */

import { 
  MessageType, 
  serializeMessage, 
  deserializeMessage, 
  isBinaryProtocolSupported,
  PROTOCOL_VERSION 
} from '../../../shared/src/utils/binaryProtocol'

/**
 * Protocol negotiation result
 */
export interface ProtocolSupport {
  binarySupported: boolean
  version: number
  useBinary: boolean
}

/**
 * Check if binary protocol should be used
 */
let protocolSupport: ProtocolSupport | null = null

export function negotiateProtocol(): ProtocolSupport {
  if (protocolSupport) {
    return protocolSupport
  }
  
  const supported = isBinaryProtocolSupported()
  
  // Check if binary protocol is enabled (can be disabled via localStorage)
  const binaryEnabled = localStorage.getItem('binaryProtocol') !== 'false'
  
  protocolSupport = {
    binarySupported: supported,
    version: PROTOCOL_VERSION,
    useBinary: supported && binaryEnabled
  }
  
  return protocolSupport
}

/**
 * Send binary message (if supported) or fallback to JSON
 */
export function sendBinaryMessage(
  room: any,
  messageType: string,
  data: any
): void {
  const protocol = negotiateProtocol()
  
  if (!protocol.useBinary) {
    // Fallback to JSON
    room.send(messageType, data)
    return
  }
  
  // Map message type string to MessageType enum
  const typeMap: Record<string, MessageType> = {
    'move': MessageType.MOVE,
    'castSpell': MessageType.CAST_SPELL,
    'chat': MessageType.CHAT,
    'whisper': MessageType.WHISPER,
    'pickupLoot': MessageType.PICKUP_LOOT,
    'pickupPowerUp': MessageType.PICKUP_POWER_UP,
    'createGuild': MessageType.CREATE_GUILD,
    'joinGuild': MessageType.JOIN_GUILD,
    'leaveGuild': MessageType.LEAVE_GUILD,
    'acceptQuest': MessageType.ACCEPT_QUEST,
    'completeQuest': MessageType.COMPLETE_QUEST,
    'stateDelta': MessageType.STATE_DELTA
  }
  
  const binaryType = typeMap[messageType]
  
  if (binaryType) {
    try {
      const binaryData = serializeMessage(binaryType, data)
      // Send as binary (Colyseus supports ArrayBuffer)
      room.send(messageType, binaryData.buffer)
    } catch (error) {
      console.warn('Binary serialization failed, falling back to JSON:', error)
      room.send(messageType, data)
    }
  } else {
    // Unknown message type, use JSON
    room.send(messageType, data)
  }
}

/**
 * Receive and deserialize binary message
 */
export function receiveBinaryMessage(
  _messageType: string,
  data: any
): any {
  const protocol = negotiateProtocol()
  
  if (!protocol.useBinary || !(data instanceof ArrayBuffer)) {
    // Not binary or binary not supported, return as-is
    return data
  }
  
  try {
    const buffer = new Uint8Array(data)
    const deserialized = deserializeMessage(buffer)
    
    if (deserialized) {
      return deserialized.data
    }
  } catch (error) {
    console.warn('Binary deserialization failed:', error)
  }
  
  // Fallback: try to parse as JSON
  try {
    if (typeof data === 'string') {
      return JSON.parse(data)
    }
  } catch {
    // Not JSON either
  }
  
  return data
}

/**
 * Enable or disable binary protocol
 */
export function setBinaryProtocolEnabled(enabled: boolean): void {
  localStorage.setItem('binaryProtocol', enabled ? 'true' : 'false')
  protocolSupport = null // Reset to renegotiate
}

