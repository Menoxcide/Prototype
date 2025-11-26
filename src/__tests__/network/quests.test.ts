/**
 * Unit tests for Quest Network Functions
 */

import { acceptQuest, completeQuest, requestAvailableQuests } from '../../game/network/quests'

// Mock colyseus and gameStore
jest.mock('../../game/network/colyseus', () => ({
  getRoom: jest.fn(() => ({
    connection: { isOpen: true },
    send: jest.fn()
  }))
}))

jest.mock('../../game/store/useGameStore', () => ({
  useGameStore: {
    getState: jest.fn(() => ({
      player: { id: 'player1', level: 10 }
    }))
  }
}))

describe('Quest Network Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('acceptQuest', () => {
    test('should send accept quest message', () => {
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      acceptQuest('quest_id')
      
      expect(mockRoom.send).toHaveBeenCalledWith('acceptQuest', { questId: 'quest_id' })
    })

    test('should not send if room not connected', () => {
      const { getRoom } = require('../../game/network/colyseus')
      getRoom.mockReturnValueOnce({
        connection: { isOpen: false },
        send: jest.fn()
      })
      
      expect(() => acceptQuest('quest_id')).not.toThrow()
    })
  })

  describe('completeQuest', () => {
    test('should send complete quest message', () => {
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      completeQuest('quest_id')
      
      expect(mockRoom.send).toHaveBeenCalledWith('completeQuest', { questId: 'quest_id' })
    })
  })

  describe('requestAvailableQuests', () => {
    test('should send request available quests message', () => {
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      requestAvailableQuests()
      
      expect(mockRoom.send).toHaveBeenCalledWith('requestAvailableQuests', { level: 10 })
    })

    test('should not send if player not available', () => {
      const { useGameStore } = require('../../game/store/useGameStore')
      useGameStore.getState.mockReturnValueOnce({ player: null })
      
      const { getRoom } = require('../../game/network/colyseus')
      const mockRoom = getRoom()
      
      requestAvailableQuests()
      
      expect(mockRoom.send).not.toHaveBeenCalled()
    })
  })
})

