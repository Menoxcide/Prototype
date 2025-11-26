/**
 * Unit tests for Social System
 */

import { SocialSystemImpl } from '../../systems/SocialSystem'
import { InMemoryDatabaseService } from '../../services/DatabaseService'
import { PlayerDataRepository } from '../../services/PlayerDataRepository'

describe('Social System', () => {
  let socialSystem: SocialSystemImpl
  let dbService: InMemoryDatabaseService
  let playerDataRepo: PlayerDataRepository
  const player1Id = 'test_player_1'
  const player2Id = 'test_player_2'

  beforeEach(async () => {
    dbService = new InMemoryDatabaseService()
    await dbService.connect()
    playerDataRepo = new PlayerDataRepository(dbService)
    socialSystem = new SocialSystemImpl(dbService, playerDataRepo)
  })

  afterEach(async () => {
    await dbService.disconnect()
  })

  describe('sendFriendRequest', () => {
    test('should send friend request', async () => {
      const request = await socialSystem.sendFriendRequest(player1Id, player2Id)
      
      expect(request).not.toBeNull()
      expect(request?.fromPlayerId).toBe(player1Id)
      expect(request?.toPlayerId).toBe(player2Id)
      expect(request?.status).toBe('pending')
    })

    test('should return null if already friends', async () => {
      await socialSystem.sendFriendRequest(player1Id, player2Id)
      await socialSystem.acceptFriendRequest(
        (await socialSystem.getFriendRequests(player2Id))[0].id,
        player2Id
      )
      
      const request = await socialSystem.sendFriendRequest(player1Id, player2Id)
      expect(request).toBeNull()
    })

    test('should return null if request already exists', async () => {
      await socialSystem.sendFriendRequest(player1Id, player2Id)
      const request = await socialSystem.sendFriendRequest(player1Id, player2Id)
      expect(request).toBeNull()
    })
  })

  describe('acceptFriendRequest', () => {
    test('should accept friend request', async () => {
      await socialSystem.sendFriendRequest(player1Id, player2Id)
      const requests = await socialSystem.getFriendRequests(player2Id)
      
      const accepted = await socialSystem.acceptFriendRequest(requests[0].id, player2Id)
      expect(accepted).toBe(true)
      
      const friends = await socialSystem.getFriends(player2Id)
      expect(friends.some(f => f.playerId === player1Id)).toBe(true)
    })
  })

  describe('rejectFriendRequest', () => {
    test('should reject friend request', async () => {
      await socialSystem.sendFriendRequest(player1Id, player2Id)
      const requests = await socialSystem.getFriendRequests(player2Id)
      
      const rejected = await socialSystem.rejectFriendRequest(requests[0].id, player2Id)
      expect(rejected).toBe(true)
      
      const updatedRequests = await socialSystem.getFriendRequests(player2Id)
      expect(updatedRequests.length).toBe(0)
    })
  })

  describe('removeFriend', () => {
    test('should remove friend', async () => {
      await socialSystem.sendFriendRequest(player1Id, player2Id)
      const requests = await socialSystem.getFriendRequests(player2Id)
      await socialSystem.acceptFriendRequest(requests[0].id, player2Id)
      
      const removed = await socialSystem.removeFriend(player2Id, player1Id)
      expect(removed).toBe(true)
      
      const friends = await socialSystem.getFriends(player2Id)
      expect(friends.some(f => f.playerId === player1Id)).toBe(false)
    })
  })

  describe('createParty', () => {
    test('should create party', async () => {
      const party = await socialSystem.createParty(player1Id)
      
      expect(party).toBeDefined()
      expect(party.leaderId).toBe(player1Id)
      expect(party.members.length).toBe(1)
    })
  })

  describe('inviteToParty', () => {
    test('should invite player to party', async () => {
      const party = await socialSystem.createParty(player1Id)
      const invited = await socialSystem.inviteToParty(party.id, player1Id, player2Id)
      
      expect(invited).toBe(true)
    })
  })

  describe('joinParty', () => {
    test('should join party', async () => {
      const party = await socialSystem.createParty(player1Id)
      await socialSystem.inviteToParty(party.id, player1Id, player2Id)
      
      const joined = await socialSystem.joinParty(party.id, player2Id)
      expect(joined).toBe(true)
      
      const updatedParty = socialSystem.getParty(party.id)
      expect(updatedParty?.members.some(m => m.playerId === player2Id)).toBe(true)
    })
  })

  describe('blockPlayer', () => {
    test('should block player', async () => {
      const blocked = await socialSystem.blockPlayer(player1Id, player2Id)
      expect(blocked).toBe(true)
      
      const isBlocked = await socialSystem.isBlocked(player1Id, player2Id)
      expect(isBlocked).toBe(true)
    })
  })

  describe('reportPlayer', () => {
    test('should create report', async () => {
      const report = await socialSystem.reportPlayer(player1Id, player2Id, 'cheating', 'Description')
      
      expect(report).toBeDefined()
      expect(report.reporterId).toBe(player1Id)
      expect(report.reportedId).toBe(player2Id)
      expect(report.reason).toBe('cheating')
    })
  })
})

