import { Race } from '../types'

export interface RaceData {
  id: Race
  name: string
  description: string
  color: string
  glowColor: string
  bonuses: {
    health: number
    mana: number
    speed: number
  }
}

export const RACES: Record<Race, RaceData> = {
  human: {
    id: 'human',
    name: 'Human',
    description: 'Adaptable survivors of the old world, enhanced with cybernetic implants.',
    color: '#00ffff',
    glowColor: '#00ffff',
    bonuses: {
      health: 100,
      mana: 100,
      speed: 1.0
    }
  },
  cyborg: {
    id: 'cyborg',
    name: 'Cyborg',
    description: 'Half-human, half-machine warriors with enhanced combat capabilities.',
    color: '#ff00ff',
    glowColor: '#ff00ff',
    bonuses: {
      health: 150,
      mana: 80,
      speed: 1.1
    }
  },
  android: {
    id: 'android',
    name: 'Android',
    description: 'Fully synthetic beings with superior processing and energy efficiency.',
    color: '#0099ff',
    glowColor: '#0099ff',
    bonuses: {
      health: 120,
      mana: 150,
      speed: 0.9
    }
  },
  voidborn: {
    id: 'voidborn',
    name: 'Voidborn',
    description: 'Mysterious entities born from the quantum void, masters of dark energy.',
    color: '#9d00ff',
    glowColor: '#9d00ff',
    bonuses: {
      health: 90,
      mana: 200,
      speed: 1.2
    }
  },
  quantum: {
    id: 'quantum',
    name: 'Quantum',
    description: 'Beings of pure quantum energy, able to phase through reality itself.',
    color: '#00ff00',
    glowColor: '#00ff00',
    bonuses: {
      health: 110,
      mana: 180,
      speed: 1.15
    }
  }
}

export const RACE_LIST = Object.values(RACES)

