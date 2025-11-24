/**
 * Rigger View UI Component
 * Swarm UI with radial multitouch for drone control
 */

import { useState } from 'react'
import { useGameStore } from '../store/useGameStore'
import { isMobile } from '../data/config'
import { calculateResponsiveScale, hapticFeedback } from '../utils/mobileOptimizations'
import { DroneSwarm, ControlTier } from '../systems/RiggerSystem'

interface RiggingViewProps {
  swarm: DroneSwarm
  onDroneControl: (droneId: string, action: string) => void
  onClose: () => void
}

export default function RiggingView({ swarm, onDroneControl, onClose }: RiggingViewProps) {
  const [selectedDrone, setSelectedDrone] = useState<string | null>(null)
  const uiScale = calculateResponsiveScale()

  if (!isMobile()) return null

  const handleDroneSelect = (droneId: string) => {
    hapticFeedback.light()
    setSelectedDrone(droneId)
  }

  const handleControlAction = (action: string) => {
    if (!selectedDrone) return
    hapticFeedback.medium()
    onDroneControl(selectedDrone, action)
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-4 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400">Drone Swarm: {swarm.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Drone list */}
        <div className="grid grid-cols-2 gap-2 mb-4 max-h-64 overflow-y-auto">
          {swarm.drones.map((drone) => (
            <button
              key={drone.id}
              onClick={() => handleDroneSelect(drone.id)}
              className={`p-3 border-2 rounded-lg transition-all ${
                selectedDrone === drone.id
                  ? 'border-cyan-500 bg-cyan-900/50'
                  : 'border-gray-700 bg-gray-800'
              }`}
            >
              <div className="text-center">
                <div className="text-xl mb-1">🤖</div>
                <div className="text-sm font-bold text-cyan-300">{drone.name}</div>
                <div className="text-xs text-gray-400">Mode: {drone.controlMode}</div>
                <div className="text-xs text-gray-400">
                  HP: {drone.health}/{drone.maxHealth}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Control actions */}
        {selectedDrone && (
          <div className="flex gap-2">
            <button
              onClick={() => handleControlAction('remote')}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
            >
              Remote Control
            </button>
            <button
              onClick={() => handleControlAction('jumpIn')}
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded"
            >
              Jump In
            </button>
            <button
              onClick={() => handleControlAction('autopilot')}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded"
            >
              Autopilot
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

