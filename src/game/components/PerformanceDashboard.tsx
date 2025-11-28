/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics display with graphs and additional metrics
 */

import { useEffect, useState, useRef } from 'react'
import { useGameStore } from '../store/useGameStore'
import { performanceProfiler } from '../utils/performanceProfiler'
import DraggableResizable from './DraggableResizable'
import { isMobileDevice } from '../utils/mobileOptimizations'

interface PerformanceMetrics {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  memory: number
  networkLatency?: number
  packetLoss?: number
  // Frame time breakdown
  renderingTime?: number
  physicsTime?: number
  networkTime?: number
  scriptTime?: number
  // GPU memory and asset cache
  gpuMemory?: number
  assetCacheSize?: number
}

interface MetricHistory {
  timestamp: number
  value: number
}

interface GraphData {
  fps: MetricHistory[]
  frameTime: MetricHistory[]
  memory: MetricHistory[]
  latency: MetricHistory[]
}

const MAX_HISTORY = 60 // 60 seconds of data at 1 sample/second
const GRAPH_HEIGHT = 60

export default function PerformanceDashboard() {
  const [isVisible, setIsVisible] = useState(false)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    memory: 0
  })
  const [history, setHistory] = useState<GraphData>({
    fps: [],
    frameTime: [],
    memory: [],
    latency: []
  })
  const [selectedTab, setSelectedTab] = useState<'overview' | 'graphs' | 'network' | 'rendering'>('overview')
  const isConnected = useGameStore(state => state.isConnected)
  const { player, enemies, otherPlayers, lootDrops, resourceNodes } = useGameStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isVisible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    intervalRef.current = setInterval(() => {
      const profilerStats = performanceProfiler.getMetrics()
      const memoryInfo = (performance as any).memory
      const networkLatency = useGameStore.getState().networkLatency
      const packetLoss = useGameStore.getState().packetLoss
      
      const newMetrics: PerformanceMetrics = {
        fps: profilerStats.fps,
        frameTime: profilerStats.frameTime,
        drawCalls: profilerStats.drawCalls,
        triangles: profilerStats.triangles,
        geometries: profilerStats.geometries,
        textures: profilerStats.textures,
        memory: memoryInfo ? Math.round(memoryInfo.usedJSHeapSize / 1048576) : 0,
        networkLatency,
        packetLoss,
        // Frame time breakdown
        renderingTime: profilerStats.renderingTime,
        physicsTime: profilerStats.physicsTime,
        networkTime: profilerStats.networkTime,
        scriptTime: profilerStats.scriptTime,
        // GPU memory and asset cache
        gpuMemory: profilerStats.gpuMemory,
        assetCacheSize: profilerStats.assetCacheSize
      }

      setMetrics(newMetrics)

      // Update history
      const now = Date.now()
      setHistory(prev => {
        const newHistory = { ...prev }
        
        // Add new data points
        newHistory.fps.push({ timestamp: now, value: newMetrics.fps })
        newHistory.frameTime.push({ timestamp: now, value: newMetrics.frameTime })
        newHistory.memory.push({ timestamp: now, value: newMetrics.memory })
        if (networkLatency !== undefined) {
          newHistory.latency.push({ timestamp: now, value: networkLatency })
        }

        // Trim to max history
        Object.keys(newHistory).forEach(key => {
          const arr = newHistory[key as keyof GraphData]
          if (arr.length > MAX_HISTORY) {
            arr.shift()
          }
        })

        return newHistory
      })
    }, 1000) // Update every second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isVisible])

  // Toggle with F3 key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  if (!isVisible) return null

  const isMobile = isMobileDevice()
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
  const dashboardWidth = isMobile ? Math.min(screenWidth * 0.95, screenWidth - 16) : 500
  const dashboardHeight = isMobile ? Math.min(screenHeight * 0.8, 600) : 600
  const dashboardPosition = isMobile
    ? { x: (screenWidth - dashboardWidth) / 2, y: (screenHeight - dashboardHeight) / 2 }
    : { x: screenWidth - dashboardWidth - 16, y: 16 }

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-green-400'
    if (fps >= 30) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getMemoryColor = (memory: number) => {
    if (memory < 200) return 'text-green-400'
    if (memory < 400) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getLatencyColor = (latency: number) => {
    if (latency < 50) return 'text-green-400'
    if (latency < 100) return 'text-yellow-400'
    return 'text-red-400'
  }

  // Render a simple line graph
  const renderGraph = (data: MetricHistory[], maxValue: number, color: string, label: string) => {
    if (data.length === 0) return <div className="text-gray-500 text-xs">No data</div>

    const points = data.map((point, index) => {
      const x = (index / (data.length - 1 || 1)) * 100
      const y = 100 - (point.value / maxValue) * 100
      return `${x},${y}`
    }).join(' ')

    return (
      <div className="relative">
        <svg width="100%" height={GRAPH_HEIGHT} className="border border-gray-700 rounded">
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
            className="drop-shadow-lg"
          />
          <text x="5" y="12" className="text-xs fill-gray-400" fontSize="10">{label}</text>
          <text x="5" y={GRAPH_HEIGHT - 5} className="text-xs fill-gray-500" fontSize="8">0</text>
          <text x="95%" y={GRAPH_HEIGHT - 5} className="text-xs fill-gray-500" fontSize="8" textAnchor="end">{maxValue}</text>
        </svg>
      </div>
    )
  }

  const fpsMax = Math.max(60, ...history.fps.map(h => h.value), 1)
  const frameTimeMax = Math.max(33, ...history.frameTime.map(h => h.value), 1)
  const memoryMax = Math.max(500, ...history.memory.map(h => h.value), 1)
  const latencyMax = Math.max(200, ...history.latency.map(h => h.value), 1)

  const dashboardHeader = (
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-cyan-400 font-bold text-sm">Performance Dashboard</h3>
      <button
        onClick={() => setIsVisible(false)}
        className="text-gray-400 hover:text-white text-lg"
      >
        ×
      </button>
    </div>
  )

  return (
    <DraggableResizable
      id="performance-dashboard"
      storageKey="performanceDashboard"
      defaultPosition={dashboardPosition}
      defaultSize={{ width: dashboardWidth, height: dashboardHeight }}
      minWidth={isMobile ? 300 : 400}
      minHeight={isMobile ? 400 : 500}
      maxWidth={isMobile ? screenWidth - 16 : 800}
      maxHeight={isMobile ? screenHeight - 16 : screenHeight - 32}
      resizable={true}
      draggable={true}
      className="pointer-events-auto z-50"
      header={dashboardHeader}
    >
      <div className="font-mono text-xs overflow-y-auto h-full">
        {/* Tabs */}
      <div className="flex gap-2 mb-3 border-b border-gray-700">
        {(['overview', 'graphs', 'network', 'rendering'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-3 py-1 text-xs capitalize ${
              selectedTab === tab
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-gray-400 text-xs mb-1">FPS</div>
              <div className={`text-lg font-bold ${getFPSColor(metrics.fps)}`}>
                {metrics.fps.toFixed(1)}
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-gray-400 text-xs mb-1">Frame Time</div>
              <div className="text-lg font-bold text-white">
                {metrics.frameTime.toFixed(2)}ms
              </div>
            </div>
            <div className="bg-gray-900/50 rounded p-2">
              <div className="text-gray-400 text-xs mb-1">Memory</div>
              <div className={`text-lg font-bold ${getMemoryColor(metrics.memory)}`}>
                {metrics.memory}MB
              </div>
            </div>
            {isConnected && metrics.networkLatency !== undefined && (
              <div className="bg-gray-900/50 rounded p-2">
                <div className="text-gray-400 text-xs mb-1">Latency</div>
                <div className={`text-lg font-bold ${getLatencyColor(metrics.networkLatency)}`}>
                  {metrics.networkLatency}ms
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 pt-2">
            <div className="text-gray-400 text-xs mb-2">Game Entities</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Enemies:</span>
                <span className="text-white">{enemies.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Players:</span>
                <span className="text-white">{otherPlayers.size + (player ? 1 : 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Loot Drops:</span>
                <span className="text-white">{lootDrops.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Resource Nodes:</span>
                <span className="text-white">{resourceNodes.size}</span>
              </div>
            </div>
          </div>

          {/* Frame Time Breakdown */}
          {(metrics.renderingTime !== undefined || metrics.physicsTime !== undefined || metrics.networkTime !== undefined || metrics.scriptTime !== undefined) && (
            <div className="border-t border-gray-700 pt-2">
              <div className="text-gray-400 text-xs mb-2">Frame Time Breakdown</div>
              <div className="space-y-1 text-xs">
                {metrics.renderingTime !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rendering:</span>
                    <span className="text-white">{metrics.renderingTime.toFixed(2)}ms</span>
                  </div>
                )}
                {metrics.physicsTime !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Physics:</span>
                    <span className="text-white">{metrics.physicsTime.toFixed(2)}ms</span>
                  </div>
                )}
                {metrics.networkTime !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Network:</span>
                    <span className="text-white">{metrics.networkTime.toFixed(2)}ms</span>
                  </div>
                )}
                {metrics.scriptTime !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Scripts:</span>
                    <span className="text-white">{metrics.scriptTime.toFixed(2)}ms</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Memory Details */}
          <div className="border-t border-gray-700 pt-2">
            <div className="text-gray-400 text-xs mb-2">Memory Details</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Heap:</span>
                <span className="text-white">{metrics.memory}MB</span>
              </div>
              {metrics.gpuMemory !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">GPU (est):</span>
                  <span className="text-white">{metrics.gpuMemory}MB</span>
                </div>
              )}
              {metrics.assetCacheSize !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Asset Cache:</span>
                  <span className="text-white">{metrics.assetCacheSize}MB</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Graphs Tab */}
      {selectedTab === 'graphs' && (
        <div className="space-y-4">
          <div>
            <div className="text-gray-400 text-xs mb-1">FPS History (60s)</div>
            {renderGraph(history.fps, fpsMax, '#22d3ee', 'FPS')}
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Frame Time History (60s)</div>
            {renderGraph(history.frameTime, frameTimeMax, '#34d399', 'ms')}
          </div>
          <div>
            <div className="text-gray-400 text-xs mb-1">Memory Usage History (60s)</div>
            {renderGraph(history.memory, memoryMax, '#fbbf24', 'MB')}
          </div>
          {isConnected && history.latency.length > 0 && (
            <div>
              <div className="text-gray-400 text-xs mb-1">Network Latency History (60s)</div>
              {renderGraph(history.latency, latencyMax, '#a78bfa', 'ms')}
            </div>
          )}
        </div>
      )}

      {/* Network Tab */}
      {selectedTab === 'network' && (
        <div className="space-y-2">
          {isConnected ? (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Connection Status:</span>
                <span className="text-green-400">Connected</span>
              </div>
              {metrics.networkLatency !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Latency:</span>
                    <span className={getLatencyColor(metrics.networkLatency)}>
                      {metrics.networkLatency}ms
                    </span>
                  </div>
                  {metrics.packetLoss !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Packet Loss:</span>
                      <span className={metrics.packetLoss > 5 ? 'text-red-400' : 'text-white'}>
                        {metrics.packetLoss.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </>
              )}
              {history.latency.length > 0 && (
                <div className="mt-3">
                  <div className="text-gray-400 text-xs mb-1">Latency Graph</div>
                  {renderGraph(history.latency, latencyMax, '#a78bfa', 'ms')}
                </div>
              )}
            </>
          ) : (
            <div className="text-yellow-400">Not Connected</div>
          )}
        </div>
      )}

      {/* Rendering Tab */}
      {selectedTab === 'rendering' && (
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Draw Calls:</span>
            <span className="text-white">{metrics.drawCalls}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Triangles:</span>
            <span className="text-white">{metrics.triangles.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Geometries:</span>
            <span className="text-white">{metrics.geometries}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Textures:</span>
            <span className="text-white">{metrics.textures}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Memory:</span>
            <span className={getMemoryColor(metrics.memory)}>{metrics.memory}MB</span>
          </div>
        </div>
      )}
      
        <div className="mt-3 pt-2 border-t border-gray-700">
          <p className="text-gray-500 text-xs">Press F3 to toggle</p>
        </div>
      </div>
    </DraggableResizable>
  )
}
