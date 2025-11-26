# NEX://VOID Architecture Documentation

## Overview

NEX://VOID is a multiplayer cyberpunk MMORPG built with React, Three.js, and Colyseus. This document provides a comprehensive overview of the system architecture.

## System Architecture

### Client-Server Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌──────────────┐
│   React Client  │◄───────►│  Colyseus Server │◄───────►│  PostgreSQL  │
│   (Three.js)    │  WebSocket│   (Express)     │   SQL   │   Database   │
└─────────────────┘         └──────────────────┘         └──────────────┘
       │                              │
       │                              │
       ▼                              ▼
┌─────────────────┐         ┌──────────────────┐
│  Firebase Auth  │         │   Redis Cache     │
│   & Hosting     │         │   (Pub/Sub)       │
└─────────────────┘         └──────────────────┘
```

## Core Components

### Client-Side

#### Game Loop
- **Location**: `src/game/Game.tsx`
- **Purpose**: Main game component managing game loop, spell projectiles, loot pickup, and network connection
- **Key Features**:
  - Variable timestep game loop
  - Frame budget management
  - Mobile optimizations (FPS capping)
  - Progressive asset loading

#### State Management
- **Location**: `src/game/store/gameStore.ts`
- **Technology**: Zustand
- **Features**:
  - Selective state subscriptions (reduces re-renders)
  - State update batching
  - Immutable state updates

#### Rendering
- **Location**: `src/game/components/EnhancedScene.tsx`
- **Technology**: React Three Fiber, Three.js
- **Features**:
  - Instanced rendering for entities
  - Adaptive quality settings
  - Post-processing with adaptive quality
  - Shadow optimization

#### Network
- **Location**: `src/game/network/colyseus.ts`
- **Features**:
  - Automatic reconnection
  - Snapshot interpolation
  - Connection quality monitoring
  - Message batching with priorities

### Server-Side

#### Room Management
- **Location**: `server/src/rooms/NexusRoom.ts`
- **Features**:
  - Adaptive tick rate (30 FPS for <10 players, 60 FPS for >=10 players)
  - Spatial hash grid for collision detection
  - Delta compression for state updates
  - Interest management (distance-based filtering)
  - Entity update batching with priorities

#### Database Layer
- **Location**: `server/src/services/DatabaseService.ts`
- **Features**:
  - Connection pooling
  - Batch writes
  - Incremental saves
  - Transaction support

#### Caching
- **Location**: `server/src/services/CacheService.ts`
- **Features**:
  - Multi-level caching (in-memory + Redis)
  - TTL-based invalidation
  - Event-based invalidation
  - Cache statistics

## Data Flow

### Player Movement
1. Client sends movement update via `syncSystem.ts`
2. Message batcher batches updates with adaptive intervals
3. Server receives update in `NexusRoom.onMessage('move')`
4. Server validates movement with `SecurityService`
5. Server updates player state
6. Server broadcasts delta update to nearby players
7. Client receives update and applies snapshot interpolation

### Combat System
1. Client casts spell via `spellSystem.ts`
2. Client-side prediction shows immediate effect
3. Server validates spell cast
4. Server calculates damage using `combatUtils.ts`
5. Server updates enemy health
6. Server broadcasts damage numbers and state delta
7. Client reconciles prediction with server state

## Performance Optimizations

### Client-Side
- Object pooling (projectiles, damage numbers, particles, loot, enemies)
- Instanced rendering for multiple entities
- Progressive asset loading
- Adaptive quality settings based on FPS
- Frame budget management
- Variable timestep game loop

### Server-Side
- Spatial hash grid for collision detection
- Interest management (only send relevant updates)
- Delta compression (only send changes)
- Multi-level caching
- Batch database writes
- Adaptive tick rate

## Security

### Client-Side Validation
- Input sanitization
- Rate limiting
- Client-side prediction with server reconciliation

### Server-Side Authority
- All critical game logic is server-authoritative
- Movement validation
- Damage calculation
- Item ownership verification
- Trade validation

## Error Handling

### Client-Side
- Centralized error handler (`src/game/utils/errorHandler.ts`)
- Error boundaries for React components
- Network error recovery (automatic reconnection)
- Resource error recovery (fallback assets)

### Server-Side
- Centralized error handler (`server/src/utils/errorHandler.ts`)
- Database error recovery
- Network error recovery
- Error aggregation and reporting

## Testing

### Test Coverage
- **Target**: 80% for core systems, 60% overall
- **Location**: `src/__tests__/`, `server/src/__tests__/`
- **Types**:
  - Unit tests
  - Integration tests
  - Performance benchmarks
  - E2E tests

## Deployment

### CI/CD Pipeline
- **Location**: `.github/workflows/ci.yml`
- **Stages**:
  1. Test (multiple Node.js versions)
  2. Build
  3. Security scan
  4. Deploy to staging (develop branch)
  5. Deploy to production (main branch)

### Environments
- **Staging**: `staging-nex-void` Firebase project
- **Production**: `nex-void` Firebase project

## Monitoring

### Performance Dashboard
- **Location**: `src/game/components/PerformanceDashboard.tsx`
- **Metrics**:
  - FPS
  - Frame time
  - Draw calls
  - Triangles
  - Memory usage
  - Network latency
  - Packet loss

### Server Monitoring
- **Location**: `server/src/services/MonitoringService.ts`
- **Features**:
  - Performance metrics
  - Error aggregation
  - Alert system
  - Log aggregation

## Future Enhancements

- Horizontal scaling with multiple Colyseus servers
- Read replicas for analytics
- Blue-green deployment
- A/B testing framework
- Enhanced analytics

