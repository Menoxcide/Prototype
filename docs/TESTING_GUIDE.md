# Movement Stuttering Testing Guide

## Quick Start

1. **Open the game in dev mode**
2. **Press 'M'** to toggle Movement Debug Panel
3. **Press 'T'** to toggle Testing Checklist
4. Start testing!

## Testing Tools

### Testing Checklist (Press 'T')
- Visual UI for running tests
- Pre-configured test scenarios
- One-click result recording
- Export results as JSON

### Browser Console Helpers
All testing functions are available via `window.testingHelpers`:

```javascript
// Quick test - applies configuration and shows instructions
window.testingHelpers.runQuickTest("Baseline - All Disabled")

// Apply a specific configuration
window.testingHelpers.applyTestConfiguration({
  name: "Custom Test",
  flags: {
    networkReconciliationEnabled: false,
    collisionDetectionEnabled: true
  }
})

// Record a test result
window.testingHelpers.recordTestResult({
  configuration: "Baseline - All Disabled",
  timestamp: Date.now(),
  fps: 60,
  frameTime: 16.67,
  positionUpdates: 120,
  reconciliationEvents: 0,
  smoothMovement: true,
  notes: "Movement was smooth"
})

// View all results
window.testingHelpers.getTestResults()

// Generate report
console.log(window.testingHelpers.generateTestReport())

// Export results
window.testingHelpers.exportTestResults()
```

## Predefined Test Configurations

1. **Baseline - All Disabled** - All optional features off
2. **Camera Smoothing Only** - Only camera lerp enabled
3. **Collision Detection Only** - Only collision checks enabled
4. **Network Reconciliation Only** - Only server sync enabled
5. **Shadows Only** - Only shadow rendering enabled
6. **Post-Processing Only** - Only post-processing effects enabled
7. **Weather Only** - Only weather system enabled
8. **All Features Enabled** - Everything on

## Testing Workflow

### Step 1: Baseline Test
1. Open Testing Checklist (Press 'T')
2. Click "Baseline - All Disabled"
3. Reload the game
4. Move around for 30-60 seconds
5. Observe Movement Debug Panel metrics
6. Click "✓ Yes" or "✗ No" for smooth movement
7. Add notes if needed
8. Click "Record Result"

### Step 2: Individual Feature Tests
Repeat for each feature:
1. Click a test configuration (e.g., "Camera Smoothing Only")
2. Reload the game
3. Test movement
4. Record result

### Step 3: Analysis
1. Review test results in Testing Checklist
2. Export results if needed
3. Generate report: `window.testingHelpers.generateTestReport()`

## Feature Flag Commands

```javascript
// Get all flags
import('./src/game/utils/featureFlags.js').then(m => 
  console.log(m.getAllFeatureFlags())
)

// Set a single flag
import('./src/game/utils/featureFlags.js').then(m => 
  m.setFeatureFlag('networkReconciliationEnabled', false)
)

// Set multiple flags
import('./src/game/utils/featureFlags.js').then(m => 
  m.setFeatureFlags({
    weatherEnabled: false,
    postProcessingEnabled: false,
    shadowsEnabled: false
  })
)

// Reset to defaults
import('./src/game/utils/featureFlags.js').then(m => 
  m.resetFeatureFlags()
)
```

## Interpreting Results

### Smooth Movement Indicators
- FPS: Stable 60 (or consistent target FPS)
- Frame Time: < 16.67ms (for 60fps)
- Reconciliation Events: Low (< 5/sec)
- No visual stuttering or rubberbanding

### Stuttering Indicators
- FPS: Dropping or inconsistent
- Frame Time: > 20ms spikes
- Reconciliation Events: High (> 10/sec)
- Visual stuttering or rubberbanding
- Position updates inconsistent

## Next Steps After Testing

1. **Identify the culprit**: Which feature(s) cause stuttering?
2. **Check metrics**: What are the performance numbers?
3. **Test combinations**: Do features interact poorly?
4. **Document findings**: Use the export function
5. **Implement fix**: Based on identified issue

## Tips

- Test in consistent conditions (same area, same movement pattern)
- Test for at least 30 seconds per configuration
- Watch the Movement Debug Panel for real-time metrics
- Use browser DevTools Performance tab for deep analysis
- Export results regularly to avoid losing data

