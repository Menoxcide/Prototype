/**
 * Tutorial Modal - Interactive tutorial system for new players
 */

import { useState, useEffect } from 'react'
import { useGameStore } from '../store/useGameStore'
import EnhancedModal from './components/EnhancedModal'

interface TutorialStep {
  id: string
  title: string
  content: string
  image?: string
  action?: () => void
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to NEX://VOID',
    content: 'Welcome to the cyberpunk MMO! This tutorial will help you get started. You can skip this at any time.'
  },
  {
    id: 'movement',
    title: 'Movement & Controls',
    content: 'Use WASD or arrow keys to move (desktop) or the virtual joystick (mobile). Move your mouse to look around. Press Space to jump.'
  },
  {
    id: 'combat',
    title: 'Combat System',
    content: 'Click or tap to cast spells. Each spell costs mana and has a cooldown. Defeat enemies to gain XP and credits!'
  },
  {
    id: 'inventory',
    title: 'Inventory & Items',
    content: 'Press I or tap the inventory button to open your inventory. Collect items from defeated enemies and quests.'
  },
  {
    id: 'crafting',
    title: 'Crafting System',
    content: 'Use the crafting menu to create items from resources. Recipes unlock as you level up!'
  },
  {
    id: 'quests',
    title: 'Quest System',
    content: 'Complete quests to earn rewards. Check your quest log regularly for daily and weekly quests!'
  },
  {
    id: 'multiplayer',
    title: 'Multiplayer Features',
    content: 'You\'re playing with other players! Join a guild, trade items, and explore the world together.'
  }
]

export default function TutorialModal() {
  const { player, isTutorialOpen, toggleTutorial, hasCompletedTutorial } = useGameStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [skipped, setSkipped] = useState(false)

  // Check if tutorial should be shown
  useEffect(() => {
    if (player && !hasCompletedTutorial && !isTutorialOpen && !skipped) {
      // Auto-open tutorial for new players
      useGameStore.getState().toggleTutorial()
    }
  }, [player, hasCompletedTutorial, isTutorialOpen, skipped])

  if (!isTutorialOpen || !player) return null

  const currentTutorial = TUTORIAL_STEPS[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setSkipped(true)
    useGameStore.getState().setHasCompletedTutorial(true)
    toggleTutorial()
  }

  const handleComplete = () => {
    useGameStore.getState().setHasCompletedTutorial(true)
    toggleTutorial()
  }

  return (
    <EnhancedModal
      isOpen={isTutorialOpen}
      onClose={handleSkip}
      title={`Tutorial: ${currentTutorial.title}`}
      size="md"
    >
      <div className="flex flex-col h-full">
        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex gap-1">
            {TUTORIAL_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1 flex-1 rounded ${
                  index <= currentStep ? 'bg-cyan-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-1 text-center">
            Step {currentStep + 1} of {TUTORIAL_STEPS.length}
          </div>
        </div>

        {/* Tutorial content */}
        <div className="flex-1 mb-4">
          <div className="bg-gray-800 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
            <p className="text-gray-300 text-lg leading-relaxed">
              {currentTutorial.content}
            </p>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSkip}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
          >
            Skip Tutorial
          </button>
          {!isFirstStep && (
            <button
              onClick={handlePrevious}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded"
          >
            {isLastStep ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </EnhancedModal>
  )
}

