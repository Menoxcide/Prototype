/**
 * Integration tests for Database Service
 */

import { createDatabaseService, DatabaseService } from '../../services/DatabaseService'

describe('Database Service Integration', () => {
  let db: DatabaseService

  beforeEach(async () => {
    db = createDatabaseService()
    // Use in-memory database for tests
  })

  afterEach(async () => {
    // Cleanup
  })

  test('should save and load player data', async () => {
    const playerId = 'test_player_1'
    const now = new Date()
    const playerData = {
      id: playerId,
      name: 'Test Player',
      race: 'human',
      level: 5,
      xp: 500,
      xpToNext: 1000,
      credits: 1000,
      position: { x: 10, y: 0, z: 20 },
      rotation: 0,
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 100,
      inventory: [],
      equippedSpells: [],
      achievements: [],
      quests: [],
      battlePass: {
        season: 1,
        currentTier: 0,
        currentXP: 0,
        premiumUnlocked: false,
        claimedTiers: []
      },
      createdAt: now,
      lastLogin: now,
      updatedAt: now
    }

    await db.savePlayerData(playerId, playerData)
    const loaded = await db.loadPlayerData(playerId)

    expect(loaded).toBeDefined()
    expect(loaded?.name).toBe(playerData.name)
    expect(loaded?.level).toBe(playerData.level)
  })

  test('should handle transactions', async () => {
    const result = await db.transaction(async (tx) => {
      await tx.query('INSERT INTO players (id, name) VALUES ($1, $2)', ['tx1', 'Transaction Test'])
      return 'success'
    })

    expect(result).toBe('success')
  })

  test('should handle query errors gracefully', async () => {
    await expect(
      db.query('SELECT * FROM non_existent_table', [])
    ).rejects.toThrow()
  })
})

