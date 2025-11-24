/**
 * Housing System - Manages player housing instances
 */

import { DatabaseService } from '../services/DatabaseService'
import { PlayerDataRepository } from '../services/PlayerDataRepository'
import { HousingInstance, FurnitureItem, HousingUpgrade } from '../../../shared/src/types/housing'

export interface HousingSystem {
  loadHousing(playerId: string): Promise<HousingInstance | null>
  createHousing(playerId: string): Promise<HousingInstance>
  placeFurniture(playerId: string, furnitureId: string, position: { x: number; y: number; z: number }, rotation: number): Promise<boolean>
  removeFurniture(playerId: string, furnitureItemId: string): Promise<boolean>
  upgradeHousing(playerId: string, upgradeType: string): Promise<boolean>
  visitHousing(playerId: string, ownerId: string): Promise<HousingInstance | null>
  getHousingUpgrades(playerId: string): Promise<HousingUpgrade[]>
}

export class HousingSystemImpl implements HousingSystem {
  private housingInstances: Map<string, HousingInstance> = new Map()

  constructor(
    private db: DatabaseService | null,
    private playerDataRepo: PlayerDataRepository | null
  ) {}

  async loadHousing(playerId: string): Promise<HousingInstance | null> {
    // Check cache first
    if (this.housingInstances.has(playerId)) {
      return this.housingInstances.get(playerId)!
    }

    // Load from database if available
    if (this.db) {
      try {
        const result = await this.db.query(
          'SELECT * FROM housing WHERE player_id = $1',
          [playerId]
        )
        
        if (result.length > 0) {
          const data = result[0] as {
            id: string
            player_id: string
            level: number
            size: string
            furniture: string | null
            upgrades: string | null
            created_at: Date
            last_visited: Date | null
          }
          const housing: HousingInstance = {
            id: data.id,
            playerId: data.player_id,
            level: data.level,
            size: JSON.parse(data.size),
            furniture: JSON.parse(data.furniture || '[]'),
            upgrades: JSON.parse(data.upgrades || '[]'),
            createdAt: data.created_at.getTime(),
            lastVisited: data.last_visited ? data.last_visited.getTime() : Date.now()
          }
          this.housingInstances.set(playerId, housing)
          return housing
        }
      } catch (error) {
        console.error('Failed to load housing from database:', error)
      }
    }

    return null
  }

  async createHousing(playerId: string): Promise<HousingInstance> {
    // Check if housing already exists
    const existing = await this.loadHousing(playerId)
    if (existing) {
      return existing
    }

    const housing: HousingInstance = {
      id: `housing_${playerId}_${Date.now()}`,
      playerId,
      level: 1,
      size: { width: 10, height: 5, depth: 10 },
      furniture: [],
      upgrades: [],
      createdAt: Date.now(),
      lastVisited: Date.now()
    }

    this.housingInstances.set(playerId, housing)

    // Save to database if available
    if (this.db) {
      try {
        await this.db.query(
          `INSERT INTO housing (id, player_id, level, size, furniture, upgrades, created_at, last_visited)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (player_id) DO UPDATE SET last_visited = $8`,
          [
            housing.id,
            housing.playerId,
            housing.level,
            JSON.stringify(housing.size),
            JSON.stringify(housing.furniture),
            JSON.stringify(housing.upgrades),
            housing.createdAt,
            housing.lastVisited
          ]
        )
      } catch (error) {
        console.error('Failed to save housing to database:', error)
      }
    }

    return housing
  }

  async placeFurniture(
    playerId: string,
    furnitureId: string,
    position: { x: number; y: number; z: number },
    rotation: number
  ): Promise<boolean> {
    const housing = await this.loadHousing(playerId)
    if (!housing) {
      return false
    }

    // Check furniture limit
    const maxFurniture = 20 + (housing.level * 5)
    if (housing.furniture.length >= maxFurniture) {
      return false
    }

    const furnitureItem: FurnitureItem = {
      id: `furniture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      furnitureId,
      position,
      rotation,
      scale: 1.0
    }

    housing.furniture.push(furnitureItem)
    housing.lastVisited = Date.now()

    // Save to database
    await this.saveHousing(housing)

    return true
  }

  async removeFurniture(playerId: string, furnitureItemId: string): Promise<boolean> {
    const housing = await this.loadHousing(playerId)
    if (!housing) {
      return false
    }

    const index = housing.furniture.findIndex(f => f.id === furnitureItemId)
    if (index === -1) {
      return false
    }

    housing.furniture.splice(index, 1)
    housing.lastVisited = Date.now()

    await this.saveHousing(housing)
    return true
  }

  async upgradeHousing(playerId: string, upgradeType: string): Promise<boolean> {
    const housing = await this.loadHousing(playerId)
    if (!housing) {
      return false
    }

    // Check if upgrade already exists
    const existingUpgrade = housing.upgrades.find(u => u.type === upgradeType)
    if (existingUpgrade) {
      existingUpgrade.level++
    } else {
      housing.upgrades.push({
        id: `upgrade_${Date.now()}`,
        type: upgradeType as any,
        level: 1,
        cost: 1000,
        unlockedAt: Date.now()
      })
    }

    // Apply upgrade effects
    if (upgradeType === 'size') {
      housing.size.width += 2
      housing.size.depth += 2
    }

    housing.level++
    housing.lastVisited = Date.now()

    await this.saveHousing(housing)
    return true
  }

  async visitHousing(playerId: string, ownerId: string): Promise<HousingInstance | null> {
    const housing = await this.loadHousing(ownerId)
    if (!housing) {
      return null
    }

    housing.lastVisited = Date.now()
    await this.saveHousing(housing)

    return housing
  }

  async getHousingUpgrades(playerId: string): Promise<HousingUpgrade[]> {
    const housing = await this.loadHousing(playerId)
    return housing ? housing.upgrades : []
  }

  private async saveHousing(housing: HousingInstance): Promise<void> {
    if (this.db) {
      try {
        await this.db.query(
          `INSERT INTO housing (id, player_id, level, size, furniture, upgrades, created_at, last_visited)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (player_id) DO UPDATE SET
             level = $3,
             size = $4,
             furniture = $5,
             upgrades = $6,
             last_visited = $8`,
          [
            housing.id,
            housing.playerId,
            housing.level,
            JSON.stringify(housing.size),
            JSON.stringify(housing.furniture),
            JSON.stringify(housing.upgrades),
            housing.createdAt,
            housing.lastVisited
          ]
        )
      } catch (error) {
        console.error('Failed to save housing:', error)
      }
    }
  }
}

