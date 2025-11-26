/**
 * Victory/Defeat Screen
 * Shows victory or defeat screen after combat encounters
 */

import { useEffect, useState } from 'react'

interface VictoryDefeatScreenProps {
  type: 'victory' | 'defeat'
  onClose: () => void
  rewards?: {
    xp?: number
    credits?: number
    items?: Array<{ itemId: string; quantity: number }>
  }
}

export default function VictoryDefeatScreen({ type, onClose, rewards }: VictoryDefeatScreenProps) {
  const [show, setShow] = useState(true)
  const [animationComplete, setAnimationComplete] = useState(false)

  useEffect(() => {
    // Animate in
    setTimeout(() => setAnimationComplete(true), 100)
    
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setShow(false)
      setTimeout(onClose, 500) // Wait for fade out
    }, 5000)

    return () => clearTimeout(timer)
  }, [onClose])

  if (!show) return null

  const isVictory = type === 'victory'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        animationComplete ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      <div
        className={`text-center transform transition-all duration-500 ${
          animationComplete ? 'scale-100' : 'scale-75'
        }`}
      >
        {/* Title */}
        <div
          className={`text-8xl font-bold mb-4 ${
            isVictory ? 'text-green-400' : 'text-red-400'
          }`}
          style={{
            textShadow: `0 0 20px ${isVictory ? '#00ff00' : '#ff0000'}`,
            animation: 'pulse 2s infinite'
          }}
        >
          {isVictory ? 'VICTORY!' : 'DEFEAT'}
        </div>

        {/* Rewards (only for victory) */}
        {isVictory && rewards && (
          <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-6 mt-8">
            <h3 className="text-cyan-400 font-bold text-xl mb-4">Rewards</h3>
            <div className="space-y-2">
              {rewards.xp && (
                <div className="text-yellow-400">
                  +{rewards.xp} XP
                </div>
              )}
              {rewards.credits && (
                <div className="text-green-400">
                  +{rewards.credits} Credits
                </div>
              )}
              {rewards.items && rewards.items.length > 0 && (
                <div className="text-cyan-400">
                  Items: {rewards.items.map(i => `${i.itemId} x${i.quantity}`).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={() => {
            setShow(false)
            setTimeout(onClose, 500)
          }}
          className="mt-8 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-lg text-lg"
        >
          Continue
        </button>
      </div>
    </div>
  )
}

