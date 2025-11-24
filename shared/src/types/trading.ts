/**
 * Shared trading types used across client and server
 */

export interface TradeSession {
  id: string
  player1Id: string
  player2Id: string
  player1Offer: TradeOffer
  player2Offer: TradeOffer
  player1Confirmed: boolean
  player2Confirmed: boolean
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  createdAt: number
  expiresAt: number
}

export interface TradeOffer {
  items: Array<{ itemId: string; quantity: number }>
  credits: number
}

export interface TradeItem {
  itemId: string
  quantity: number
  name?: string
  icon?: string
}

