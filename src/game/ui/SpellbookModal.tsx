import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { SPELLS } from '../data/spells'

export default function SpellbookModal() {
  const {
    isSpellbookOpen,
    toggleSpellbook,
    equippedSpells,
    setEquippedSpell
  } = useGameStore()

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  if (!isSpellbookOpen) return null

  const handleSpellClick = (spellId: string) => {
    if (selectedSlot !== null) {
      // Assign to selected slot
      setEquippedSpell(selectedSlot, spellId)
      setSelectedSlot(null) // Clear selection after assigning
    } else {
      // Fallback: Find first empty slot or replace last slot
      const emptySlot = equippedSpells.findIndex(s => !s)
      const slot = emptySlot >= 0 ? emptySlot : equippedSpells.length - 1
      setEquippedSpell(slot, spellId)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto neon-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400 neon-glow">Spellbook</h2>
          <button
            onClick={toggleSpellbook}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        {selectedSlot !== null && (
          <div className="mb-3 p-2 bg-cyan-500/20 border border-cyan-500 rounded text-cyan-300 text-sm">
            Selected: Slot {selectedSlot + 1} - Click a spell to assign it
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Equipped Spells */}
          <div>
            <h3 className="text-lg font-bold text-cyan-300 mb-3">Hotbar</h3>
            <div className="space-y-2">
              {equippedSpells.map((spellId, slot) => {
                const spell = SPELLS.find(s => s.id === spellId)
                const isSelected = selectedSlot === slot

                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full text-left bg-gray-800 border-2 rounded-lg p-3 transition-all ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-500/20 shadow-lg shadow-cyan-500/50'
                        : 'border-cyan-500 hover:border-cyan-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{spell?.icon || '❓'}</span>
                      <div className="flex-1">
                        <div className="font-bold text-cyan-300">
                          Slot {slot + 1}: {spell?.name || 'Empty'}
                        </div>
                        {spell && (
                          <div className="text-xs text-gray-400">
                            {spell.manaCost} MP | {spell.damage} DMG
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-xs text-cyan-400 mt-1">Click a spell below to assign</div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Available Spells */}
          <div>
            <h3 className="text-lg font-bold text-cyan-300 mb-3">Available Spells</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {SPELLS.map(spell => (
                <button
                  key={spell.id}
                  onClick={() => handleSpellClick(spell.id)}
                  className="w-full text-left bg-gray-800 border border-cyan-500 rounded-lg p-3 hover:border-cyan-400 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{spell.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-cyan-300">{spell.name}</div>
                      <div className="text-xs text-gray-400">{spell.description}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>MP: {spell.manaCost}</span>
                    <span>DMG: {spell.damage}</span>
                    <span>CD: {(spell.cooldown / 1000).toFixed(1)}s</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

