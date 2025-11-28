/**
 * Testing Checklist Component
 * Provides a UI for running systematic tests and recording results
 */

import { useState, useEffect } from 'react'
import { TEST_CONFIGURATIONS, recordTestResult, getTestResults, clearTestResults, exportTestResults } from '../utils/testingHelpers'
import { getAllFeatureFlags } from '../utils/featureFlags'
import { movementMetrics } from './MovementDebugTracker'

export default function TestingChecklist() {
  const [visible, setVisible] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [testResults, setTestResults] = useState(getTestResults())
  const [smoothMovement, setSmoothMovement] = useState<boolean | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 't' || e.key === 'T') {
        setVisible(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  useEffect(() => {
    // Refresh test results periodically
    const interval = setInterval(() => {
      setTestResults(getTestResults())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const handleStartTest = (configName: string) => {
    setCurrentTest(configName)
    setSmoothMovement(null)
    setNotes('')
    console.log(`🧪 Starting test: ${configName}`)
    console.log('Apply configuration and reload the game, then mark results here.')
  }

  const handleRecordResult = () => {
    if (!currentTest) return

    const metrics = movementMetrics
    const result = {
      configuration: currentTest,
      timestamp: Date.now(),
      fps: metrics.fps,
      frameTime: metrics.frameTime,
      positionUpdates: metrics.positionUpdates,
      reconciliationEvents: metrics.reconciliationEvents,
      smoothMovement: smoothMovement ?? false,
      notes: notes || undefined
    }

    recordTestResult(result)
    setTestResults(getTestResults())
    setCurrentTest(null)
    setSmoothMovement(null)
    setNotes('')
    console.log('✅ Test result recorded:', result)
  }

  const handleClearResults = () => {
    if (confirm('Clear all test results?')) {
      clearTestResults()
      setTestResults([])
    }
  }

  const handleExportResults = () => {
    const json = exportTestResults()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movement-test-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!visible) return null

  const featureFlags = getAllFeatureFlags()

  return (
    <div
      style={{
        position: 'fixed',
        top: 10,
        left: 10,
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 99999,
        minWidth: '400px',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '2px solid #444',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ marginBottom: '12px', fontWeight: 'bold', borderBottom: '2px solid #666', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Testing Checklist (Press T to toggle)</span>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Current Test Status */}
      {currentTest && (
        <div style={{ marginBottom: '12px', padding: '8px', background: 'rgba(255, 200, 0, 0.2)', borderRadius: '4px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Current Test: {currentTest}</div>
          <div style={{ marginBottom: '8px' }}>
            <div>FPS: {movementMetrics.fps}</div>
            <div>Frame Time: {movementMetrics.frameTime.toFixed(2)}ms</div>
            <div>Reconciliation Events: {movementMetrics.reconciliationEvents}</div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Movement Smooth?</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSmoothMovement(true)}
                style={{
                  background: smoothMovement === true ? '#66ff66' : '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  cursor: 'pointer'
                }}
              >
                ✓ Yes
              </button>
              <button
                onClick={() => setSmoothMovement(false)}
                style={{
                  background: smoothMovement === false ? '#ff6666' : '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 12px',
                  cursor: 'pointer'
                }}
              >
                ✗ No
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', marginBottom: '4px' }}>Notes:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%',
                minHeight: '60px',
                background: '#222',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '4px',
                padding: '4px',
                fontFamily: 'monospace',
                fontSize: '11px'
              }}
              placeholder="Add any observations..."
            />
          </div>
          <button
            onClick={handleRecordResult}
            disabled={smoothMovement === null}
            style={{
              width: '100%',
              background: smoothMovement === null ? '#444' : '#66ff66',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '8px',
              cursor: smoothMovement === null ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            Record Result
          </button>
        </div>
      )}

      {/* Test Configurations */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Test Configurations:</div>
        {TEST_CONFIGURATIONS.map((config) => (
          <button
            key={config.name}
            onClick={() => handleStartTest(config.name)}
            style={{
              display: 'block',
              width: '100%',
              marginBottom: '4px',
              padding: '6px',
              background: currentTest === config.name ? '#444' : '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '11px'
            }}
          >
            {config.name}
          </button>
        ))}
      </div>

      {/* Test Results Summary */}
      <div style={{ marginBottom: '12px', borderTop: '1px solid #444', paddingTop: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Test Results ({testResults.length})</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleExportResults}
              style={{
                background: '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Export
            </button>
            <button
              onClick={handleClearResults}
              style={{
                background: '#666',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              Clear
            </button>
          </div>
        </div>
        {testResults.length === 0 ? (
          <div style={{ color: '#888', fontSize: '11px' }}>No results yet</div>
        ) : (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {testResults.slice(-5).reverse().map((result, index) => (
              <div
                key={index}
                style={{
                  padding: '4px',
                  marginBottom: '4px',
                  background: result.smoothMovement ? 'rgba(102, 255, 102, 0.1)' : 'rgba(255, 102, 102, 0.1)',
                  borderRadius: '4px',
                  fontSize: '10px'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{result.configuration}</div>
                <div>
                  {result.smoothMovement ? '✓' : '✗'} FPS: {result.fps} | Frame: {result.frameTime.toFixed(2)}ms
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Feature Flags */}
      <div style={{ borderTop: '1px solid #444', paddingTop: '12px' }}>
        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Current Flags:</div>
        {Object.entries(featureFlags).map(([flag, enabled]) => (
          <div key={flag} style={{ fontSize: '10px', marginBottom: '2px' }}>
            <span style={{ color: enabled ? '#66ff66' : '#ff6666' }}>{enabled ? '✓' : '✗'}</span> {flag}
          </div>
        ))}
      </div>
    </div>
  )
}

