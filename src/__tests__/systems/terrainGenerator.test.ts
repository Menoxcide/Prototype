/**
 * Unit tests for Terrain Generator
 */

import {
  generateHeightMap,
  generateTerrainChunk,
  TerrainConfig
} from '../../game/systems/terrainGenerator'

describe('Terrain Generator', () => {
  const defaultConfig: TerrainConfig = {
    chunkSize: 100,
    heightMapResolution: 32,
    maxHeight: 20,
    minHeight: 0,
    noiseScale: 0.1,
    riverCount: 2,
    mountainCount: 3,
    smoothness: 0.5
  }

  describe('generateHeightMap', () => {
    test('should generate height map with correct dimensions', () => {
      const heightMap = generateHeightMap(0, 0, defaultConfig)
      
      expect(heightMap.length).toBe(defaultConfig.heightMapResolution)
      heightMap.forEach(row => {
        expect(row.length).toBe(defaultConfig.heightMapResolution)
      })
    })

    test('should generate heights within range', () => {
      const heightMap = generateHeightMap(0, 0, defaultConfig)
      
      heightMap.forEach(row => {
        row.forEach(height => {
          expect(height).toBeGreaterThanOrEqual(defaultConfig.minHeight)
          expect(height).toBeLessThanOrEqual(defaultConfig.maxHeight)
        })
      })
    })

    test('should generate different heights for different chunks', () => {
      const heightMap1 = generateHeightMap(0, 0, defaultConfig)
      const heightMap2 = generateHeightMap(1, 1, defaultConfig)
      
      // Heights should generally be different (allowing for some similarity)
      let differences = 0
      for (let x = 0; x < defaultConfig.heightMapResolution; x++) {
        for (let z = 0; z < defaultConfig.heightMapResolution; z++) {
          if (Math.abs(heightMap1[x][z] - heightMap2[x][z]) > 0.1) {
            differences++
          }
        }
      }
      
      // Should have some differences
      expect(differences).toBeGreaterThan(0)
    })

    test('should respect custom config values', () => {
      const customConfig: TerrainConfig = {
        ...defaultConfig,
        maxHeight: 50,
        minHeight: 10,
        heightMapResolution: 16
      }
      
      const heightMap = generateHeightMap(0, 0, customConfig)
      
      expect(heightMap.length).toBe(16)
      heightMap.forEach(row => {
        expect(row.length).toBe(16)
        row.forEach(height => {
          expect(height).toBeGreaterThanOrEqual(10)
          expect(height).toBeLessThanOrEqual(50)
        })
      })
    })
  })

  describe('generateTerrainChunk', () => {
    test('should generate terrain chunk with all required properties', () => {
      const chunk = generateTerrainChunk(0, 0, defaultConfig)
      
      expect(chunk).toHaveProperty('x')
      expect(chunk).toHaveProperty('z')
      expect(chunk).toHaveProperty('heightMap')
      expect(chunk).toHaveProperty('biome')
      expect(chunk).toHaveProperty('objects')
      expect(chunk).toHaveProperty('rivers')
      expect(chunk).toHaveProperty('mountains')
    })

    test('should set correct chunk coordinates', () => {
      const chunk = generateTerrainChunk(5, 10, defaultConfig)
      
      expect(chunk.x).toBe(5)
      expect(chunk.z).toBe(10)
    })

    test('should generate height map for chunk', () => {
      const chunk = generateTerrainChunk(0, 0, defaultConfig)
      
      expect(chunk.heightMap.length).toBe(defaultConfig.heightMapResolution)
      chunk.heightMap.forEach(row => {
        expect(row.length).toBe(defaultConfig.heightMapResolution)
      })
    })

    test('should generate rivers within count limit', () => {
      const chunk = generateTerrainChunk(0, 0, defaultConfig)
      
      expect(chunk.rivers.length).toBeLessThanOrEqual(defaultConfig.riverCount)
      chunk.rivers.forEach(river => {
        expect(river).toHaveProperty('id')
        expect(river).toHaveProperty('path')
        expect(river).toHaveProperty('width')
        expect(river).toHaveProperty('depth')
        expect(river).toHaveProperty('color')
        expect(river.path.length).toBeGreaterThan(0)
      })
    })

    test('should generate mountains within count limit', () => {
      const chunk = generateTerrainChunk(0, 0, defaultConfig)
      
      expect(chunk.mountains.length).toBeLessThanOrEqual(defaultConfig.mountainCount)
      chunk.mountains.forEach(mountain => {
        expect(mountain).toHaveProperty('id')
        expect(mountain).toHaveProperty('position')
        expect(mountain).toHaveProperty('height')
        expect(mountain).toHaveProperty('radius')
        expect(mountain).toHaveProperty('color')
        expect(mountain.height).toBeGreaterThan(0)
        expect(mountain.radius).toBeGreaterThan(0)
      })
    })

    test('should assign biome to chunk', () => {
      const chunk = generateTerrainChunk(0, 0, defaultConfig)
      
      expect(typeof chunk.biome).toBe('string')
      expect(chunk.biome.length).toBeGreaterThan(0)
    })

    test('should generate terrain objects', () => {
      const chunk = generateTerrainChunk(0, 0, defaultConfig)
      
      expect(Array.isArray(chunk.objects)).toBe(true)
      chunk.objects.forEach(obj => {
        expect(obj).toHaveProperty('id')
        expect(obj).toHaveProperty('type')
        expect(obj).toHaveProperty('position')
        expect(obj).toHaveProperty('rotation')
        expect(obj).toHaveProperty('scale')
      })
    })
  })
})

