# API Documentation

This document describes all API endpoints and WebSocket message protocols for NEX://VOID.

## Table of Contents

- [REST API Endpoints](#rest-api-endpoints)
- [WebSocket Protocol](#websocket-protocol)
- [Message Formats](#message-formats)
- [Authentication](#authentication)
- [Error Handling](#error-handling)

## REST API Endpoints

### Base URL

- **Development**: `http://localhost:2567`
- **Staging**: `https://staging-nex-void.firebaseapp.com`
- **Production**: `https://nex-void.firebaseapp.com`

### Authentication

All API endpoints (except public endpoints) require authentication via Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

### Character Management

#### GET `/api/characters`

List all characters for the authenticated user.

**Response:**
```json
{
  "success": true,
  "characters": [
    {
      "id": "character_id",
      "name": "Character Name",
      "race": "human",
      "level": 10,
      "xp": 5000,
      "credits": 1000
    }
  ]
}
```

#### GET `/api/characters/count`

Get the number of characters for the authenticated user.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "maxCharacters": 5,
  "canCreateMore": true
}
```

#### GET `/api/characters/:characterId`

Get a specific character by ID (must be owned by the authenticated user).

**Response:**
```json
{
  "success": true,
  "character": {
    "id": "character_id",
    "name": "Character Name",
    "race": "human",
    "level": 10,
    "position": { "x": 0, "y": 0, "z": 0 },
    "health": 100,
    "maxHealth": 100,
    "mana": 50,
    "maxMana": 100,
    "inventory": [],
    "quests": [],
    "achievements": []
  }
}
```

### Monitoring API

#### GET `/api/monitoring/metrics`

Get metrics within a time range.

**Query Parameters:**
- `start` (optional): Start timestamp in milliseconds (default: 1 hour ago)
- `end` (optional): End timestamp in milliseconds (default: now)
- `metric` (optional): Filter by metric name
- `tags` (optional): JSON object of tags to filter by

**Response:**
```json
{
  "success": true,
  "metrics": [
    {
      "name": "player_count",
      "type": "gauge",
      "value": 150,
      "tags": { "room": "nexus" },
      "timestamp": 1234567890
    }
  ],
  "count": 1,
  "timeRange": {
    "start": 1234567890,
    "end": 1234567891
  }
}
```

#### GET `/api/monitoring/logs`

Get logs within a time range.

**Query Parameters:**
- `start` (optional): Start timestamp in milliseconds
- `end` (optional): End timestamp in milliseconds
- `level` (optional): Filter by log level (`info`, `warn`, `error`)
- `playerId` (optional): Filter by player ID

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "level": "error",
      "message": "Error message",
      "context": { "key": "value" },
      "timestamp": 1234567890,
      "playerId": "player_id"
    }
  ],
  "count": 1,
  "timeRange": {
    "start": 1234567890,
    "end": 1234567891
  }
}
```

#### GET `/api/monitoring/stats`

Get aggregated statistics.

**Query Parameters:**
- `start` (optional): Start timestamp in milliseconds
- `end` (optional): End timestamp in milliseconds

**Response:**
```json
{
  "success": true,
  "stats": {
    "player_count": {
      "count": 100,
      "sum": 15000,
      "avg": 150,
      "min": 100,
      "max": 200
    }
  },
  "errors": 5,
  "warnings": 10,
  "timeRange": {
    "start": 1234567890,
    "end": 1234567891
  }
}
```

#### POST `/api/monitoring/alerts`

Create a new alert.

**Request Body:**
```json
{
  "condition": {
    "metric": "player_count",
    "threshold": 1000,
    "operator": "gt",
    "tags": { "room": "nexus" }
  }
}
```

**Response:**
```json
{
  "success": true,
  "alertId": "alert_1234567890_abc123"
}
```

#### DELETE `/api/monitoring/alerts/:alertId`

Remove an alert.

**Response:**
```json
{
  "success": true
}
```

## WebSocket Protocol

### Connection

Connect to the Colyseus server via WebSocket:

```
ws://localhost:2567/nexus
```

### Authentication

Include Firebase ID token in connection options:

```typescript
const room = await client.joinOrCreate('nexus', {
  playerName: 'Player Name',
  race: 'human',
  firebaseToken: '<firebase-id-token>'
})
```

### Client-to-Server Messages

#### Movement

```typescript
{
  type: 'move',
  x: number,
  y: number,
  z: number,
  rotation: number
}
```

#### Spell Cast

```typescript
{
  type: 'castSpell',
  spellId: string,
  position: { x: number, y: number, z: number },
  rotation: number
}
```

#### Chat

```typescript
{
  type: 'chat',
  text: string
}
```

#### Loot Pickup

```typescript
{
  type: 'pickupLoot',
  lootId: string
}
```

#### Quest Management

```typescript
// Accept quest
{
  type: 'acceptQuest',
  questId: string
}

// Complete quest
{
  type: 'completeQuest',
  questId: string
}
```

#### Battle Pass

```typescript
// Claim reward
{
  type: 'claimBattlePassReward',
  tier: number,
  track: 'free' | 'premium'
}

// Unlock premium
{
  type: 'unlockBattlePassPremium'
}

// Request progress
{
  type: 'requestBattlePassProgress'
}
```

#### Trading

```typescript
// Initiate trade
{
  type: 'initiateTrade',
  targetPlayerId: string
}

// Add item to trade
{
  type: 'addTradeItem',
  sessionId: string,
  itemId: string,
  quantity: number
}

// Remove item from trade
{
  type: 'removeTradeItem',
  sessionId: string,
  itemId: string
}

// Set credits in trade
{
  type: 'setTradeCredits',
  sessionId: string,
  credits: number
}

// Confirm trade
{
  type: 'confirmTrade',
  sessionId: string
}

// Cancel trade
{
  type: 'cancelTrade',
  sessionId: string
}
```

#### Dungeons

```typescript
// Create dungeon
{
  type: 'createDungeon',
  difficulty: number,
  level: number
}

// Enter dungeon
{
  type: 'enterDungeon',
  dungeonId: string
}

// Exit dungeon
{
  type: 'exitDungeon',
  dungeonId: string
}

// Request dungeon progress
{
  type: 'requestDungeonProgress',
  dungeonId: string
}
```

#### Guilds

```typescript
// Create guild
{
  type: 'createGuild',
  name: string,
  tag: string
}

// Join guild
{
  type: 'joinGuild',
  guildId: string
}

// Leave guild
{
  type: 'leaveGuild'
}

// Guild chat
{
  type: 'guildChat',
  text: string
}
```

#### Social

```typescript
// Whisper to player
{
  type: 'whisper',
  targetId: string,
  text: string
}

// Emote
{
  type: 'emote',
  emote: string
}
```

### Server-to-Client Messages

#### State Delta Update

```typescript
{
  type: 'stateDelta',
  deltas: DeltaUpdate[]
}
```

#### Quest Update

```typescript
{
  type: 'questUpdate',
  questId: string,
  progress: QuestProgress
}
```

#### Available Quests

```typescript
{
  type: 'availableQuests',
  quests: Quest[]
}
```

#### Battle Pass Update

```typescript
{
  type: 'battlePassUpdate',
  progress: BattlePassProgress
}
```

#### Trade Session

```typescript
{
  type: 'tradeSession',
  session: TradeSession
}
```

#### Chat Message

```typescript
{
  type: 'chatMessage',
  playerId: string,
  playerName: string,
  text: string,
  channel: 'global' | 'guild' | 'whisper'
}
```

#### Achievement Unlocked

```typescript
{
  type: 'achievementUnlocked',
  achievementId: string,
  achievement: Achievement
}
```

## Message Formats

### Delta Update

```typescript
interface DeltaUpdate {
  path: string,
  value: any,
  operation: 'set' | 'delete' | 'add' | 'remove'
}
```

### Quest Progress

```typescript
interface QuestProgress {
  questId: string,
  status: 'active' | 'completed' | 'failed',
  objectives: Array<{
    id: string,
    current: number,
    quantity: number,
    completed: boolean
  }>
}
```

### Trade Session

```typescript
interface TradeSession {
  id: string,
  player1Id: string,
  player2Id: string,
  player1Offer: {
    items: Array<{ itemId: string, quantity: number }>,
    credits: number
  },
  player2Offer: {
    items: Array<{ itemId: string, quantity: number }>,
    credits: number
  },
  player1Confirmed: boolean,
  player2Confirmed: boolean,
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
}
```

## Error Handling

### HTTP Error Responses

All API endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message"
}
```

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

### WebSocket Error Handling

Errors are sent via WebSocket messages:

```typescript
{
  type: 'error',
  code: string,
  message: string,
  data?: any
}
```

### Error Codes

- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `PERMISSION_DENIED`: Insufficient permissions
- `SERVER_ERROR`: Internal server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Character endpoints**: 60 requests per minute
- **Monitoring endpoints**: 100 requests per minute
- **WebSocket messages**: 100 messages per second per connection

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1234567890
```

