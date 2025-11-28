/**
 * Character Selection Screen
 * Allows users to select from their existing characters or create a new one
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import { listCharacters, getCharacterCount, loadCharacter, CharacterSummary } from '../utils/characterApi'
import { Race } from '../types'
import { RACES } from '../data/races'
import { useTranslation } from '../hooks/useTranslation'

interface CharacterSelectionProps {
  firebaseUid: string
  onSelectCharacter: (characterId: string) => void
  onCreateNew: () => void
}

export default function CharacterSelection({ firebaseUid, onSelectCharacter, onCreateNew }: CharacterSelectionProps) {
  const { t } = useTranslation()
  const [characters, setCharacters] = useState<CharacterSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [characterCount, setCharacterCount] = useState<{ count: number; max: number; canCreateMore: boolean } | null>(null)

  useEffect(() => {
    loadCharacters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUid])

  const loadCharacters = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [charList, countInfo] = await Promise.all([
        listCharacters(),
        getCharacterCount()
      ])
      
      setCharacters(charList)
      setCharacterCount({
        count: countInfo.count,
        max: countInfo.maxCharacters,
        canCreateMore: countInfo.canCreateMore
      })
    } catch (err: any) {
      console.error('Failed to load characters:', err)
      // Connection refused means server isn't running - that's okay, we'll show create new
      if (err.message?.includes('CONNECTION_REFUSED') || err.message?.includes('Failed to fetch')) {
        setError(t('characterSelection.serverUnavailableMessage'))
        setCharacters([])
        setCharacterCount({
          count: 0,
          max: 5,
          canCreateMore: true
        })
      } else {
        setError(err.message || t('characterSelection.failedToLoadCharacters'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectCharacter = async (character: CharacterSummary) => {
    try {
      // Load full character data from server
      const fullCharacter = await loadCharacter(character.id)
      
      // Set a minimal player object - server will provide full data when joining
      const { setPlayer } = useGameStore.getState()
      
      setPlayer({
        id: fullCharacter.id,
        name: fullCharacter.name,
        race: fullCharacter.race as Race,
        level: fullCharacter.level,
        xp: 0, // Will be loaded from server
        xpToNext: 100,
        credits: 0, // Will be loaded from server
        position: { x: 0, y: 1.1, z: 0 },
        rotation: 0,
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100
      })
      
      onSelectCharacter(character.id)
    } catch (error: any) {
      console.error('Failed to load character:', error)
      setError(error.message || t('characterSelection.failedToLoadCharacter'))
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-orange-500">{t('characterSelection.loadingCharacters')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-900 border-2 rounded-lg p-6 max-w-4xl w-full neon-border" style={{ borderColor: '#ff6b35' }}>
        <h1 className="text-3xl font-bold text-orange-500 neon-glow mb-2 text-center" style={{ color: '#ff6b35' }}>
          {t('app.title')}
        </h1>
        <h2 className="text-xl mb-6 text-center" style={{ color: '#ff8c42' }}>{t('characterSelection.title')}</h2>

        {error && (
          <div className="mb-4 p-3 bg-yellow-900 border border-yellow-500 rounded text-yellow-200">
            <p className="font-bold mb-1">{t('characterSelection.serverUnavailable')}</p>
            <p className="text-sm">{error}</p>
            <p className="text-xs mt-2 text-yellow-300">
              {t('characterSelection.serverUnavailableSubtext')}
            </p>
            {import.meta.env.DEV && (
              <p className="text-xs mt-2 text-yellow-400 font-mono">
                💡 To start the server: cd server && npm run dev
              </p>
            )}
          </div>
        )}

        {characterCount && !error && (
          <div className="mb-4 text-center text-gray-400 text-sm">
            {t('characterSelection.characters')}: {characterCount.count} / {characterCount.max}
          </div>
        )}

        {/* Character List */}
        {characters.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {characters.map((character) => {
              const raceData = RACES[character.race as Race]
              return (
                <button
                  key={character.id}
                  onClick={() => handleSelectCharacter(character)}
                  className="p-4 border-2 rounded-lg transition-all hover:scale-105 text-left"
                  style={{
                    borderColor: raceData?.color || '#ff6b35',
                    backgroundColor: '#1a1a1a'
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold mb-1" style={{ color: raceData?.color || '#ff8c42' }}>
                        {character.name}
                      </h3>
                      <p className="text-sm text-gray-400 capitalize">{character.race}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-orange-500 font-bold">{t('characterSelection.levelShort')}{character.level}</div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    <div>{t('characterSelection.lastPlayed')} {formatDate(character.lastLogin)}</div>
                    <div>{t('characterSelection.created')} {formatDate(character.createdAt)}</div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="mb-6 text-center text-gray-400 py-8">
            <p>{t('characterSelection.noCharactersFound')}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          {characters.length > 0 && (
            <button
              onClick={loadCharacters}
              className="px-6 py-2 border-2 rounded-lg transition-all"
              style={{ borderColor: '#ff6b35', color: '#ff8c42' }}
            >
              {t('characterSelection.refresh')}
            </button>
          )}
          
          {(!characterCount || characterCount.canCreateMore) && (
            <button
              onClick={onCreateNew}
              className="px-6 py-3 border-2 rounded-lg font-bold transition-all neon-glow hover:scale-105"
              style={{ 
                borderColor: '#ff6b35',
                backgroundColor: '#ff6b35',
                color: '#ffffff'
              }}
            >
              {t('characterSelection.createNewCharacter')}
            </button>
          )}
          
          {characterCount && !characterCount.canCreateMore && !error && (
            <div className="px-6 py-3 border-2 rounded-lg text-center"
              style={{ borderColor: '#666', color: '#999' }}
            >
              {t('characterSelection.characterLimitReached', { max: characterCount.max })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

