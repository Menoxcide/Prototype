/**
 * Binary Protocol for Network Messages
 * Reduces bandwidth by 30-50% compared to JSON
 */

/**
 * Message type IDs (1 byte each, max 255 types)
 */
export enum MessageType {
  // Movement (1-10)
  MOVE = 1,
  CAST_SPELL = 2,
  PICKUP_LOOT = 3,
  PICKUP_POWER_UP = 4,
  
  // Chat (11-20)
  CHAT = 11,
  WHISPER = 12,
  GUILD_CHAT = 13,
  EMOTE = 14,
  
  // Guild (21-30)
  CREATE_GUILD = 21,
  JOIN_GUILD = 22,
  LEAVE_GUILD = 23,
  
  // Quest (31-40)
  ACCEPT_QUEST = 31,
  COMPLETE_QUEST = 32,
  
  // Battle Pass (41-50)
  CLAIM_BATTLE_PASS_REWARD = 41,
  UNLOCK_BATTLE_PASS_PREMIUM = 42,
  REQUEST_BATTLE_PASS_PROGRESS = 43,
  
  // Dungeon (51-60)
  CREATE_DUNGEON = 51,
  ENTER_DUNGEON = 52,
  EXIT_DUNGEON = 53,
  REQUEST_DUNGEON_PROGRESS = 54,
  
  // Trading (61-70)
  INITIATE_TRADE = 61,
  ADD_TRADE_ITEM = 62,
  REMOVE_TRADE_ITEM = 63,
  SET_TRADE_CREDITS = 64,
  CONFIRM_TRADE = 65,
  CANCEL_TRADE = 66,
  
  // Achievement (71-80)
  REQUEST_ACHIEVEMENT_PROGRESS = 71,
  
  // Social (81-90)
  SEND_FRIEND_REQUEST = 81,
  ACCEPT_FRIEND_REQUEST = 82,
  DECLINE_FRIEND_REQUEST = 83,
  REMOVE_FRIEND = 84,
  
  // State updates (91-100)
  STATE_DELTA = 91,
  QUEST_UPDATE = 92,
  BATTLE_PASS_UPDATE = 93,
  HOUSING_DATA = 94,
  FRIENDS_LIST = 95,
  FRIEND_REQUESTS = 96,
  FRIEND_REQUEST_RECEIVED = 97,
  FRIEND_REQUEST_SENT = 98,
  AVAILABLE_QUESTS = 99
}

/**
 * Protocol version
 */
export const PROTOCOL_VERSION = 1

/**
 * Binary message writer
 */
export class BinaryWriter {
  private buffer: Uint8Array
  private view: DataView
  private offset: number = 0

  constructor(initialSize: number = 1024) {
    this.buffer = new Uint8Array(initialSize)
    this.view = new DataView(this.buffer.buffer)
  }

  private ensureCapacity(bytes: number): void {
    if (this.offset + bytes > this.buffer.length) {
      const newSize = Math.max(this.buffer.length * 2, this.offset + bytes)
      const newBuffer = new Uint8Array(newSize)
      newBuffer.set(this.buffer)
      this.buffer = newBuffer
      this.view = new DataView(this.buffer.buffer)
    }
  }

  writeUint8(value: number): void {
    this.ensureCapacity(1)
    this.view.setUint8(this.offset, value)
    this.offset++
  }

  writeUint16(value: number): void {
    this.ensureCapacity(2)
    this.view.setUint16(this.offset, value, true) // little-endian
    this.offset += 2
  }

  writeUint32(value: number): void {
    this.ensureCapacity(4)
    this.view.setUint32(this.offset, value, true) // little-endian
    this.offset += 4
  }

  writeFloat32(value: number): void {
    this.ensureCapacity(4)
    this.view.setFloat32(this.offset, value, true) // little-endian
    this.offset += 4
  }

  writeString(str: string): void {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(str)
    this.writeUint16(bytes.length)
    this.ensureCapacity(bytes.length)
    this.buffer.set(bytes, this.offset)
    this.offset += bytes.length
  }

  writeBytes(bytes: Uint8Array): void {
    this.writeUint32(bytes.length)
    this.ensureCapacity(bytes.length)
    this.buffer.set(bytes, this.offset)
    this.offset += bytes.length
  }

  getBuffer(): Uint8Array {
    return this.buffer.subarray(0, this.offset)
  }
}

/**
 * Binary message reader
 */
export class BinaryReader {
  private buffer: Uint8Array
  private view: DataView
  private offset: number = 0

  constructor(buffer: Uint8Array) {
    this.buffer = buffer
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  }

  readUint8(): number {
    const value = this.view.getUint8(this.offset)
    this.offset++
    return value
  }

  readUint16(): number {
    const value = this.view.getUint16(this.offset, true) // little-endian
    this.offset += 2
    return value
  }

  readUint32(): number {
    const value = this.view.getUint32(this.offset, true) // little-endian
    this.offset += 4
    return value
  }

  readFloat32(): number {
    const value = this.view.getFloat32(this.offset, true) // little-endian
    this.offset += 4
    return value
  }

  readString(): string {
    const length = this.readUint16()
    const bytes = this.buffer.subarray(this.offset, this.offset + length)
    this.offset += length
    const decoder = new TextDecoder()
    return decoder.decode(bytes)
  }

  readBytes(): Uint8Array {
    const length = this.readUint32()
    const bytes = this.buffer.subarray(this.offset, this.offset + length)
    this.offset += length
    return bytes
  }

  getRemaining(): number {
    return this.buffer.length - this.offset
  }
}

/**
 * Serialize a message to binary
 */
export function serializeMessage(type: MessageType, data: any): Uint8Array {
  const writer = new BinaryWriter()
  
  // Write protocol header: version (1 byte) + type (1 byte)
  writer.writeUint8(PROTOCOL_VERSION)
  writer.writeUint8(type)
  
  // Write message data based on type
  switch (type) {
    case MessageType.MOVE:
      writer.writeFloat32(data.x)
      writer.writeFloat32(data.y)
      writer.writeFloat32(data.z)
      writer.writeFloat32(data.rotation)
      break
      
    case MessageType.CAST_SPELL:
      writer.writeString(data.spellId)
      writer.writeFloat32(data.position.x)
      writer.writeFloat32(data.position.y)
      writer.writeFloat32(data.position.z)
      writer.writeFloat32(data.rotation)
      break
      
    case MessageType.CHAT:
      writer.writeString(data.text)
      break
      
    case MessageType.WHISPER:
      writer.writeString(data.targetId)
      writer.writeString(data.text)
      break
      
    case MessageType.PICKUP_LOOT:
      writer.writeString(data.lootId)
      break
      
    case MessageType.PICKUP_POWER_UP:
      writer.writeString(data.powerUpId)
      break
      
    case MessageType.CREATE_GUILD:
      writer.writeString(data.name)
      writer.writeString(data.tag)
      break
      
    case MessageType.JOIN_GUILD:
      writer.writeString(data.guildId)
      break
      
    case MessageType.ACCEPT_QUEST:
      writer.writeString(data.questId)
      break
      
    case MessageType.COMPLETE_QUEST:
      writer.writeString(data.questId)
      break
      
    case MessageType.STATE_DELTA:
      // Write number of deltas
      writer.writeUint16(data.deltas.length)
      for (const delta of data.deltas) {
        writer.writeUint8(delta.type === 'player' ? 1 : delta.type === 'enemy' ? 2 : delta.type === 'loot' ? 3 : 4)
        writer.writeString(delta.id)
        if (delta.position) {
          writer.writeFloat32(delta.position.x)
          writer.writeFloat32(delta.position.y)
          writer.writeFloat32(delta.position.z)
        }
        if (delta.rotation !== undefined) {
          writer.writeFloat32(delta.rotation)
        }
        if (delta.health !== undefined) {
          writer.writeFloat32(delta.health)
        }
        if (delta.maxHealth !== undefined) {
          writer.writeFloat32(delta.maxHealth)
        }
      }
      break
      
    default:
      // Fallback to JSON for unknown types
      const json = JSON.stringify(data)
      writer.writeString(json)
      break
  }
  
  return writer.getBuffer()
}

/**
 * Deserialize a binary message
 */
export function deserializeMessage(buffer: Uint8Array): { type: MessageType; data: any } | null {
  try {
    const reader = new BinaryReader(buffer)
    
    // Read protocol header
    const version = reader.readUint8()
    if (version !== PROTOCOL_VERSION) {
      // Protocol version mismatch - fallback to JSON
      return null
    }
    
    const type = reader.readUint8() as MessageType
    
    // Read message data based on type
    let data: any
    
    switch (type) {
      case MessageType.MOVE:
        data = {
          x: reader.readFloat32(),
          y: reader.readFloat32(),
          z: reader.readFloat32(),
          rotation: reader.readFloat32()
        }
        break
        
      case MessageType.CAST_SPELL:
        data = {
          spellId: reader.readString(),
          position: {
            x: reader.readFloat32(),
            y: reader.readFloat32(),
            z: reader.readFloat32()
          },
          rotation: reader.readFloat32()
        }
        break
        
      case MessageType.CHAT:
        data = { text: reader.readString() }
        break
        
      case MessageType.WHISPER:
        data = {
          targetId: reader.readString(),
          text: reader.readString()
        }
        break
        
      case MessageType.PICKUP_LOOT:
        data = { lootId: reader.readString() }
        break
        
      case MessageType.PICKUP_POWER_UP:
        data = { powerUpId: reader.readString() }
        break
        
      case MessageType.CREATE_GUILD:
        data = {
          name: reader.readString(),
          tag: reader.readString()
        }
        break
        
      case MessageType.JOIN_GUILD:
        data = { guildId: reader.readString() }
        break
        
      case MessageType.ACCEPT_QUEST:
        data = { questId: reader.readString() }
        break
        
      case MessageType.COMPLETE_QUEST:
        data = { questId: reader.readString() }
        break
        
      case MessageType.STATE_DELTA:
        const deltaCount = reader.readUint16()
        const deltas = []
        for (let i = 0; i < deltaCount; i++) {
          const deltaType = reader.readUint8()
          const typeStr = deltaType === 1 ? 'player' : deltaType === 2 ? 'enemy' : deltaType === 3 ? 'loot' : 'projectile'
          const id = reader.readString()
          const delta: any = { type: typeStr, id }
          
          // Read optional fields (check remaining bytes)
          if (reader.getRemaining() > 0) {
            try {
              delta.position = {
                x: reader.readFloat32(),
                y: reader.readFloat32(),
                z: reader.readFloat32()
              }
            } catch {
              // No position
            }
          }
          if (reader.getRemaining() > 0) {
            try {
              delta.rotation = reader.readFloat32()
            } catch {
              // No rotation
            }
          }
          if (reader.getRemaining() > 0) {
            try {
              delta.health = reader.readFloat32()
            } catch {
              // No health
            }
          }
          if (reader.getRemaining() > 0) {
            try {
              delta.maxHealth = reader.readFloat32()
            } catch {
              // No maxHealth
            }
          }
          deltas.push(delta)
        }
        data = { deltas }
        break
        
      default:
        // Fallback to JSON for unknown types
        data = JSON.parse(reader.readString())
        break
    }
    
    return { type, data }
  } catch (error) {
    console.error('Failed to deserialize binary message:', error)
    return null
  }
}

/**
 * Check if binary protocol is supported
 */
export function isBinaryProtocolSupported(): boolean {
  return typeof Uint8Array !== 'undefined' && typeof DataView !== 'undefined'
}

