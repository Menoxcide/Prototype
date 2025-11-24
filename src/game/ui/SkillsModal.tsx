/**
 * SkillsModal - UI for viewing and upgrading player skills
 */

import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { SKILLS, getSkillsByCategory } from '../data/skills'
import type { SkillCategory } from '../../../shared/src/types/skills'

export default function SkillsModal() {
  const { 
    isSkillsOpen, 
    toggleSkills, 
    player, 
    playerSkills, 
    skillPoints,
    upgradeSkill,
    addSkillExperience
  } = useGameStore()
  
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory>('combat')

  if (!isSkillsOpen || !player) return null

  const categories: SkillCategory[] = ['combat', 'magic', 'crafting', 'survival', 'social']
  const categorySkills = getSkillsByCategory(selectedCategory)

  const getPlayerSkill = (skillId: string) => {
    return playerSkills.get(skillId) || {
      skillId,
      level: 0,
      experience: 0,
      experienceToNext: 100,
      unlocked: false
    }
  }

  const canUpgrade = (skill: typeof SKILLS[0]) => {
    const playerSkill = getPlayerSkill(skill.id)
    return (
      skillPoints > 0 &&
      playerSkill.level < skill.maxLevel &&
      playerSkill.unlocked &&
      checkRequirements(skill)
    )
  }

  const checkRequirements = (skill: typeof SKILLS[0]) => {
    // Check level requirement
    const levelReq = skill.requirements.find(r => r.type === 'level')
    if (levelReq && typeof levelReq.value === 'number' && player.level < levelReq.value) {
      return false
    }

    // Check skill requirements
    const skillReqs = skill.requirements.filter(r => r.type === 'skill')
    for (const req of skillReqs) {
      if (typeof req.value === 'string') {
        const reqSkill = getPlayerSkill(req.value)
        if (!reqSkill.unlocked || reqSkill.level < 1) {
          return false
        }
      }
    }

    return true
  }

  const getSkillEffect = (skill: typeof SKILLS[0], level: number) => {
    const effect = skill.effects
      .filter((e: { level: number }) => e.level <= level)
      .sort((a: { level: number }, b: { level: number }) => b.level - a.level)[0]
    return effect || skill.effects[0]
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-auto">
      <div 
        className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto neon-border pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-cyan-400 neon-glow">Skills</h2>
            <p className="text-gray-400 text-sm mt-1">
              Skill Points Available: <span className="text-cyan-400 font-bold">{skillPoints}</span>
            </p>
          </div>
          <button
            onClick={toggleSkills}
            className="text-gray-400 hover:text-cyan-400 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                selectedCategory === category
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-800 text-cyan-400 hover:bg-gray-700'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>

        {/* Skills List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorySkills.map(skill => {
            const playerSkill = getPlayerSkill(skill.id)
            const effect = getSkillEffect(skill, playerSkill.level)
            const canUpgradeSkill = canUpgrade(skill)
            const meetsRequirements = checkRequirements(skill)

            return (
              <div
                key={skill.id}
                className={`bg-gray-800 border-2 rounded-lg p-4 ${
                  playerSkill.unlocked
                    ? 'border-cyan-500'
                    : meetsRequirements
                    ? 'border-yellow-500 opacity-75'
                    : 'border-gray-700 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{skill.icon}</span>
                    <div>
                      <h3 className="text-cyan-300 font-bold text-lg">{skill.name}</h3>
                      <p className="text-gray-400 text-xs">{skill.type} • {skill.category}</p>
                    </div>
                  </div>
                  {playerSkill.unlocked && (
                    <div className="text-right">
                      <div className="text-cyan-400 font-bold">Lv. {playerSkill.level}/{skill.maxLevel}</div>
                    </div>
                  )}
                </div>

                <p className="text-gray-300 text-sm mb-3">{skill.description}</p>

                {playerSkill.unlocked ? (
                  <>
                    {/* Level Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Experience</span>
                        <span>{playerSkill.experience}/{playerSkill.experienceToNext}</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-cyan-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min((playerSkill.experience / playerSkill.experienceToNext) * 100, 100)}%` 
                          }}
                        />
                      </div>
                    </div>

                    {/* Current Effect */}
                    {effect && (
                      <div className="mb-3 p-2 bg-gray-700 rounded text-xs">
                        <div className="text-cyan-400 font-bold">Current Effect:</div>
                        <div className="text-gray-300">{effect.description}</div>
                      </div>
                    )}

                    {/* Upgrade Button */}
                    {canUpgradeSkill && (
                      <button
                        onClick={() => upgradeSkill(skill.id)}
                        className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded transition-all"
                      >
                        Upgrade (Cost: 1 Skill Point)
                      </button>
                    )}

                    {playerSkill.level >= skill.maxLevel && (
                      <div className="text-center text-yellow-400 font-bold text-sm py-2">
                        MAX LEVEL
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Requirements */}
                    <div className="mb-3">
                      <div className="text-xs text-gray-400 mb-1">Requirements:</div>
                      {skill.requirements.map((req: { type: string; value: string | number }, idx: number) => (
                        <div key={idx} className="text-xs text-gray-500">
                          {req.type === 'level' && typeof req.value === 'number' && (
                            <span className={player.level >= req.value ? 'text-green-400' : 'text-red-400'}>
                              Level {req.value} {player.level >= req.value ? '✓' : '✗'}
                            </span>
                          )}
                          {req.type === 'skill' && typeof req.value === 'string' && (
                            <span>
                              {SKILLS.find(s => s.id === req.value)?.name || req.value} - 
                              {getPlayerSkill(req.value).unlocked ? ' ✓' : ' ✗'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {meetsRequirements && (
                      <button
                        onClick={() => {
                          // Unlock skill by adding initial experience
                          addSkillExperience(skill.id, 1)
                        }}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition-all"
                      >
                        Unlock Skill
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

