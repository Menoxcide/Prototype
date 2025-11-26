/**
 * Unit tests for Client Prediction System
 */

import { initializePrediction, predictMovement, reconcileWithServer, getPredictedState } from '../../game/network/prediction'

describe('Client Prediction', () => {
  beforeEach(() => {
    // Reset prediction system
  })

  describe('initializePrediction', () => {
    test('should initialize prediction with initial state', () => {
      const initialState = {
        id: 'player1',
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        timestamp: Date.now()
      }
      
      expect(() => initializePrediction(initialState)).not.toThrow()
    })
  })

  describe('predictMovement', () => {
    test('should predict movement', () => {
      const initialState = {
        id: 'player1',
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        timestamp: Date.now()
      }
      
      initializePrediction(initialState)
      
      const newPosition = { x: 1, y: 0, z: 1 }
      const newRotation = Math.PI / 4
      
      expect(() => predictMovement(newPosition, newRotation)).not.toThrow()
    })
  })

  describe('reconcileWithServer', () => {
    test('should reconcile with server state', () => {
      const initialState = {
        id: 'player1',
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        timestamp: Date.now()
      }
      
      initializePrediction(initialState)
      
      const serverState = {
        id: 'player1',
        position: { x: 0.5, y: 0, z: 0.5 },
        rotation: 0,
        timestamp: Date.now() + 100
      }
      
      expect(() => reconcileWithServer(serverState)).not.toThrow()
    })

    test('should handle large discrepancies', () => {
      const initialState = {
        id: 'player1',
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        timestamp: Date.now()
      }
      
      initializePrediction(initialState)
      predictMovement({ x: 10, y: 0, z: 10 }, 0)
      
      const serverState = {
        id: 'player1',
        position: { x: 5, y: 0, z: 5 },
        rotation: 0,
        timestamp: Date.now() + 100
      }
      
      expect(() => reconcileWithServer(serverState)).not.toThrow()
    })
  })

  describe('getPredictedState', () => {
    test('should return predicted state', () => {
      const initialState = {
        id: 'player1',
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        timestamp: Date.now()
      }
      
      initializePrediction(initialState)
      predictMovement({ x: 1, y: 0, z: 1 }, Math.PI / 4)
      
      const state = getPredictedState()
      expect(state).toBeDefined()
      expect(state?.position.x).toBe(1)
      expect(state?.position.z).toBe(1)
    })
  })
})

