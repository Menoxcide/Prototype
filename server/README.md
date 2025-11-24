# NEX://VOID Server

Colyseus game server for NEX://VOID MMO.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

Server will start on `ws://localhost:2567`

## Production

```bash
npm run build
npm start
```

## Environment Variables

- `PORT` - Server port (default: 2567)
- `REDIS_URL` - Redis connection URL (optional, for scaling)

## Features

- Server-authoritative game state
- Real-time multiplayer synchronization
- Enemy spawning and management
- Resource node management
- Loot drop system
- Spell projectile system
- World boss scheduling
- Chat system

## Monitoring

Visit `http://localhost:2567/colyseus` to view the Colyseus monitor dashboard.

