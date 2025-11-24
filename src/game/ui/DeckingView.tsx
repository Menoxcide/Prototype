/**
 * Decking View UI Component
 * Low-poly R3F grid with LOD billboards for nodes/ICE
 * Touch-based decking controls
 */

import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'
import { isMobile } from '../data/config'
import { calculateResponsiveScale, hapticFeedback } from '../utils/mobileOptimizations'
import { NetworkHost, ICE, getICEColor } from '../systems/DeckingSystem'

interface DeckingViewProps {
  host: NetworkHost
  onAction: (action: string, target: string) => void
  onClose: () => void
}

export default function DeckingView({ host, onAction, onClose }: DeckingViewProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const uiScale = calculateResponsiveScale()

  if (!isMobile()) return null

  const handleNodeClick = (nodeId: string) => {
    hapticFeedback.light()
    setSelectedNode(nodeId)
  }

  const handleAction = (action: string, target: string) => {
    hapticFeedback.medium()
    onAction(action, target)
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <div className="bg-gray-900 border-2 border-cyan-500 rounded-lg p-4 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-cyan-400">{host.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ×
          </button>
        </div>

        {/* Simple grid view for mobile */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {host.ice.map((ice) => (
            <button
              key={ice.id}
              onClick={() => handleNodeClick(ice.id)}
              className={`p-4 border-2 rounded-lg transition-all ${
                selectedNode === ice.id
                  ? 'border-cyan-500 bg-cyan-900/50'
                  : 'border-gray-700 bg-gray-800'
              }`}
              style={{
                borderColor: selectedNode === ice.id ? getICEColor(ice.type) : undefined
              }}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{ice.type === 'black' ? '🛡️' : '🔒'}</div>
                <div className="text-sm font-bold" style={{ color: getICEColor(ice.type) }}>
                  {ice.name}
                </div>
                <div className="text-xs text-gray-400">Rating: {ice.hostRating}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Action buttons */}
        {selectedNode && (
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('hack', selectedNode)}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded"
            >
              Hack
            </button>
            <button
              onClick={() => handleAction('spoof', selectedNode)}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 px-4 rounded"
            >
              Spoof
            </button>
            <button
              onClick={() => handleAction('mark', selectedNode)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded"
            >
              Mark
            </button>
          </div>
        )}

        {/* Access Level Display */}
        <div className="mt-4 p-2 bg-gray-800 rounded">
          <div className="text-sm text-gray-400">Access Level: {host.accessLevel}/6</div>
          <div className="text-sm text-gray-400">Marks: {host.marks.size}</div>
        </div>
      </div>
    </div>
  )
}

