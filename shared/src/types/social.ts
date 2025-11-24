/**
 * Social Features Types - Shared between client and server
 */

export interface Friend {
  id: string
  name: string
  level: number
  isOnline: boolean
  lastSeen: number
  status?: 'online' | 'away' | 'busy' | 'offline'
}

export interface FriendRequest {
  id: string
  fromPlayerId: string
  fromPlayerName: string
  toPlayerId: string
  timestamp: number
  status: 'pending' | 'accepted' | 'rejected'
}

export interface PartyMember {
  playerId: string
  name: string
  role?: 'leader' | 'member'
  level: number
  health: number
  maxHealth: number
  position: { x: number; y: number; z: number }
}

export interface Party {
  id: string
  leaderId: string
  members: PartyMember[]
  maxSize: number
  createdAt: number
  sharedObjectives?: Array<{
    id: string
    type: string
    target: string
    quantity: number
    progress: number
  }>
}

export interface GuildRank {
  id: string
  name: string
  permissions: {
    invite: boolean
    kick: boolean
    promote: boolean
    manageGuild: boolean
    manageTreasury: boolean
  }
  level: number
}

export interface GuildMember {
  playerId: string
  name: string
  rank: GuildRank
  joinedAt: number
  contribution: number
}

export interface Report {
  id: string
  reporterId: string
  reportedId: string
  reason: string
  description: string
  timestamp: number
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
}

export interface BlockedPlayer {
  playerId: string
  name: string
  blockedAt: number
}

export interface PrivacySettings {
  playerId: string
  showOnlineStatus: boolean
  allowFriendRequests: boolean
  allowPartyInvites: boolean
  allowGuildInvites: boolean
  allowWhispers: 'all' | 'friends' | 'guild' | 'none'
  showLocation: boolean
}

