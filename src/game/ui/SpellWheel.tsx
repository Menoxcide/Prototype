/**
 * Spell Wheel UI Component
 * 4-quadrant spell wheel for mobile touch controls
 * Organized by spell categories
 */

import { useMemo } from 'react'
import { useGameStore } from '../store/useGameStore'
import { SPELLS } from '../data/spells'
import { SPELL_CATEGORIES, SpellCategory } from '../data/magicTraditions'
import { getTradition } from '../data/magicTraditions'
import { calculateResponsiveScale, hapticFeedback } from '../utils/mobileOptimizations'
import { isMobile } from '../data/config'

interface SpellWheelProps {
  onSpellSelect: (spellId: string) => void
  selectedSpellId?: string
}

export default function SpellWheel({ onSpellSelect, selectedSpellId }: SpellWheelProps) {
  const { player } = useGameStore()
  const uiScale = calculateResponsiveScale()
  
  if (!isMobile() || !player) return null

  const tradition = player.tradition ? getTradition(player.tradition) : null

  // Organize spells by category into 4 quadrants
  const spellsByCategory = useMemo(() => {
    const categories: Record<SpellCategory, typeof SPELLS> = {
      combat: [],
      manipulation: [],
      detection: [],
      health: [],
      illusion: []
    }

    SPELLS.forEach(spell => {
      if (spell.category) {
        categories[spell.category].push(spell)
      }
    })

    return categories
  }, [])

  // Get spells for each quadrant (top-left, top-right, bottom-left, bottom-right)
  const quadrants = useMemo(() => {
    return {
      topLeft: spellsByCategory.combat.slice(0, 2),
      topRight: spellsByCategory.manipulation.slice(0, 2),
      bottomLeft: spellsByCategory.health.slice(0, 2),
      bottomRight: spellsByCategory.detection.slice(0, 2)
    }
  }, [spellsByCategory])

  const handleSpellClick = (spellId: string) => {
    hapticFeedback.medium()
    onSpellSelect(spellId)
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
      <div
        className="relative pointer-events-auto"
        style={{
          width: `${uiScale.buttonSize * 6}px`,
          height: `${uiScale.buttonSize * 6}px`
        }}
      >
        {/* 4 Quadrants */}
        <div className="absolute inset-0 grid grid-cols-2 gap-2">
          {/* Top Left - Combat */}
          <div className="flex flex-col gap-1">
            {quadrants.topLeft.map((spell) => (
              <button
                key={spell.id}
                onClick={() => handleSpellClick(spell.id)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  selectedSpellId === spell.id
                    ? 'border-cyan-500 bg-cyan-900/50'
                    : 'border-gray-700 bg-gray-800/80'
                }`}
                style={{
                  minWidth: `${uiScale.buttonSize}px`,
                  minHeight: `${uiScale.buttonSize}px`
                }}
              >
                <div className="text-center">
                  <div className="text-xl">{spell.icon}</div>
                  <div className="text-xs text-gray-300">{spell.name}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Top Right - Manipulation */}
          <div className="flex flex-col gap-1">
            {quadrants.topRight.map((spell) => (
              <button
                key={spell.id}
                onClick={() => handleSpellClick(spell.id)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  selectedSpellId === spell.id
                    ? 'border-cyan-500 bg-cyan-900/50'
                    : 'border-gray-700 bg-gray-800/80'
                }`}
                style={{
                  minWidth: `${uiScale.buttonSize}px`,
                  minHeight: `${uiScale.buttonSize}px`
                }}
              >
                <div className="text-center">
                  <div className="text-xl">{spell.icon}</div>
                  <div className="text-xs text-gray-300">{spell.name}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Bottom Left - Health */}
          <div className="flex flex-col gap-1">
            {quadrants.bottomLeft.map((spell) => (
              <button
                key={spell.id}
                onClick={() => handleSpellClick(spell.id)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  selectedSpellId === spell.id
                    ? 'border-cyan-500 bg-cyan-900/50'
                    : 'border-gray-700 bg-gray-800/80'
                }`}
                style={{
                  minWidth: `${uiScale.buttonSize}px`,
                  minHeight: `${uiScale.buttonSize}px`
                }}
              >
                <div className="text-center">
                  <div className="text-xl">{spell.icon}</div>
                  <div className="text-xs text-gray-300">{spell.name}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Bottom Right - Detection */}
          <div className="flex flex-col gap-1">
            {quadrants.bottomRight.map((spell) => (
              <button
                key={spell.id}
                onClick={() => handleSpellClick(spell.id)}
                className={`p-2 rounded-lg border-2 transition-all ${
                  selectedSpellId === spell.id
                    ? 'border-cyan-500 bg-cyan-900/50'
                    : 'border-gray-700 bg-gray-800/80'
                }`}
                style={{
                  minWidth: `${uiScale.buttonSize}px`,
                  minHeight: `${uiScale.buttonSize}px`
                }}
              >
                <div className="text-center">
                  <div className="text-xl">{spell.icon}</div>
                  <div className="text-xs text-gray-300">{spell.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Center - Tradition Info */}
        {tradition && (
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/90 border-2 border-cyan-500 rounded-full p-2 pointer-events-none"
            style={{
              width: `${uiScale.buttonSize * 1.5}px`,
              height: `${uiScale.buttonSize * 1.5}px`
            }}
          >
            <div className="text-center text-xs" style={{ color: tradition.color }}>
              <div className="text-lg">{tradition.icon}</div>
              <div>{tradition.name}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

