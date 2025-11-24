import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { Race } from '../types'
import { RACES, RACE_LIST } from '../data/races'
import { getAllTraditions, MagicTradition } from '../data/magicTraditions'

interface CharacterCreationProps {
  firebaseUid: string
  onComplete: () => void
}

export default function CharacterCreation({ firebaseUid, onComplete }: CharacterCreationProps) {
  const { setPlayer } = useGameStore()
  const [selectedRace, setSelectedRace] = useState<Race>('human')
  const [selectedTradition, setSelectedTradition] = useState<MagicTradition>('none')
  const [playerName, setPlayerName] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!playerName.trim()) {
      setError('Please enter a name')
      return
    }

    if (playerName.length > 20) {
      setError('Name must be 20 characters or less')
      return
    }

    if (isCreating) return

    setIsCreating(true)
    setError('')

    try {
      const raceData = RACES[selectedRace]
      const baseHealth = 100 + raceData.bonuses.health
      const baseMana = 100 + raceData.bonuses.mana

      // Use Firebase UID as player ID for persistence
      const player = {
        id: firebaseUid, // Use Firebase UID instead of timestamp
        name: playerName.trim(),
        race: selectedRace,
        level: 1,
        xp: 0,
        xpToNext: 100,
        credits: 100,
        position: { x: 0, y: 1, z: 0 }, // Y=1 to stand on ground (ground is at Y=0)
        rotation: 0,
        health: baseHealth,
        maxHealth: baseHealth,
        mana: baseMana,
        maxMana: baseMana,
        tradition: selectedTradition
      }

      setPlayer(player)
      onComplete()
    } catch (err: any) {
      setError(err.message || 'Failed to create character. Please try again.')
      console.error('Character creation error:', err)
    } finally {
      setIsCreating(false)
    }
  }

  const selectedRaceData = RACES[selectedRace]

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-md w-full neon-border">
        <h1 className="text-3xl font-bold text-cyan-400 neon-glow mb-6 text-center">
          NEX://VOID
        </h1>
        <h2 className="text-xl text-cyan-300 mb-4 text-center">Create Your Character</h2>

        {/* Name Input */}
        <div className="mb-6">
          <label htmlFor="character-name" className="block text-cyan-400 mb-2">Character Name</label>
          <input
            id="character-name"
            name="character-name"
            type="text"
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value)
              setError('')
            }}
            maxLength={20}
            className="w-full bg-gray-800 border border-cyan-500 rounded px-4 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500"
            placeholder="Enter your name"
          />
          {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
        </div>

        {/* Race Selection */}
        <div className="mb-6">
          <label className="block text-cyan-400 mb-3">Select Race</label>
          <div className="grid grid-cols-2 gap-3">
            {RACE_LIST.map((race) => (
              <button
                key={race.id}
                onClick={() => setSelectedRace(race.id)}
                className={`p-4 border-2 rounded-lg transition-all ${
                  selectedRace === race.id
                    ? `border-${race.color.replace('#', '')} bg-gray-800`
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
                style={{
                  borderColor: selectedRace === race.id ? race.color : undefined
                }}
              >
                <div
                  className="text-2xl font-bold mb-1"
                  style={{ color: race.color }}
                >
                  {race.name}
                </div>
                <div className="text-xs text-gray-400">{race.description}</div>
                <div className="mt-2 text-xs text-gray-500">
                  HP: +{race.bonuses.health} | MP: +{race.bonuses.mana} | Speed: {race.bonuses.speed}x
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Magic Tradition Selection */}
        <div className="mb-6">
          <label className="block text-cyan-400 mb-3">Select Magic Tradition (Optional)</label>
          <div className="grid grid-cols-2 gap-2">
            {getAllTraditions().map((tradition) => (
              <button
                key={tradition.id}
                onClick={() => setSelectedTradition(tradition.id)}
                className={`p-3 border-2 rounded-lg transition-all text-sm ${
                  selectedTradition === tradition.id
                    ? 'border-cyan-500 bg-gray-800'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{tradition.icon}</span>
                  <span className="font-bold" style={{ color: tradition.color }}>
                    {tradition.name}
                  </span>
                </div>
                <div className="text-xs text-gray-400">{tradition.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Race Info */}
        <div className="mb-6 p-4 bg-gray-800 rounded border border-cyan-500">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: selectedRaceData.color }}
            />
            <span className="font-bold text-cyan-300">{selectedRaceData.name}</span>
          </div>
          <p className="text-sm text-gray-400">{selectedRaceData.description}</p>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all neon-glow text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating Character...' : 'Enter the Void'}
        </button>
      </div>
    </div>
  )
}

