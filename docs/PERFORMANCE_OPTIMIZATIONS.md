# Performance Optimizations - Memory & CPU Spike Reduction

## Overview
This document describes the performance optimizations implemented to prevent browser/app crashes caused by memory and CPU spikes.

## Key Issues Addressed

1. **Memory Leaks**: Entities (enemies, loot, NPCs) not disposing Three.js resources when removed
2. **Excessive Asset Loading**: Too many concurrent asset loads (12 → 4)
3. **Memory Buildup**: Assets not being cleaned up aggressively enough
4. **No Memory Monitoring**: No system to detect memory pressure and trigger cleanup

## Implemented Solutions

### 1. Aggressive Memory Management (`src/game/utils/memoryManager.ts`)
- **Memory Monitoring**: Continuously monitors heap usage (checks every 1 second)
- **Automatic Cleanup**: Performs regular cleanup every 5 seconds
- **Pressure Detection**: 
  - High memory threshold: 70% of heap
  - Critical memory threshold: 85% of heap
- **Aggressive Cleanup**: Triggers immediate cleanup when pressure detected
- **Quality Reduction**: Automatically reduces quality settings when memory is critical
- **Integration**: Auto-starts when Game component mounts

**Key Features:**
- Monitors memory usage via Performance API
- Triggers cleanup at memory thresholds
- Reduces quality settings when memory is critical
- Clears Three.js texture cache
- Hints garbage collection (if available)

### 2. Entity Resource Disposal (`src/game/utils/entityResourceDisposal.ts`)
- **Proper Cleanup**: Disposes Three.js resources when entities are removed
- **Recursive Disposal**: Handles geometries, materials, and textures recursively
- **Entity Types Supported**:
  - Enemies
  - Loot Drops
  - Projectiles
  - NPCs

**Integration Points:**
- `gameStore.removeEnemy()` - Disposes enemy resources
- `gameStore.removeLootDrop()` - Disposes loot resources
- `gameStore.removeNPC()` - Disposes NPC resources
- `Enemy.tsx` cleanup - Disposes model resources on unmount

### 3. Reduced Concurrent Asset Loading
- **Before**: 12 concurrent asset loads
- **After**: 4 concurrent asset loads
- **Location**: `src/game/utils/progressiveLoader.ts`
- **Impact**: Prevents memory spikes during asset loading

### 4. Shorter Asset Cleanup Timeout
- **Before**: 60 seconds unused asset timeout
- **After**: 30 seconds unused asset timeout
- **Location**: `src/game/assets/assetManager.ts`
- **Impact**: Assets are cleaned up faster, preventing memory buildup

### 5. Frame Budget Throttling (`src/game/utils/frameBudgetThrottle.ts`)
- **Purpose**: Distributes expensive operations across frames
- **Budget**: Max 8ms per frame for throttled operations
- **Features**:
  - Priority-based execution
  - Minimum interval between runs
  - Frame skipping support
- **Usage**: Can be integrated into expensive useFrame hooks

## How It Works

### Memory Monitoring Flow

1. **Memory Manager Starts** (when Game component mounts)
   - Begins monitoring memory usage every 1 second
   - Starts regular cleanup every 5 seconds

2. **Regular Cleanup** (every 5 seconds)
   - Cleans texture pool
   - Cleans geometry pool
   - Triggers asset manager cleanup
   - Hints garbage collection

3. **Memory Pressure Detected**
   - If memory > 70%: Triggers aggressive cleanup
   - If memory > 85%: 
     - Triggers aggressive cleanup
     - Reduces quality settings automatically
     - Logs warning in dev mode

4. **Entity Removal**
   - Store removes entity from state
   - Entity resource disposal called
   - Three.js resources disposed
   - Asset manager releases model references

### Entity Lifecycle

```
Entity Created → Resources Allocated
     ↓
Entity Active → Resources in Use
     ↓
Entity Removed → disposeEntityResources() called
     ↓
Geometries Disposed
Materials Disposed
Textures Disposed
Asset References Released
```

## Configuration

### Memory Thresholds
Located in `src/game/utils/memoryManager.ts`:
```typescript
private readonly HIGH_MEMORY_THRESHOLD = 70 // 70% of heap
private readonly CRITICAL_MEMORY_THRESHOLD = 85 // 85% of heap
```

### Cleanup Intervals
```typescript
private readonly CLEANUP_INTERVAL = 5000 // 5 seconds
private readonly MONITOR_INTERVAL = 1000 // 1 second
private readonly AGGRESSIVE_CLEANUP_COOLDOWN = 3000 // 3 seconds
```

### Asset Loading
```typescript
private maxConcurrentLoads: number = 4 // Reduced from 12
private readonly UNUSED_ASSET_TIMEOUT = 30000 // 30 seconds (reduced from 60)
```

## Monitoring & Debugging

### Dev Mode Logging
When `import.meta.env.DEV` is true:
- Memory pressure warnings logged to console
- Cleanup operations logged
- Quality reduction warnings logged

### Memory Metrics
Access via `memoryManager.getMemoryMetrics()`:
```typescript
{
  used: number,    // MB
  total: number,   // MB
  limit: number,   // MB
  percentage: number // 0-100
}
```

### Memory Pressure Level
```typescript
memoryManager.getMemoryPressureLevel()
// Returns: 'normal' | 'high' | 'critical'
```

## Manual Cleanup

You can trigger cleanup manually if needed:
```typescript
import { memoryManager } from './utils/memoryManager'

// Force immediate cleanup
memoryManager.forceCleanup()
```

## Testing

To verify the optimizations are working:

1. **Memory Usage**: Open Chrome DevTools → Performance → Memory tab
2. **Console Logs**: Watch for memory pressure warnings in dev mode
3. **Quality Changes**: Monitor if quality settings auto-reduce during gameplay
4. **Entity Cleanup**: Check that entities properly dispose resources when removed

## Performance Impact

### Expected Improvements:
- **Memory Usage**: 30-50% reduction in peak memory usage
- **Memory Leaks**: Eliminated entity-related memory leaks
- **Asset Loading**: Smoother loading with fewer concurrent requests
- **Browser Stability**: Reduced crashes from memory exhaustion

### Monitoring:
- Check memory usage over time with Chrome DevTools
- Monitor FPS stability during gameplay
- Watch for memory pressure warnings in console

## Future Enhancements

1. **Adaptive Asset Loading**: Reduce concurrent loads further if memory pressure is high
2. **LOD System Enhancement**: More aggressive LOD based on memory usage
3. **Entity Pooling**: Reuse entity objects instead of creating/destroying
4. **Texture Compression**: Use compressed texture formats to reduce memory
5. **Geometry Instancing**: Further reduce draw calls and memory usage

