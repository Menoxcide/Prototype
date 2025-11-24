/**
 * Social System - Manages friends, parties, guilds, moderation, and privacy
 */

import { DatabaseService } from '../services/DatabaseService'
import { PlayerDataRepository } from '../services/PlayerDataRepository'
import {
  Friend,
  FriendRequest,
  Party,
  PartyMember,
  GuildRank,
  GuildMember,
  Report,
  BlockedPlayer,
  PrivacySettings
} from '../../../shared/src/types/social'

export interface SocialSystem {
  // Friends
  sendFriendRequest(fromPlayerId: string, toPlayerId: string): Promise<FriendRequest | null>
  acceptFriendRequest(requestId: string, playerId: string): Promise<boolean>
  rejectFriendRequest(requestId: string, playerId: string): Promise<boolean>
  removeFriend(playerId: string, friendId: string): Promise<boolean>
  getFriends(playerId: string): Promise<Friend[]>
  getFriendRequests(playerId: string): Promise<FriendRequest[]>
  updateOnlineStatus(playerId: string, isOnline: boolean): Promise<void>
  
  // Parties
  createParty(leaderId: string): Promise<Party>
  inviteToParty(partyId: string, inviterId: string, inviteeId: string): Promise<boolean>
  joinParty(partyId: string, playerId: string): Promise<boolean>
  leaveParty(partyId: string, playerId: string): Promise<boolean>
  getParty(partyId: string): Party | null
  getPlayerParty(playerId: string): Party | null
  
  // Guilds (enhanced)
  promoteMember(guildId: string, memberId: string, newRank: GuildRank): Promise<boolean>
  demoteMember(guildId: string, memberId: string, newRank: GuildRank): Promise<boolean>
  getGuildRanks(guildId: string): Promise<GuildRank[]>
  getGuildMembers(guildId: string): Promise<GuildMember[]>
  
  // Moderation
  reportPlayer(reporterId: string, reportedId: string, reason: string, description: string): Promise<Report>
  blockPlayer(playerId: string, blockedId: string): Promise<boolean>
  unblockPlayer(playerId: string, blockedId: string): Promise<boolean>
  getBlockedPlayers(playerId: string): Promise<BlockedPlayer[]>
  isBlocked(playerId: string, otherPlayerId: string): Promise<boolean>
  
  // Privacy
  getPrivacySettings(playerId: string): Promise<PrivacySettings>
  updatePrivacySettings(playerId: string, settings: Partial<PrivacySettings>): Promise<boolean>
}

export class SocialSystemImpl implements SocialSystem {
  private friends: Map<string, Set<string>> = new Map() // playerId -> Set<friendId>
  private friendRequests: Map<string, FriendRequest> = new Map()
  private parties: Map<string, Party> = new Map()
  private playerParties: Map<string, string> = new Map() // playerId -> partyId
  private blockedPlayers: Map<string, Set<string>> = new Map() // playerId -> Set<blockedId>
  private privacySettings: Map<string, PrivacySettings> = new Map()
  private onlineStatus: Map<string, boolean> = new Map()

  constructor(
    private db: DatabaseService | null,
    private playerDataRepo: PlayerDataRepository | null
  ) {}

  async sendFriendRequest(fromPlayerId: string, toPlayerId: string): Promise<FriendRequest | null> {
    // Check if already friends
    const friends = this.friends.get(fromPlayerId)
    if (friends?.has(toPlayerId)) {
      return null
    }

    // Check if request already exists
    const existingRequest = Array.from(this.friendRequests.values())
      .find(r => r.fromPlayerId === fromPlayerId && r.toPlayerId === toPlayerId && r.status === 'pending')
    
    if (existingRequest) {
      return null
    }

    // Check privacy settings
    const privacy = await this.getPrivacySettings(toPlayerId)
    if (!privacy.allowFriendRequests) {
      return null
    }

    const request: FriendRequest = {
      id: `friend_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromPlayerId,
      fromPlayerName: 'Player', // Would fetch from player data
      toPlayerId,
      timestamp: Date.now(),
      status: 'pending'
    }

    this.friendRequests.set(request.id, request)
    return request
  }

  async acceptFriendRequest(requestId: string, playerId: string): Promise<boolean> {
    const request = this.friendRequests.get(requestId)
    if (!request || request.toPlayerId !== playerId || request.status !== 'pending') {
      return false
    }

    request.status = 'accepted'

    // Add to friends lists
    if (!this.friends.has(request.fromPlayerId)) {
      this.friends.set(request.fromPlayerId, new Set())
    }
    if (!this.friends.has(request.toPlayerId)) {
      this.friends.set(request.toPlayerId, new Set())
    }

    this.friends.get(request.fromPlayerId)!.add(request.toPlayerId)
    this.friends.get(request.toPlayerId)!.add(request.fromPlayerId)

    return true
  }

  async rejectFriendRequest(requestId: string, playerId: string): Promise<boolean> {
    const request = this.friendRequests.get(requestId)
    if (!request || request.toPlayerId !== playerId || request.status !== 'pending') {
      return false
    }

    request.status = 'rejected'
    this.friendRequests.delete(requestId)
    return true
  }

  async removeFriend(playerId: string, friendId: string): Promise<boolean> {
    const friends = this.friends.get(playerId)
    if (!friends || !friends.has(friendId)) {
      return false
    }

    friends.delete(friendId)
    const otherFriends = this.friends.get(friendId)
    if (otherFriends) {
      otherFriends.delete(playerId)
    }

    return true
  }

  async getFriends(playerId: string): Promise<Friend[]> {
    const friendIds = this.friends.get(playerId) || new Set()
    const friends: Friend[] = []

    for (const friendId of friendIds) {
      const isOnline = this.onlineStatus.get(friendId) || false
      friends.push({
        id: friendId,
        name: 'Friend', // Would fetch from player data
        level: 1, // Would fetch from player data
        isOnline,
        lastSeen: Date.now(),
        status: isOnline ? 'online' : 'offline'
      })
    }

    return friends
  }

  async getFriendRequests(playerId: string): Promise<FriendRequest[]> {
    return Array.from(this.friendRequests.values())
      .filter(r => (r.toPlayerId === playerId || r.fromPlayerId === playerId) && r.status === 'pending')
  }

  async updateOnlineStatus(playerId: string, isOnline: boolean): Promise<void> {
    this.onlineStatus.set(playerId, isOnline)
  }

  async createParty(leaderId: string): Promise<Party> {
    const party: Party = {
      id: `party_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      leaderId,
      members: [{
        playerId: leaderId,
        name: 'Leader', // Would fetch from player data
        role: 'leader',
        level: 1,
        health: 100,
        maxHealth: 100,
        position: { x: 0, y: 0, z: 0 }
      }],
      maxSize: 5,
      createdAt: Date.now()
    }

    this.parties.set(party.id, party)
    this.playerParties.set(leaderId, party.id)
    return party
  }

  async inviteToParty(partyId: string, inviterId: string, inviteeId: string): Promise<boolean> {
    const party = this.parties.get(partyId)
    if (!party || party.leaderId !== inviterId) {
      return false
    }

    if (party.members.length >= party.maxSize) {
      return false
    }

    // Check privacy settings
    const privacy = await this.getPrivacySettings(inviteeId)
    if (!privacy.allowPartyInvites) {
      return false
    }

    return true // Invitation sent (would need message system)
  }

  async joinParty(partyId: string, playerId: string): Promise<boolean> {
    const party = this.parties.get(partyId)
    if (!party || party.members.length >= party.maxSize) {
      return false
    }

    if (party.members.some(m => m.playerId === playerId)) {
      return false // Already in party
    }

    party.members.push({
      playerId,
      name: 'Player',
      role: 'member',
      level: 1,
      health: 100,
      maxHealth: 100,
      position: { x: 0, y: 0, z: 0 }
    })

    this.playerParties.set(playerId, partyId)
    return true
  }

  async leaveParty(partyId: string, playerId: string): Promise<boolean> {
    const party = this.parties.get(partyId)
    if (!party) {
      return false
    }

    const memberIndex = party.members.findIndex(m => m.playerId === playerId)
    if (memberIndex === -1) {
      return false
    }

    party.members.splice(memberIndex, 1)
    this.playerParties.delete(playerId)

    // If leader left, assign new leader or disband
    if (party.leaderId === playerId && party.members.length > 0) {
      party.leaderId = party.members[0].playerId
      party.members[0].role = 'leader'
    } else if (party.members.length === 0) {
      this.parties.delete(partyId)
    }

    return true
  }

  getParty(partyId: string): Party | null {
    return this.parties.get(partyId) || null
  }

  getPlayerParty(playerId: string): Party | null {
    const partyId = this.playerParties.get(playerId)
    return partyId ? this.parties.get(partyId) || null : null
  }

  async promoteMember(guildId: string, memberId: string, newRank: GuildRank): Promise<boolean> {
    // Implementation would update guild member rank
    return true
  }

  async demoteMember(guildId: string, memberId: string, newRank: GuildRank): Promise<boolean> {
    // Implementation would update guild member rank
    return true
  }

  async getGuildRanks(guildId: string): Promise<GuildRank[]> {
    // Default ranks
    return [
      {
        id: 'leader',
        name: 'Leader',
        permissions: {
          invite: true,
          kick: true,
          promote: true,
          manageGuild: true,
          manageTreasury: true
        },
        level: 5
      },
      {
        id: 'officer',
        name: 'Officer',
        permissions: {
          invite: true,
          kick: true,
          promote: false,
          manageGuild: false,
          manageTreasury: false
        },
        level: 3
      },
      {
        id: 'member',
        name: 'Member',
        permissions: {
          invite: false,
          kick: false,
          promote: false,
          manageGuild: false,
          manageTreasury: false
        },
        level: 1
      }
    ]
  }

  async getGuildMembers(guildId: string): Promise<GuildMember[]> {
    // Implementation would fetch from database
    return []
  }

  async reportPlayer(
    reporterId: string,
    reportedId: string,
    reason: string,
    description: string
  ): Promise<Report> {
    const report: Report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reporterId,
      reportedId,
      reason,
      description,
      timestamp: Date.now(),
      status: 'pending'
    }

    // Would save to database for moderation review
    return report
  }

  async blockPlayer(playerId: string, blockedId: string): Promise<boolean> {
    if (!this.blockedPlayers.has(playerId)) {
      this.blockedPlayers.set(playerId, new Set())
    }
    this.blockedPlayers.get(playerId)!.add(blockedId)
    return true
  }

  async unblockPlayer(playerId: string, blockedId: string): Promise<boolean> {
    const blocked = this.blockedPlayers.get(playerId)
    if (!blocked || !blocked.has(blockedId)) {
      return false
    }
    blocked.delete(blockedId)
    return true
  }

  async getBlockedPlayers(playerId: string): Promise<BlockedPlayer[]> {
    const blockedIds = this.blockedPlayers.get(playerId) || new Set()
    return Array.from(blockedIds).map(id => ({
      playerId: id,
      name: 'Blocked Player',
      blockedAt: Date.now()
    }))
  }

  async isBlocked(playerId: string, otherPlayerId: string): Promise<boolean> {
    const blocked = this.blockedPlayers.get(playerId)
    return blocked ? blocked.has(otherPlayerId) : false
  }

  async getPrivacySettings(playerId: string): Promise<PrivacySettings> {
    if (!this.privacySettings.has(playerId)) {
      // Default privacy settings
      this.privacySettings.set(playerId, {
        playerId,
        showOnlineStatus: true,
        allowFriendRequests: true,
        allowPartyInvites: true,
        allowGuildInvites: true,
        allowWhispers: 'all',
        showLocation: true
      })
    }
    return this.privacySettings.get(playerId)!
  }

  async updatePrivacySettings(
    playerId: string,
    settings: Partial<PrivacySettings>
  ): Promise<boolean> {
    const current = await this.getPrivacySettings(playerId)
    this.privacySettings.set(playerId, { ...current, ...settings })
    return true
  }
}

