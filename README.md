# NEX://VOID - Mobile Cyberpunk MMO

A production-ready mobile-first cyberpunk MMO built with React, TypeScript, Three.js, and Colyseus.

## Features

- **Mobile-First Design**: Touch controls with NippleJS joystick and spell wheel
- **3D Cyberpunk World**: Built with Three.js and React Three Fiber
- **Real-Time Multiplayer**: Colyseus integration for 1000+ concurrent players
- **Character System**: 5 unique sci-fi races with different bonuses
- **Combat System**: Spell casting, melee attacks, and server-authoritative combat
- **Crafting & Economy**: Full crafting system with recipes and market
- **Social Features**: Guilds, chat, proximity voice chat (LiveKit)
- **Quest System**: Daily, weekly, and story quests with progress tracking and rewards
- **Battle Pass**: Seasonal progression system with free and premium tracks
- **Performance Optimized**: Object pooling, spatial partitioning, delta compression, instanced rendering
- **Database Persistence**: Player data, quest progress, and battle pass saved to PostgreSQL

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **3D Graphics**: Three.js + React Three Fiber + Drei
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Mobile Controls**: NippleJS
- **Backend**: Colyseus + Node.js + Redis
- **Database**: PostgreSQL (with in-memory fallback for development)
- **Voice Chat**: LiveKit (WebRTC)
- **Shared Package**: Common types and utilities for client/server

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The game will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── game/
│   ├── components/     # 3D game components (Three.js)
│   ├── ui/            # React UI components
│   ├── data/          # Game data (races, spells, items, etc.)
│   ├── systems/       # Game systems (spell system, etc.)
│   ├── network/       # Multiplayer networking
│   ├── store/         # Zustand state management
│   ├── utils/         # Client-side utilities (object pooling, etc.)
│   └── Game.tsx       # Main game component
├── App.tsx            # Root component
└── main.tsx           # Entry point

server/
├── src/
│   ├── rooms/         # Colyseus room implementations
│   ├── systems/       # Server game systems (Quest, BattlePass, etc.)
│   ├── services/      # Database and data services
│   ├── utils/         # Server-side utilities
│   └── migrations/    # Database migration scripts

shared/
└── src/
    ├── types/         # Shared TypeScript types
    └── utils/         # Shared utilities (ObjectPool, SpatialHashGrid, etc.)
```

## Game Systems

### Character Creation
- Choose from 5 races: Human, Cyborg, Android, Voidborn, Quantum
- Each race has unique bonuses to health, mana, and speed

### Combat
- 10+ spells with different damage, mana costs, and cooldowns
- Melee attacks (Quantum Slash)
- Server-authoritative combat to prevent cheating

### Crafting
- Craft items from resources
- Recipes unlock as you level up
- Crafting takes time based on recipe complexity

### Inventory & Market
- Manage your inventory (50 slots)
- Buy and sell items at the market
- Stackable items for resources

### Quest System
- Daily, weekly, and story quests
- Multiple objectives per quest
- Real-time progress tracking
- Automatic quest resets
- Prerequisites and repeatable quests

### Battle Pass
- Seasonal progression system
- 50 tiers per season
- Free and premium reward tracks
- XP earned through gameplay
- Tier unlocking and reward claiming

## Mobile Controls

- **Left Side**: Virtual joystick for movement
- **Right Side**: Spell hotbar (5 slots)
- **HUD**: Tap buttons to open inventory, crafting, market, spellbook
- **Chat**: Toggle chat button in bottom right

## Performance Optimizations

### Client-Side
- **Object Pooling**: Reuses spell projectiles to reduce garbage collection
- **Frustum Culling**: Only renders objects visible to the camera
- **Instanced Rendering**: Reduces draw calls for enemies and loot drops
- **LOD System**: Level-of-detail management for distance-based rendering
- **Quality Settings**: Dynamic quality adjustment based on FPS
- **Client Prediction**: Smooth movement with server reconciliation

### Server-Side
- **Spatial Hash Grid**: O(n) collision detection instead of O(n²)
- **Delta Compression**: Sends only changed state to reduce bandwidth
- **Update Batching**: Batches entity updates at 10Hz instead of 60Hz
- **Entity Cleanup**: Automatic cleanup of expired loot and projectiles
- **Interest Management**: Only sends relevant entities to nearby players

## Development Roadmap

### Phase 1: Mobile Core ✅
- Project setup and structure
- Game data and state management
- UI components and 3D world
- Mobile controls and core game loop

### Phase 2: Multiplayer ✅
- Colyseus server setup
- Real-time synchronization
- Other players rendering
- Global chat
- Server-authoritative enemies
- Shared loot system

### Phase 3: Performance & Persistence ✅
- Performance optimizations (object pooling, spatial partitioning, etc.)
- Database persistence (PostgreSQL)
- Quality settings system
- Network optimizations

### Phase 4: Content & Progression ✅
- Quest system (daily, weekly, story)
- Battle pass system
- Player data persistence

### Phase 5: Advanced Features (In Progress)
- Procedural dungeons
- Trading system
- Player housing
- Achievement system
- Enhanced combat mechanics

### Phase 6: Polish & Launch
- Security and anti-cheat
- Monitoring and observability
- Mobile optimizations
- Accessibility features
- Localization
- Testing infrastructure

## License

MIT

