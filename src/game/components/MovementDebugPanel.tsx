/**
 * Movement Debug Panel
 * Displays performance metrics to help diagnose movement stuttering issues
 * Split into tracker (inside Canvas) and display (outside Canvas)
 */

import { useEffect, useState } from 'react'
import { getAllFeatureFlags, setFeatureFlag, type FeatureFlag } from '../utils/featureFlags'
import { movementMetrics } from './MovementDebugTracker'
import { useGameStore } from '../store/useGameStore'

export default function MovementDebugPanel() {
  const [visible, setVisible] = useState(import.meta.env.DEV) // Show by default in dev mode
  const [metrics, setMetrics] = useState(movementMetrics)
  const [refreshTrigger, setRefreshTrigger] = useState(0) // Force re-render when flags change
  const player = useGameStore((state) => state.player)
  
  // Update metrics from global store
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics({ ...movementMetrics })
    }, 100) // Update every 100ms for smooth display
    
    return () => clearInterval(interval)
  }, [])
  
  // Toggle visibility with 'M' key in dev mode
  useEffect(() => {
    if (!import.meta.env.DEV) return
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'm' || e.key === 'M') {
        setVisible(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])
  
  if (!visible) return null
  
  // Re-read feature flags when refresh trigger changes (forces update after toggle)
  const featureFlags = getAllFeatureFlags()
  const isStuttering = metrics.frameTime > 20 // Frame time > 20ms indicates potential stuttering
  
  // Trigger re-render when feature flags might have changed
  useEffect(() => {
    // This effect will re-run when refreshTrigger changes
  }, [refreshTrigger])
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '12px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 99998,
        minWidth: '250px',
        border: isStuttering ? '2px solid #ff6666' : '1px solid #333',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ marginBottom: '8px', fontWeight: 'bold', borderBottom: '1px solid #444', paddingBottom: '4px' }}>
        Movement Debug Panel (Press M to toggle)
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#aaa' }}>FPS:</span>{' '}
        <span style={{ color: metrics.fps < 30 ? '#ff6666' : metrics.fps < 60 ? '#ffaa00' : '#66ff66' }}>
          {metrics.fps}
        </span>
      </div>
      
      <div style={{ marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
        <span style={{ color: '#aaa' }}>Frame Time:</span>{' '}
        <span style={{ color: isStuttering ? '#ff6666' : '#66ff66' }}>
          {metrics.frameTime.toFixed(2)}ms
        </span>
        {isStuttering && (
          <>
            <span style={{ color: '#ff8c00', marginLeft: '8px', fontSize: '14px' }}>⚠️</span>
            <span style={{ color: '#ff6666', marginLeft: '4px' }}>stuttering</span>
          </>
        )}
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#aaa' }}>Position Updates/sec:</span>{' '}
        <span style={{ color: '#fff' }}>{metrics.positionUpdates}</span>
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <span style={{ color: '#aaa' }}>Reconciliation Events:</span>{' '}
        <span style={{ color: metrics.reconciliationEvents > 10 ? '#ff6666' : '#fff' }}>
          {metrics.reconciliationEvents}
        </span>
      </div>
      
      {/* Stamina display */}
      {player && 'stamina' in player && (
        <div style={{ marginBottom: '4px' }}>
          <span style={{ color: '#aaa' }}>Stamina:</span>{' '}
          <span style={{ color: '#ffaa00' }}>
            {typeof player.stamina === 'number' ? Math.round(player.stamina) : 'N/A'}/
            {typeof player.maxStamina === 'number' ? Math.round(player.maxStamina) : '100'}
          </span>
        </div>
      )}
      
      <div style={{ marginBottom: '8px', borderTop: '1px solid #444', paddingTop: '8px', marginTop: '8px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Feature Flags:</div>
        {Object.entries(featureFlags).map(([flag, enabled]) => (
          <div 
            key={flag} 
            style={{ 
              marginBottom: '2px', 
              fontSize: '11px',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '3px',
              transition: 'background 0.2s'
            }}
            onClick={() => {
              setFeatureFlag(flag as FeatureFlag, !enabled)
              setRefreshTrigger(prev => prev + 1) // Force re-render
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
            title={`Click to toggle ${flag}`}
          >
            <span style={{ color: enabled ? '#66ff66' : '#ff6666' }}>
              {enabled ? '✓' : '✗'}
            </span>{' '}
            <span style={{ color: '#aaa' }}>{flag}:</span>{' '}
            <span style={{ color: '#fff' }}>{enabled ? 'ON' : 'OFF'}</span>
          </div>
        ))}
      </div>
      
      {/* Quick performance actions */}
      {isStuttering && (
        <div style={{ 
          marginBottom: '8px', 
          borderTop: '1px solid #444', 
          paddingTop: '8px', 
          marginTop: '8px' 
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '11px' }}>Quick Actions:</div>
          <button
            onClick={() => {
              setFeatureFlag('postProcessingEnabled', false)
              setFeatureFlag('shadowsEnabled', false)
              setRefreshTrigger(prev => prev + 1) // Force re-render
            }}
            style={{
              background: 'rgba(255, 102, 102, 0.3)',
              border: '1px solid #ff6666',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              marginRight: '4px',
              marginBottom: '4px'
            }}
            title="Disable expensive rendering features"
          >
            Disable Heavy Features
          </button>
          <button
            onClick={() => {
              const flags = getAllFeatureFlags()
              Object.keys(flags).forEach(flag => {
                setFeatureFlag(flag as FeatureFlag, false)
              })
              setRefreshTrigger(prev => prev + 1) // Force re-render
            }}
            style={{
              background: 'rgba(255, 102, 102, 0.3)',
              border: '1px solid #ff6666',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              marginBottom: '4px'
            }}
            title="Disable all feature flags for minimal mode"
          >
            Minimal Mode
          </button>
        </div>
      )}
      
      {isStuttering && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          background: 'rgba(139, 69, 19, 0.3)', 
          border: '1px solid #ff8c00',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ color: '#ff8c00', marginRight: '4px' }}>⚠️</span>
            <strong style={{ color: '#fff' }}>Stuttering Detected</strong>
          </div>
          <div style={{ marginTop: '4px', color: '#ccc' }}>
            Frame time exceeds 20ms. Check:
            <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#ccc' }}>
              <li>Network reconciliation events</li>
              <li>Feature flags (disable one by one - click above to toggle)</li>
              <li>Browser performance tab</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

