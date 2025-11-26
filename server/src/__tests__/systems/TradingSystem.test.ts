/**
 * Unit tests for Trading System
 */

import { TradingSystemImpl } from '../../systems/TradingSystem'
import { InMemoryDatabaseService } from '../../services/DatabaseService'
import { PlayerDataRepository } from '../../services/PlayerDataRepository'

describe('Trading System', () => {
  let tradingSystem: TradingSystemImpl
  let dbService: InMemoryDatabaseService
  let playerDataRepo: PlayerDataRepository
  const player1Id = 'test_player_1'
  const player2Id = 'test_player_2'

  const mockValidateProximity = jest.fn(() => true)
  const mockGetPlayerInventory = jest.fn(async () => [
    { itemId: 'item1', quantity: 10 },
    { itemId: 'item2', quantity: 5 }
  ])
  const mockValidateItemOwnership = jest.fn(async () => true)

  beforeEach(async () => {
    dbService = new InMemoryDatabaseService()
    await dbService.connect()
    playerDataRepo = new PlayerDataRepository(dbService)
    tradingSystem = new TradingSystemImpl(
      dbService,
      playerDataRepo,
      mockValidateProximity,
      mockGetPlayerInventory,
      mockValidateItemOwnership
    )
    mockValidateProximity.mockClear()
    mockGetPlayerInventory.mockClear()
    mockValidateItemOwnership.mockClear()
  })

  afterEach(async () => {
    await dbService.disconnect()
  })

  describe('initiateTrade', () => {
    test('should create trade session between two players', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      
      expect(session).not.toBeNull()
      expect(session?.player1Id).toBe(player1Id)
      expect(session?.player2Id).toBe(player2Id)
      expect(session?.status).toBe('pending')
    })

    test('should return null if players not in proximity', async () => {
      mockValidateProximity.mockReturnValue(false)
      
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      expect(session).toBeNull()
    })

    test('should return null if player already in trade', async () => {
      await tradingSystem.initiateTrade(player1Id, player2Id)
      
      const session = await tradingSystem.initiateTrade(player1Id, 'player3')
      expect(session).toBeNull()
    })
  })

  describe('addItem', () => {
    test('should add item to trade offer', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      if (!session) return
      
      const added = await tradingSystem.addItem(session.id, player1Id, 'item1', 5)
      expect(added).toBe(true)
      
      const updatedSession = tradingSystem.getTradeSession(session.id)
      expect(updatedSession?.player1Offer.items.length).toBeGreaterThan(0)
    })

    test('should reset confirmation when adding item', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      if (!session) return
      
      await tradingSystem.confirmTrade(session.id, player1Id)
      await tradingSystem.addItem(session.id, player1Id, 'item1', 5)
      
      const updatedSession = tradingSystem.getTradeSession(session.id)
      expect(updatedSession?.player1Confirmed).toBe(false)
    })

    test('should return false for invalid session', async () => {
      const added = await tradingSystem.addItem('invalid_session', player1Id, 'item1', 5)
      expect(added).toBe(false)
    })
  })

  describe('removeItem', () => {
    test('should remove item from trade offer', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      if (!session) return
      
      await tradingSystem.addItem(session.id, player1Id, 'item1', 5)
      const removed = await tradingSystem.removeItem(session.id, player1Id, 'item1')
      
      expect(removed).toBe(true)
      const updatedSession = tradingSystem.getTradeSession(session.id)
      expect(updatedSession?.player1Offer.items.length).toBe(0)
    })
  })

  describe('setCredits', () => {
    test('should set credits in trade offer', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      if (!session) return
      
      const set = await tradingSystem.setCredits(session.id, player1Id, 1000)
      expect(set).toBe(true)
      
      const updatedSession = tradingSystem.getTradeSession(session.id)
      expect(updatedSession?.player1Offer.credits).toBe(1000)
    })
  })

  describe('confirmTrade', () => {
    test('should confirm trade for player', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      if (!session) return
      
      const confirmed = await tradingSystem.confirmTrade(session.id, player1Id)
      expect(confirmed).toBe(true)
      
      const updatedSession = tradingSystem.getTradeSession(session.id)
      expect(updatedSession?.player1Confirmed).toBe(true)
    })

    test('should complete trade when both players confirm', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      if (!session) return
      
      await tradingSystem.confirmTrade(session.id, player1Id)
      await tradingSystem.confirmTrade(session.id, player2Id)
      
      const updatedSession = tradingSystem.getTradeSession(session.id)
      expect(updatedSession?.status).toBe('completed')
    })
  })

  describe('cancelTrade', () => {
    test('should cancel trade session', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      if (!session) return
      
      await tradingSystem.cancelTrade(session.id, player1Id)
      
      const updatedSession = tradingSystem.getTradeSession(session.id)
      expect(updatedSession?.status).toBe('cancelled')
    })
  })

  describe('getTradeSession', () => {
    test('should return trade session by ID', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      if (!session) return
      
      const retrieved = tradingSystem.getTradeSession(session.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(session.id)
    })

    test('should return null for invalid session ID', () => {
      const session = tradingSystem.getTradeSession('invalid_id')
      expect(session).toBeNull()
    })
  })

  describe('getPlayerTradeSession', () => {
    test('should return trade session for player', async () => {
      const session = await tradingSystem.initiateTrade(player1Id, player2Id)
      if (!session) return
      
      const retrieved = tradingSystem.getPlayerTradeSession(player1Id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(session.id)
    })

    test('should return null when player not in trade', () => {
      const session = tradingSystem.getPlayerTradeSession('player_not_in_trade')
      expect(session).toBeNull()
    })
  })
})

