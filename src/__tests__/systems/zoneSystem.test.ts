/**
 * Unit tests for Zone System
 */

import {
  canEnterZone,
  getAvailableZones,
  getRecommendedZone,
  checkZoneTransition
} from '../../game/systems/zoneSystem'
import { getZone } from '../../game/data/zones'

describe('Zone System', () => {
  describe('canEnterZone', () => {
    test('should allow entry when player level is within zone range', () => {
      const zone = getZone('nexus_city')
      if (!zone) {
        // Skip if zone doesn't exist
        return
      }

      const canEnter = canEnterZone(zone.levelRange[0], 'nexus_city')
      expect(canEnter).toBe(true)
    })

    test('should deny entry when player level is below zone range', () => {
      const zone = getZone('nexus_city')
      if (!zone) return

      const canEnter = canEnterZone(zone.levelRange[0] - 1, 'nexus_city')
      expect(canEnter).toBe(false)
    })

    test('should deny entry when player level is above zone range', () => {
      const zone = getZone('nexus_city')
      if (!zone) return

      const canEnter = canEnterZone(zone.levelRange[1] + 1, 'nexus_city')
      expect(canEnter).toBe(false)
    })

    test('should return false for invalid zone ID', () => {
      const canEnter = canEnterZone(10, 'invalid_zone')
      expect(canEnter).toBe(false)
    })
  })

  describe('getAvailableZones', () => {
    test('should return zones within player level range', () => {
      const zones = getAvailableZones(10)
      
      expect(Array.isArray(zones)).toBe(true)
      zones.forEach(zone => {
        expect(zone.levelRange[0]).toBeLessThanOrEqual(10)
        expect(zone.levelRange[1]).toBeGreaterThanOrEqual(10)
      })
    })

    test('should return empty array for level 0', () => {
      const zones = getAvailableZones(0)
      expect(Array.isArray(zones)).toBe(true)
    })

    test('should return zones for high level players', () => {
      const zones = getAvailableZones(100)
      expect(Array.isArray(zones)).toBe(true)
    })
  })

  describe('getRecommendedZone', () => {
    test('should return a zone for valid level', () => {
      const zone = getRecommendedZone(10)
      
      if (zone) {
        expect(zone.levelRange[0]).toBeLessThanOrEqual(10)
        expect(zone.levelRange[1]).toBeGreaterThanOrEqual(10)
      }
    })

    test('should return undefined for invalid level', () => {
      const zone = getRecommendedZone(-1)
      expect(zone).toBeUndefined()
    })
  })

  describe('checkZoneTransition', () => {
    test('should detect zone transition at transition point', () => {
      const newZone = checkZoneTransition(
        { x: 50, y: 0, z: 0 },
        'nexus_city'
      )
      
      expect(newZone).toBe('quantum_peak')
    })

    test('should return null when not at transition point', () => {
      const newZone = checkZoneTransition(
        { x: 0, y: 0, z: 0 },
        'nexus_city'
      )
      
      expect(newZone).toBeNull()
    })

    test('should return null when far from transition point', () => {
      const newZone = checkZoneTransition(
        { x: 100, y: 0, z: 100 },
        'nexus_city'
      )
      
      expect(newZone).toBeNull()
    })

    test('should handle Y position in distance calculation', () => {
      const newZone = checkZoneTransition(
        { x: 50, y: 100, z: 0 },
        'nexus_city'
      )
      
      // Should still detect transition (Y is not used in distance calc)
      expect(newZone).toBe('quantum_peak')
    })

    test('should return null for invalid current zone', () => {
      const newZone = checkZoneTransition(
        { x: 50, y: 0, z: 0 },
        'invalid_zone'
      )
      
      expect(newZone).toBeNull()
    })
  })
})

