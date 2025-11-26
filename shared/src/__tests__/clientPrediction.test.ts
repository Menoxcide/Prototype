/**
 * Unit tests for Client Prediction System
 */

import { createClientPredictionSystem } from '../utils/clientPrediction'
import { PlayerState, PlayerInput } from '../types'

describe('Client Prediction System', () => {
  let predictionSystem: ReturnType<typeof createClientPredictionSystem>
  const initialState: PlayerState = {
    id: 'player1',
    position: { x: 0, y: 0, z: 0 },
    rotation: 0,
    timestamp: Date.now()
  }

  beforeEach(() => {
    predictionSystem = createClientPredictionSystem(initialState)
  })

  describe('predict', () => {
    test('should predict movement', () => {
      const input: PlayerInput = {
        position: { x: 1, y: 0, z: 1 },
        rotation: Math.PI / 4,
        timestamp: Date.now() + 100
      }
      
      const predicted = predictionSystem.predict(input)
      
      expect(predicted.position.x).toBe(1)
      expect(predicted.position.z).toBe(1)
      expect(predicted.rotation).toBe(Math.PI / 4)
    })

    test('should maintain history', () => {
      const input1: PlayerInput = {
        position: { x: 1, y: 0, z: 1 },
        rotation: 0,
        timestamp: Date.now() + 100
      }
      
      const input2: PlayerInput = {
        position: { x: 2, y: 0, z: 2 },
        rotation: 0,
        timestamp: Date.now() + 200
      }
      
      predictionSystem.predict(input1)
      predictionSystem.predict(input2)
      
      const state = predictionSystem.getCurrentState()
      expect(state?.position.x).toBe(2)
    })
  })

  describe('reconcile', () => {
    test('should reconcile with server state', () => {
      const input: PlayerInput = {
        position: { x: 1, y: 0, z: 1 },
        rotation: 0,
        timestamp: Date.now() + 100
      }
      
      predictionSystem.predict(input)
      
      const serverState: PlayerState = {
        id: 'player1',
        position: { x: 0.9, y: 0, z: 0.9 },
        rotation: 0,
        timestamp: Date.now() + 150
      }
      
      expect(() => predictionSystem.reconcile(serverState)).not.toThrow()
    })

    test('should handle large discrepancies', () => {
      const input: PlayerInput = {
        position: { x: 10, y: 0, z: 10 },
        rotation: 0,
        timestamp: Date.now() + 100
      }
      
      predictionSystem.predict(input)
      
      const serverState: PlayerState = {
        id: 'player1',
        position: { x: 5, y: 0, z: 5 },
        rotation: 0,
        timestamp: Date.now() + 150
      }
      
      expect(() => predictionSystem.reconcile(serverState)).not.toThrow()
    })
  })

  describe('rollback', () => {
    test('should rollback to server state', () => {
      const input: PlayerInput = {
        position: { x: 1, y: 0, z: 1 },
        rotation: 0,
        timestamp: Date.now() + 100
      }
      
      predictionSystem.predict(input)
      
      const serverState: PlayerState = {
        id: 'player1',
        position: { x: 0.5, y: 0, z: 0.5 },
        rotation: 0,
        timestamp: Date.now() + 50
      }
      
      predictionSystem.reconcile(serverState)
      const rolledBack = predictionSystem.rollback()
      
      expect(rolledBack).not.toBeNull()
    })
  })

  describe('getCurrentState', () => {
    test('should return current predicted state', () => {
      const input: PlayerInput = {
        position: { x: 1, y: 0, z: 1 },
        rotation: Math.PI / 4,
        timestamp: Date.now() + 100
      }
      
      predictionSystem.predict(input)
      const state = predictionSystem.getCurrentState()
      
      expect(state).not.toBeNull()
      expect(state?.position.x).toBe(1)
    })
  })
})

