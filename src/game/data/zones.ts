import { Zone } from '../types'
import { BIOMES } from './biomes'

// Cyberpunk zones (original)
const CYBERPUNK_ZONES: Zone[] = [
  {
    id: 'nexus_city',
    name: 'Nexus City',
    description: 'The central hub of the cyberpunk world, where all paths converge.',
    levelRange: [1, 10],
    enemies: ['cyber_drone', 'security_bot', 'street_thug'],
    resources: ['cyber_scrap', 'neural_interface'],
    color: '#00ffff'
  },
  {
    id: 'quantum_peak',
    name: 'Quantum Peak',
    description: 'A high-tech facility where quantum experiments went wrong.',
    levelRange: [10, 20],
    enemies: ['quantum_ghost', 'energy_wraith', 'phase_shifter'],
    resources: ['quantum_crystal', 'quantum_circuit', 'plasma_core'],
    color: '#0099ff'
  },
  {
    id: 'void_depths',
    name: 'Void Depths',
    description: 'A dark dimension where reality breaks down.',
    levelRange: [20, 30],
    enemies: ['void_walker', 'shadow_beast', 'dark_entity'],
    resources: ['void_essence', 'quantum_crystal'],
    color: '#9d00ff'
  },
  {
    id: 'neon_district',
    name: 'Neon District',
    description: 'A vibrant but dangerous area filled with neon lights and crime.',
    levelRange: [5, 15],
    enemies: ['cyber_gang', 'hacker_drone', 'street_warrior'],
    resources: ['cyber_scrap', 'neural_interface', 'plasma_core'],
    color: '#ff00ff'
  },
  {
    id: 'data_stream',
    name: 'Data Stream',
    description: 'A digital realm where information flows like water.',
    levelRange: [15, 25],
    enemies: ['data_worm', 'code_virus', 'firewall_guardian'],
    resources: ['quantum_circuit', 'neural_interface', 'quantum_crystal'],
    color: '#00ff00'
  }
]

// Convert biomes to zones for portal system
const BIOME_ZONES: Zone[] = BIOMES.map(biome => ({
  id: biome.id,
  name: biome.name,
  description: biome.description,
  levelRange: biome.levelRange,
  enemies: biome.monsters,
  resources: biome.resources,
  color: biome.color
}))

// Combined zones list
export const ZONES: Zone[] = [...CYBERPUNK_ZONES, ...BIOME_ZONES]

export const ZONE_MAP = new Map(ZONES.map(zone => [zone.id, zone]))

export function getZone(id: string): Zone | undefined {
  return ZONE_MAP.get(id)
}

export function getZoneByLevel(level: number): Zone | undefined {
  return ZONES.find(zone => level >= zone.levelRange[0] && level <= zone.levelRange[1])
}

