/**
 * Unit tests for Trading Network Functions
 */

import { initiateTrade, addTradeItem, removeTradeItem, setTradeCredits, confirmTrade, cancelTrade } from '../../game/network/trading'

// Mock colyseus module
jest.mock('../../game/network/colyseus', () => ({
  getRoom: jest.fn(() => ({
    connection: { isOpen: true },
    send: jest.fn()
  }))
}))

describe('Trading Network Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initiateTrade', () => {
    test('should send initiate trade message', () => {
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      initiateTrade('target_player_id')
      
      expect(mockRoom.send).toHaveBeenCalledWith('initiateTrade', { targetPlayerId: 'target_player_id' })
    })

    test('should not send if room not connected', () => {
      const { getRoom } = require('../../game/network/colyseus')
      getRoom.mockReturnValueOnce({
        connection: { isOpen: false },
        send: jest.fn()
      })
      
      expect(() => initiateTrade('target_player_id')).not.toThrow()
    })
  })

  describe('addTradeItem', () => {
    test('should send add trade item message', () => {
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      addTradeItem('session_id', 'item_id', 5)
      
      expect(mockRoom.send).toHaveBeenCalledWith('addTradeItem', {
        sessionId: 'session_id',
        itemId: 'item_id',
        quantity: 5
      })
    })
  })

  describe('removeTradeItem', () => {
    test('should send remove trade item message', () => {
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      removeTradeItem('session_id', 'item_id')
      
      expect(mockRoom.send).toHaveBeenCalledWith('removeTradeItem', {
        sessionId: 'session_id',
        itemId: 'item_id'
      })
    })
  })

  describe('setTradeCredits', () => {
    test('should send set trade credits message', () => {
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      setTradeCredits('session_id', 1000)
      
      expect(mockRoom.send).toHaveBeenCalledWith('setTradeCredits', {
        sessionId: 'session_id',
        credits: 1000
      })
    })
  })

  describe('confirmTrade', () => {
    test('should send confirm trade message', () => {
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      confirmTrade('session_id')
      
      expect(mockRoom.send).toHaveBeenCalledWith('confirmTrade', {
        sessionId: 'session_id'
      })
    })
  })

  describe('cancelTrade', () => {
    test('should send cancel trade message', () => {
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      cancelTrade('session_id')
      
      expect(mockRoom.send).toHaveBeenCalledWith('cancelTrade', {
        sessionId: 'session_id'
      })
    })
  })
})

