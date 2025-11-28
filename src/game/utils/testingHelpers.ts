/**
 * Testing Helpers
 * Utilities to facilitate systematic testing of movement stuttering
 */

import { setFeatureFlags, getAllFeatureFlags, FeatureFlag } from './featureFlags'

export interface TestConfiguration {
  name: string
  flags: Partial<Record<FeatureFlag, boolean>>
}

export interface TestResult {
  configuration: string
  timestamp: number
  fps: number
  frameTime: number
  positionUpdates: number
  reconciliationEvents: number
  smoothMovement: boolean
  notes?: string
}

// Predefined test configurations
export const TEST_CONFIGURATIONS: TestConfiguration[] = [
  {
    name: 'Baseline - All Disabled',
    flags: {
      weatherEnabled: false,
      postProcessingEnabled: false,
      shadowsEnabled: false,
      networkReconciliationEnabled: false,
      collisionDetectionEnabled: false,
      cameraSmoothingEnabled: false
    }
  },
  {
    name: 'Camera Smoothing Only',
    flags: {
      weatherEnabled: false,
      postProcessingEnabled: false,
      shadowsEnabled: false,
      networkReconciliationEnabled: false,
      collisionDetectionEnabled: false,
      cameraSmoothingEnabled: true
    }
  },
  {
    name: 'Collision Detection Only',
    flags: {
      weatherEnabled: false,
      postProcessingEnabled: false,
      shadowsEnabled: false,
      networkReconciliationEnabled: false,
      collisionDetectionEnabled: true,
      cameraSmoothingEnabled: false
    }
  },
  {
    name: 'Network Reconciliation Only',
    flags: {
      weatherEnabled: false,
      postProcessingEnabled: false,
      shadowsEnabled: false,
      networkReconciliationEnabled: true,
      collisionDetectionEnabled: false,
      cameraSmoothingEnabled: false
    }
  },
  {
    name: 'Shadows Only',
    flags: {
      weatherEnabled: false,
      postProcessingEnabled: false,
      shadowsEnabled: true,
      networkReconciliationEnabled: false,
      collisionDetectionEnabled: false,
      cameraSmoothingEnabled: false
    }
  },
  {
    name: 'Post-Processing Only',
    flags: {
      weatherEnabled: false,
      postProcessingEnabled: true,
      shadowsEnabled: false,
      networkReconciliationEnabled: false,
      collisionDetectionEnabled: false,
      cameraSmoothingEnabled: false
    }
  },
  {
    name: 'Weather Only',
    flags: {
      weatherEnabled: true,
      postProcessingEnabled: false,
      shadowsEnabled: false,
      networkReconciliationEnabled: false,
      collisionDetectionEnabled: false,
      cameraSmoothingEnabled: false
    }
  },
  {
    name: 'All Features Enabled',
    flags: {
      weatherEnabled: true,
      postProcessingEnabled: true,
      shadowsEnabled: true,
      networkReconciliationEnabled: true,
      collisionDetectionEnabled: true,
      cameraSmoothingEnabled: true
    }
  }
]

// Store for test results
const testResults: TestResult[] = []

/**
 * Apply a test configuration
 */
export function applyTestConfiguration(config: TestConfiguration): void {
  console.log(`🧪 Applying test configuration: ${config.name}`)
  setFeatureFlags(config.flags)
  console.log('✅ Configuration applied. Reload the game to test.')
  console.log('Current flags:', getAllFeatureFlags())
}

/**
 * Record a test result
 */
export function recordTestResult(result: TestResult): void {
  testResults.push(result)
  console.log('📊 Test result recorded:', result)
  
  // Save to localStorage for persistence
  try {
    const stored = localStorage.getItem('movementTestResults')
    const existing = stored ? JSON.parse(stored) : []
    existing.push(result)
    localStorage.setItem('movementTestResults', JSON.stringify(existing))
  } catch (error) {
    console.warn('Failed to save test result:', error)
  }
}

/**
 * Get all test results
 */
export function getTestResults(): TestResult[] {
  try {
    const stored = localStorage.getItem('movementTestResults')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.warn('Failed to load test results:', error)
    return []
  }
}

/**
 * Clear all test results
 */
export function clearTestResults(): void {
  testResults.length = 0
  localStorage.removeItem('movementTestResults')
  console.log('🗑️ Test results cleared')
}

/**
 * Generate a test report
 */
export function generateTestReport(): string {
  const results = getTestResults()
  if (results.length === 0) {
    return 'No test results found. Run some tests first.'
  }
  
  let report = '📋 Movement Stuttering Test Report\n'
  report += '='.repeat(50) + '\n\n'
  
  results.forEach((result, index) => {
    report += `Test ${index + 1}: ${result.configuration}\n`
    report += `  Timestamp: ${new Date(result.timestamp).toLocaleString()}\n`
    report += `  FPS: ${result.fps}\n`
    report += `  Frame Time: ${result.frameTime.toFixed(2)}ms\n`
    report += `  Position Updates/sec: ${result.positionUpdates}\n`
    report += `  Reconciliation Events: ${result.reconciliationEvents}\n`
    report += `  Smooth Movement: ${result.smoothMovement ? '✅ Yes' : '❌ No'}\n`
    if (result.notes) {
      report += `  Notes: ${result.notes}\n`
    }
    report += '\n'
  })
  
  // Analysis
  report += 'Analysis:\n'
  report += '-'.repeat(50) + '\n'
  
  const smoothConfigs = results.filter(r => r.smoothMovement)
  const stutteringConfigs = results.filter(r => !r.smoothMovement)
  
  report += `Smooth configurations: ${smoothConfigs.length}\n`
  report += `Stuttering configurations: ${stutteringConfigs.length}\n\n`
  
  if (stutteringConfigs.length > 0) {
    report += '⚠️ Stuttering detected in:\n'
    stutteringConfigs.forEach(r => {
      report += `  - ${r.configuration} (Frame Time: ${r.frameTime.toFixed(2)}ms)\n`
    })
  }
  
  return report
}

/**
 * Quick test helper - applies configuration and logs instructions
 */
export function runQuickTest(configName: string): void {
  const config = TEST_CONFIGURATIONS.find(c => c.name === configName)
  if (!config) {
    console.error(`❌ Configuration "${configName}" not found. Available configurations:`)
    TEST_CONFIGURATIONS.forEach(c => console.log(`  - ${c.name}`))
    return
  }
  
  applyTestConfiguration(config)
  console.log('\n📝 Next steps:')
  console.log('1. Reload the game')
  console.log('2. Move around for 30-60 seconds')
  console.log('3. Observe the Movement Debug Panel (press M to toggle)')
  console.log('4. Record results using: recordTestResult({...})')
}

/**
 * Export test results as JSON
 */
export function exportTestResults(): string {
  const results = getTestResults()
  return JSON.stringify(results, null, 2)
}

/**
 * Import test results from JSON
 */
export function importTestResults(json: string): void {
  try {
    const results = JSON.parse(json)
    localStorage.setItem('movementTestResults', JSON.stringify(results))
    console.log(`✅ Imported ${results.length} test results`)
  } catch (error) {
    console.error('❌ Failed to import test results:', error)
  }
}

// Make functions available globally in dev mode
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).testingHelpers = {
    applyTestConfiguration,
    recordTestResult,
    getTestResults,
    clearTestResults,
    generateTestReport,
    runQuickTest,
    exportTestResults,
    importTestResults,
    TEST_CONFIGURATIONS
  }
  
  console.log('🧪 Testing helpers loaded! Available via window.testingHelpers')
  console.log('Quick start: window.testingHelpers.runQuickTest("Baseline - All Disabled")')
}

