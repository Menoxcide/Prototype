/**
 * Housing Modal - UI for player housing system
 */

import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGameStore } from '../store/useGameStore'
import EnhancedModal from './components/EnhancedModal'
import { requestHousing, createHousing, placeFurniture, removeFurniture } from '../network/colyseus'
import HousingScene from '../components/HousingScene'

export default function HousingModal() {
  const { isHousingOpen, toggleHousing, player, housing, setHousing: _setHousing } = useGameStore()
  const [loading, setLoading] = useState(false)
  const [show3DView, setShow3DView] = useState(false)
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null)

  useEffect(() => {
    if (isHousingOpen && player) {
      // Request housing data from server
      setLoading(true)
      requestHousing()
      // Wait a bit for response
      setTimeout(() => {
        setLoading(false)
      }, 1000)
    }
  }, [isHousingOpen, player])

  // Listen for housing data updates
  useEffect(() => {
    if (housing) {
      setLoading(false)
    }
  }, [housing])

  if (!isHousingOpen || !player) return null

  return (
    <EnhancedModal
      isOpen={isHousingOpen}
      onClose={toggleHousing}
      title="Player Housing"
      size="lg"
    >
      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-400">Loading housing...</div>
        </div>
      ) : housing ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="bg-gray-800 rounded-lg p-4 flex-1">
              <h3 className="text-cyan-400 font-bold mb-2">Housing Level {housing.level}</h3>
              <p className="text-gray-300 text-sm">
                Size: {housing.size.width} × {housing.size.depth} × {housing.size.height}
              </p>
            </div>
            <button
              onClick={() => setShow3DView(!show3DView)}
              className="ml-4 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded"
            >
              {show3DView ? '2D View' : '3D View'}
            </button>
          </div>

          {show3DView ? (
            <div className="bg-gray-900 rounded-lg p-4" style={{ height: '400px', position: 'relative' }}>
              <Canvas camera={{ position: [10, 10, 10], fov: 50 }}>
                <HousingScene
                  housing={housing}
                  onFurnitureClick={(furniture) => {
                    setSelectedFurniture(furniture.id)
                  }}
                />
              </Canvas>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-cyan-400 font-bold mb-2">Furniture ({housing.furniture.length})</h3>
                {housing.furniture.length === 0 ? (
                  <div className="text-gray-400 text-sm">No furniture placed yet</div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {housing.furniture.map((item: any) => (
                      <div
                        key={item.id}
                        className={`bg-gray-800 rounded p-2 cursor-pointer border-2 ${
                          selectedFurniture === item.id ? 'border-cyan-500' : 'border-transparent'
                        }`}
                        onClick={() => setSelectedFurniture(item.id)}
                      >
                        <div className="text-sm text-cyan-300">{item.furnitureId || item.id}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {item.position.x.toFixed(1)}, {item.position.y.toFixed(1)}, {item.position.z.toFixed(1)}
                        </div>
                        {selectedFurniture === item.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFurniture(item.id)
                              setSelectedFurniture(null)
                            }}
                            className="mt-2 w-full bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-cyan-400 font-bold mb-2">Place Furniture</h3>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {['chair', 'table', 'bed', 'chest', 'decoration', 'lamp', 'bookshelf', 'plant'].map((furnitureId) => (
                    <button
                      key={furnitureId}
                      onClick={() => {
                        // Place furniture at center of room
                        placeFurniture(furnitureId, {
                          x: 0,
                          y: 0,
                          z: 0
                        }, 0)
                      }}
                      className="bg-gray-800 hover:bg-gray-700 text-cyan-300 font-bold py-2 px-4 rounded capitalize"
                    >
                      {furnitureId}
                    </button>
                  ))}
                </div>
                <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-400">
                  <p>Click "Place" buttons to add furniture. Click on placed furniture to remove it.</p>
                </div>
              </div>

              <div>
                <h3 className="text-cyan-400 font-bold mb-2">Upgrades</h3>
                <div className="space-y-2">
                  <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-cyan-300 font-bold">Expand Size</div>
                      <div className="text-xs text-gray-400">Increase housing dimensions</div>
                    </div>
                    <button className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1 rounded" disabled>
                      Level {housing.level + 1} Required
                    </button>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-cyan-300 font-bold">Add Rooms</div>
                      <div className="text-xs text-gray-400">Unlock additional rooms</div>
                    </div>
                    <button className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1 rounded" disabled>
                      Level {housing.level + 2} Required
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                // Enter housing - would teleport player to housing instance
                console.log('Enter housing')
              }}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded"
            >
              Enter Housing
            </button>
            <button
              onClick={toggleHousing}
              className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">No housing found</div>
          <button
            onClick={() => {
              createHousing()
              setLoading(true)
            }}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded"
          >
            Create Housing
          </button>
        </div>
      )}
    </EnhancedModal>
  )
}

