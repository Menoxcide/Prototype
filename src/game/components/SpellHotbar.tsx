/**
 * Enhanced Spell Hotbar with Cooldown Display
 */

import { useGameStore } from '../store/useGameStore'
import { getSpell } from '../data/spells'

export default function SpellHotbar() {
  const { player, equippedSpells, getRemainingCooldown, getCooldownProgress } = useGameStore()

  if (!player) return null

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 pointer-events-auto z-20">
      <div className="flex gap-2 bg-gray-900/90 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-2 neon-border">
        {equippedSpells.map((spellId, slot) => {
          const spell = spellId ? getSpell(spellId) : null
          const actionId = spellId ? `spell:${spellId}` : ''
          const cooldown = actionId ? getRemainingCooldown(actionId) : 0
          const cooldownPercent = spell && actionId ? (1 - getCooldownProgress(actionId, spell.cooldown)) * 100 : 0
          const canCast = cooldown === 0 && player.mana >= (spell?.manaCost || 0)

          return (
            <div
              key={slot}
              className="relative w-14 h-14 bg-gray-800 border-2 border-cyan-500 rounded-lg flex items-center justify-center overflow-hidden"
            >
              {spell ? (
                <>
                  <div className="text-2xl">{spell.icon}</div>
                  
                  {/* Cooldown overlay */}
                  {cooldown > 0 && (
                    <>
                      <div
                        className="absolute inset-0 bg-black/70 flex items-center justify-center"
                        style={{ opacity: 0.8 }}
                      >
                        <span className="text-xs text-white font-bold">
                          {(cooldown / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-cyan-500/50 transition-all"
                        style={{ height: `${cooldownPercent}%` }}
                      />
                    </>
                  )}
                  
                  {/* Mana cost indicator */}
                  {!canCast && cooldown === 0 && (
                    <div className="absolute top-1 right-1 text-xs text-red-400 font-bold">
                      {spell.manaCost}
                    </div>
                  )}
                  
                  {/* Slot number */}
                  <div className="absolute top-0 left-0 bg-cyan-500/80 text-white text-xs px-1 rounded-br">
                    {slot + 1}
                  </div>
                </>
              ) : (
                <div className="text-gray-600 text-xs">Empty</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

