/**
 * TradingSystem - Manages player-to-player trading
 * Handles trade initiation, offer modification, confirmation, and execution
 */

import { TradeSession, TradeOffer } from '../../../shared/src/types/trading'
import { DatabaseService } from '../services/DatabaseService'
import { PlayerDataRepository } from '../services/PlayerDataRepository'

export interface TradingSystem {
  initiateTrade(player1Id: string, player2Id: string): Promise<TradeSession | null>
  addItem(sessionId: string, playerId: string, itemId: string, quantity: number): Promise<boolean>
  removeItem(sessionId: string, playerId: string, itemId: string): Promise<boolean>
  setCredits(sessionId: string, playerId: string, credits: number): Promise<boolean>
  confirmTrade(sessionId: string, playerId: string): Promise<boolean>
  cancelTrade(sessionId: string, playerId: string): Promise<void>
  getTradeSession(sessionId: string): TradeSession | null
  getPlayerTradeSession(playerId: string): TradeSession | null
}

export class TradingSystemImpl implements TradingSystem {
  private tradeSessions: Map<string, TradeSession> = new Map()
  private playerTrades: Map<string, string> = new Map() // playerId -> sessionId
  private tradeLogs: Array<{ sessionId: string; timestamp: number; data: any }> = []

  constructor(
    private db: DatabaseService | null,
    private playerDataRepo: PlayerDataRepository | null,
    private validateProximity: (player1Id: string, player2Id: string) => boolean,
    private getPlayerInventory: (playerId: string) => Promise<Array<{ itemId: string; quantity: number }>>,
    private validateItemOwnership: (playerId: string, itemId: string, quantity: number) => Promise<boolean>
  ) {}

  /**
   * Initiate a trade between two players
   */
  async initiateTrade(player1Id: string, player2Id: string): Promise<TradeSession | null> {
    // Check if players are in proximity
    if (!this.validateProximity(player1Id, player2Id)) {
      return null
    }

    // Check if either player is already in a trade
    if (this.playerTrades.has(player1Id) || this.playerTrades.has(player2Id)) {
      return null
    }

    const session: TradeSession = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      player1Id,
      player2Id,
      player1Offer: { items: [], credits: 0 },
      player2Offer: { items: [], credits: 0 },
      player1Confirmed: false,
      player2Confirmed: false,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    }

    this.tradeSessions.set(session.id, session)
    this.playerTrades.set(player1Id, session.id)
    this.playerTrades.set(player2Id, session.id)

    this.logTrade(session.id, 'initiated', { player1Id, player2Id })

    return session
  }

  /**
   * Add item to trade offer
   */
  async addItem(sessionId: string, playerId: string, itemId: string, quantity: number): Promise<boolean> {
    const session = this.tradeSessions.get(sessionId)
    if (!session || session.status !== 'pending') return false

    // Check if player is part of this trade
    if (session.player1Id !== playerId && session.player2Id !== playerId) {
      return false
    }

    // Validate item ownership
    if (!(await this.validateItemOwnership(playerId, itemId, quantity))) {
      return false
    }

    // Reset confirmation when offer changes
    if (session.player1Id === playerId) {
      session.player1Confirmed = false
      const offer = session.player1Offer
      const existingItem = offer.items.find(i => i.itemId === itemId)
      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        offer.items.push({ itemId, quantity })
      }
    } else {
      session.player2Confirmed = false
      const offer = session.player2Offer
      const existingItem = offer.items.find(i => i.itemId === itemId)
      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        offer.items.push({ itemId, quantity })
      }
    }

    this.logTrade(sessionId, 'item_added', { playerId, itemId, quantity })

    return true
  }

  /**
   * Remove item from trade offer
   */
  async removeItem(sessionId: string, playerId: string, itemId: string): Promise<boolean> {
    const session = this.tradeSessions.get(sessionId)
    if (!session || session.status !== 'pending') return false

    if (session.player1Id !== playerId && session.player2Id !== playerId) {
      return false
    }

    const offer = session.player1Id === playerId ? session.player1Offer : session.player2Offer
    const itemIndex = offer.items.findIndex(i => i.itemId === itemId)
    
    if (itemIndex === -1) return false

    offer.items.splice(itemIndex, 1)

    // Reset confirmation
    if (session.player1Id === playerId) {
      session.player1Confirmed = false
    } else {
      session.player2Confirmed = false
    }

    this.logTrade(sessionId, 'item_removed', { playerId, itemId })

    return true
  }

  /**
   * Set credits in trade offer
   */
  async setCredits(sessionId: string, playerId: string, credits: number): Promise<boolean> {
    const session = this.tradeSessions.get(sessionId)
    if (!session || session.status !== 'pending') return false

    if (session.player1Id !== playerId && session.player2Id !== playerId) {
      return false
    }

    // Validate player has enough credits
    if (this.playerDataRepo) {
      const playerData = await this.playerDataRepo.loadPlayerData(playerId)
      if (!playerData || playerData.credits < credits) {
        return false
      }
    }

    if (session.player1Id === playerId) {
      session.player1Offer.credits = credits
      session.player1Confirmed = false
    } else {
      session.player2Offer.credits = credits
      session.player2Confirmed = false
    }

    this.logTrade(sessionId, 'credits_set', { playerId, credits })

    return true
  }

  /**
   * Confirm trade (both players must confirm)
   */
  async confirmTrade(sessionId: string, playerId: string): Promise<boolean> {
    const session = this.tradeSessions.get(sessionId)
    if (!session || session.status !== 'pending') return false

    if (session.player1Id !== playerId) {
      session.player2Confirmed = true
    } else {
      session.player1Confirmed = true
    }

    // Check if both players confirmed
    if (session.player1Confirmed && session.player2Confirmed) {
      session.status = 'confirmed'
      
      // Execute trade atomically
      const success = await this.executeTrade(session)
      
      if (success) {
        session.status = 'completed'
        this.logTrade(sessionId, 'completed', {})
      } else {
        session.status = 'cancelled'
        this.logTrade(sessionId, 'failed', { reason: 'execution_failed' })
        return false
      }
    }

    return true
  }

  /**
   * Cancel trade
   */
  async cancelTrade(sessionId: string, playerId: string): Promise<void> {
    const session = this.tradeSessions.get(sessionId)
    if (!session) return

    if (session.player1Id !== playerId && session.player2Id !== playerId) {
      return
    }

    session.status = 'cancelled'
    this.playerTrades.delete(session.player1Id)
    this.playerTrades.delete(session.player2Id)

    this.logTrade(sessionId, 'cancelled', { playerId })

    // Cleanup after delay
    setTimeout(() => {
      this.tradeSessions.delete(sessionId)
    }, 60000)
  }

  /**
   * Execute trade atomically
   */
  private async executeTrade(session: TradeSession): Promise<boolean> {
    if (!this.playerDataRepo) {
      // In-memory mode - would need inventory system integration
      return true
    }

    try {
      // Validate both players still have items and credits
      const player1Data = await this.playerDataRepo.loadPlayerData(session.player1Id)
      const player2Data = await this.playerDataRepo.loadPlayerData(session.player2Id)

      if (!player1Data || !player2Data) return false

      // Validate player1 has items and credits
      for (const item of session.player1Offer.items) {
        const inventoryItem = player1Data.inventory.find(i => i.itemId === item.itemId)
        if (!inventoryItem || inventoryItem.quantity < item.quantity) {
          return false
        }
      }
      if (player1Data.credits < session.player1Offer.credits) return false

      // Validate player2 has items and credits
      for (const item of session.player2Offer.items) {
        const inventoryItem = player2Data.inventory.find(i => i.itemId === item.itemId)
        if (!inventoryItem || inventoryItem.quantity < item.quantity) {
          return false
        }
      }
      if (player2Data.credits < session.player2Offer.credits) return false

      // Execute trade - remove items and credits from both players
      for (const item of session.player1Offer.items) {
        const inventoryItem = player1Data.inventory.find(i => i.itemId === item.itemId)!
        inventoryItem.quantity -= item.quantity
        if (inventoryItem.quantity <= 0) {
          player1Data.inventory = player1Data.inventory.filter(i => i.itemId !== item.itemId)
        }
      }
      player1Data.credits -= session.player1Offer.credits

      for (const item of session.player2Offer.items) {
        const inventoryItem = player2Data.inventory.find(i => i.itemId === item.itemId)!
        inventoryItem.quantity -= item.quantity
        if (inventoryItem.quantity <= 0) {
          player2Data.inventory = player2Data.inventory.filter(i => i.itemId !== item.itemId)
        }
      }
      player2Data.credits -= session.player2Offer.credits

      // Add items and credits to both players
      for (const item of session.player2Offer.items) {
        const existingItem = player1Data.inventory.find(i => i.itemId === item.itemId)
        if (existingItem) {
          existingItem.quantity += item.quantity
        } else {
          player1Data.inventory.push({ itemId: item.itemId, quantity: item.quantity })
        }
      }
      player1Data.credits += session.player2Offer.credits

      for (const item of session.player1Offer.items) {
        const existingItem = player2Data.inventory.find(i => i.itemId === item.itemId)
        if (existingItem) {
          existingItem.quantity += item.quantity
        } else {
          player2Data.inventory.push({ itemId: item.itemId, quantity: item.quantity })
        }
      }
      player2Data.credits += session.player1Offer.credits

      // Save both players
      await this.playerDataRepo.savePlayerData(session.player1Id, player1Data)
      await this.playerDataRepo.savePlayerData(session.player2Id, player2Data)

      return true
    } catch (error) {
      console.error('Trade execution failed:', error)
      return false
    }
  }

  /**
   * Get trade session
   */
  getTradeSession(sessionId: string): TradeSession | null {
    return this.tradeSessions.get(sessionId) || null
  }

  /**
   * Get player's current trade session
   */
  getPlayerTradeSession(playerId: string): TradeSession | null {
    const sessionId = this.playerTrades.get(playerId)
    if (!sessionId) return null
    return this.tradeSessions.get(sessionId) || null
  }

  /**
   * Log trade event
   */
  private logTrade(sessionId: string, event: string, data: any): void {
    this.tradeLogs.push({
      sessionId,
      timestamp: Date.now(),
      data: { event, ...data }
    })

    // Keep only last 1000 logs
    if (this.tradeLogs.length > 1000) {
      this.tradeLogs.shift()
    }
  }

  /**
   * Get trade logs (for moderation/audit)
   */
  getTradeLogs(sessionId?: string): Array<{ sessionId: string; timestamp: number; data: any }> {
    if (sessionId) {
      return this.tradeLogs.filter(log => log.sessionId === sessionId)
    }
    return this.tradeLogs
  }
}

