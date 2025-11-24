/**
 * Shadowrun Decking System
 * Quantum Dive decking for Voidborn deckers
 * ASDF deck attributes, ICE combat, network access levels
 */

export interface Cyberdeck {
  id: string
  name: string
  attack: number // ASDF: Attack
  sleaze: number // ASDF: Sleaze
  dataProcessing: number // ASDF: Data Processing
  firewall: number // ASDF: Firewall
  rating: number // Overall deck rating
}

export interface Cyberjack {
  id: string
  name: string
  rating: number
  bonus: {
    attack?: number
    sleaze?: number
    dataProcessing?: number
    firewall?: number
  }
}

export interface ICE {
  id: string
  name: string
  type: 'patrol' | 'black' | 'gray' | 'white'
  hostRating: number
  attack: number
  sleaze: number
  dataProcessing: number
  firewall: number
  damage: number
  matrixDamage: number
}

export interface DeckingAction {
  id: string
  name: string
  type: 'hack' | 'spoof' | 'mark' | 'control' | 'reboot'
  target: string // ICE ID or host ID
  timestamp: number
}

export interface NetworkHost {
  id: string
  name: string
  rating: number
  accessLevel: number // 1-6
  marks: Map<string, number> // Player ID -> mark count
  ice: ICE[]
}

/**
 * Calculate deck attribute from cyberdeck + cyberjack
 */
export function calculateDeckAttribute(
  deck: Cyberdeck,
  jack: Cyberjack | null,
  attribute: 'attack' | 'sleaze' | 'dataProcessing' | 'firewall'
): number {
  let base = deck[attribute]
  if (jack && jack.bonus[attribute]) {
    base += jack.bonus[attribute]!
  }
  return base
}

/**
 * Check if action succeeds based on deck vs ICE
 */
export function checkDeckingAction(
  deck: Cyberdeck,
  jack: Cyberjack | null,
  ice: ICE,
  action: 'hack' | 'spoof' | 'mark'
): { success: boolean; netHits: number } {
  let deckAttribute = 0
  let iceAttribute = 0

  switch (action) {
    case 'hack':
      deckAttribute = calculateDeckAttribute(deck, jack, 'attack')
      iceAttribute = ice.firewall
      break
    case 'spoof':
      deckAttribute = calculateDeckAttribute(deck, jack, 'sleaze')
      iceAttribute = ice.sleaze
      break
    case 'mark':
      deckAttribute = calculateDeckAttribute(deck, jack, 'dataProcessing')
      iceAttribute = ice.dataProcessing
      break
  }

  // Simple dice roll simulation (d6 system)
  const deckRoll = Math.floor(Math.random() * 6) + 1 + deckAttribute
  const iceRoll = Math.floor(Math.random() * 6) + 1 + iceAttribute

  const netHits = deckRoll - iceRoll
  return {
    success: netHits > 0,
    netHits
  }
}

/**
 * Get ICE type color
 */
export function getICEColor(type: ICE['type']): string {
  switch (type) {
    case 'patrol':
      return '#00ffff'
    case 'black':
      return '#ff0000'
    case 'gray':
      return '#888888'
    case 'white':
      return '#ffffff'
    default:
      return '#888888'
  }
}

