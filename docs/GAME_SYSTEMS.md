# Game Systems Documentation

This document provides detailed documentation for all game systems in MARS://NEXUS.

## Table of Contents

- [Character System](#character-system)
- [Combat System](#combat-system)
- [Crafting System](#crafting-system)
- [Quest System](#quest-system)
- [Battle Pass System](#battle-pass-system)
- [Trading System](#trading-system)
- [Achievement System](#achievement-system)
- [Social System](#social-system)
- [Housing System](#housing-system)
- [Dungeon System](#dungeon-system)
- [Dynamic Events System](#dynamic-events-system)

## Character System

### Overview

The character system manages player characters, including creation, progression, and customization.

### Features

- **Character Creation**: 5 playable races (Human, Cybernetic, Quantum, Void, Lumina)
- **Level Progression**: XP-based leveling system
- **Attributes**: Health, Mana, and derived stats
- **Inventory**: Item management and equipment
- **Spells**: Spell loadout and casting

### Configuration

Character configuration is defined in `src/game/data/races.ts`:

- Race-specific starting stats
- Racial bonuses
- Visual customization options

### System Interactions

- **Combat System**: Uses character stats for damage calculation
- **Quest System**: Tracks character progress for quest completion
- **Achievement System**: Unlocks achievements based on character actions
- **Trading System**: Validates character ownership of items

## Combat System

### Overview

The combat system handles spell casting, damage calculation, and enemy interactions.

### Features

- **Spell Casting**: Multiple spell types with cooldowns and mana costs
- **Damage Calculation**: Server-authoritative damage with client prediction
- **Combo System**: Multiplier system for consecutive kills
- **Critical Hits**: Chance-based critical damage
- **Status Effects**: Buffs and debuffs

### Spell Types

1. **Quantum Bolt**: Basic projectile spell
2. **Plasma Burst**: Area damage spell
3. **Void Strike**: Piercing beam spell
4. **Heal Circuit**: Healing spell
5. **Quantum Slash**: Melee spell
6. **Chain Lightning**: Multi-target spell
7. **Shield Matrix**: Defensive spell
8. **Teleport**: Utility spell
9. **Meteor Strike**: High damage spell
10. **Energy Drain**: Mana drain spell

### Configuration

Spell data is defined in `src/game/data/spells.ts`:

- Mana cost
- Cooldown duration
- Damage values
- Range and cast time
- Visual effects

### System Interactions

- **Character System**: Uses character stats for damage calculation
- **Network System**: Syncs spell casts and damage to clients
- **Enemy System**: Applies damage to enemies
- **Achievement System**: Tracks kills for achievements

## Crafting System

### Overview

The crafting system allows players to create items from materials.

### Features

- **Recipe System**: Predefined crafting recipes
- **Quality System**: 6 quality tiers (Poor, Common, Uncommon, Rare, Epic, Legendary)
- **Material Substitution**: Alternative materials with penalties
- **Crafting Queue**: Multiple items in queue
- **Specializations**: Crafting bonuses for specific types
- **Failure Chance**: Risk of crafting failure
- **Stat Randomization**: Random stat ranges based on quality

### Quality Tiers

1. **Poor**: 0.3-0.5 quality score
2. **Common**: 0.5-0.7 quality score
3. **Uncommon**: 0.7-0.85 quality score
4. **Rare**: 0.85-0.95 quality score
5. **Epic**: 0.95+ quality score
6. **Legendary**: 0.95+ quality score (rare)

### Configuration

Crafting configuration is defined in `src/game/data/items.ts` and `src/game/systems/enhancedCrafting.ts`:

- Recipe definitions
- Material substitution rules
- Quality calculation formulas
- Specialization bonuses

### System Interactions

- **Inventory System**: Adds crafted items to inventory
- **Trading System**: Crafted items can be traded
- **Quest System**: Crafting objectives for quests
- **Achievement System**: Tracks crafting achievements

## Quest System

### Overview

The quest system manages player quests, objectives, and rewards.

### Quest Types

1. **Daily Quests**: Reset every 24 hours
2. **Weekly Quests**: Reset every 7 days
3. **Story Quests**: Main storyline quests
4. **Side Quests**: Optional quests

### Objective Types

- **Kill**: Defeat enemies
- **Collect**: Gather items
- **Craft**: Create items
- **Explore**: Visit locations
- **Talk**: Interact with NPCs

### Configuration

Quest definitions are in `src/game/data/quests.ts`:

- Quest metadata (name, description, level)
- Objectives and requirements
- Rewards (XP, credits, items)
- Prerequisites
- Time limits

### System Interactions

- **Character System**: Awards XP and items to characters
- **Battle Pass System**: Quest completion grants battle pass XP
- **Achievement System**: Quest completion unlocks achievements
- **Network System**: Syncs quest progress to clients

## Battle Pass System

### Overview

The battle pass system provides seasonal progression and rewards.

### Features

- **Seasonal Progression**: 90-day seasons
- **Tier System**: 50 tiers per season
- **Free Track**: Available to all players
- **Premium Track**: Unlockable with premium purchase
- **XP System**: Gain XP through gameplay
- **Reward Claiming**: Claim rewards per tier

### Reward Types

- **Credits**: In-game currency
- **XP**: Character experience
- **Items**: Equipment and consumables
- **Cosmetics**: Visual customization

### Configuration

Battle pass configuration is in `src/game/data/battlePass.ts`:

- Season definition
- Tier XP requirements
- Reward definitions
- Premium unlock cost

### System Interactions

- **Quest System**: Quest completion grants battle pass XP
- **Combat System**: Enemy kills grant battle pass XP
- **Character System**: Rewards added to character inventory
- **Network System**: Syncs progress to clients

## Trading System

### Overview

The trading system enables player-to-player item and credit trading.

### Features

- **Trade Sessions**: Two-player trading sessions
- **Item Trading**: Exchange items between players
- **Credit Trading**: Exchange credits
- **Trade Confirmation**: Both players must confirm
- **Proximity Validation**: Players must be near each other
- **Ownership Validation**: Verifies item ownership

### Trade Flow

1. Player initiates trade with another player
2. Both players add items/credits to their offers
3. Both players confirm the trade
4. Trade executes and items/credits are transferred

### Configuration

Trading configuration is in `server/src/systems/TradingSystem.ts`:

- Proximity distance requirement
- Trade timeout duration
- Validation rules

### System Interactions

- **Inventory System**: Transfers items between inventories
- **Character System**: Updates character credits
- **Security System**: Validates trades for cheating
- **Network System**: Syncs trade state to clients

## Achievement System

### Overview

The achievement system tracks player accomplishments and awards rewards.

### Achievement Categories

1. **Combat**: Combat-related achievements
2. **Exploration**: Exploration achievements
3. **Social**: Social interaction achievements
4. **Crafting**: Crafting achievements
5. **Collection**: Item collection achievements

### Rarity Tiers

- **Common**: Easy to achieve
- **Rare**: Moderate difficulty
- **Epic**: Difficult to achieve
- **Legendary**: Extremely difficult

### Configuration

Achievement definitions are in `server/src/systems/AchievementSystem.ts`:

- Achievement metadata
- Requirements
- Rewards
- Hidden status

### System Interactions

- **All Systems**: Tracks events from all game systems
- **Character System**: Awards rewards to characters
- **Network System**: Broadcasts achievement unlocks

## Social System

### Overview

The social system manages player interactions, friends, parties, and guilds.

### Features

- **Friends**: Friend requests and management
- **Parties**: Temporary groups for gameplay
- **Guilds**: Permanent organizations
- **Chat**: Global, guild, and whisper chat
- **Moderation**: Player reporting and blocking
- **Privacy**: Privacy settings

### Guild Features

- **Guild Creation**: Create guilds with name and tag
- **Guild Ranks**: Multiple rank levels
- **Guild Chat**: Guild-only chat channel
- **Guild Management**: Member promotion/demotion

### Configuration

Social system configuration is in `server/src/systems/SocialSystem.ts`:

- Friend request limits
- Party size limits
- Guild size limits
- Privacy defaults

### System Interactions

- **Character System**: Links friends to characters
- **Chat System**: Manages chat channels
- **Network System**: Syncs social state to clients

## Housing System

### Overview

The housing system allows players to own and customize personal spaces.

### Features

- **Housing Instances**: Personal housing spaces
- **Furniture Placement**: Place furniture items
- **Housing Upgrades**: Expand and improve housing
- **Visiting**: Visit other players' housing

### Configuration

Housing configuration is in `server/src/systems/HousingSystem.ts`:

- Housing size limits
- Furniture definitions
- Upgrade options

### System Interactions

- **Inventory System**: Uses furniture items from inventory
- **Character System**: Links housing to characters
- **Network System**: Syncs housing state to clients

## Dungeon System

### Overview

The dungeon system provides procedurally generated dungeon instances.

### Features

- **Procedural Generation**: Seed-based dungeon generation
- **Room System**: Multiple room types
- **Entity Spawning**: Enemies and loot in dungeons
- **Progression Tracking**: Track dungeon completion
- **Difficulty Scaling**: Adjustable difficulty levels

### Room Types

- **Start Room**: Entry point
- **Normal Room**: Standard combat rooms
- **Boss Room**: Boss encounters
- **Treasure Room**: Loot rooms
- **Puzzle Room**: Puzzle challenges

### Configuration

Dungeon configuration is in `server/src/systems/DungeonSystem.ts` and `DungeonGenerator.ts`:

- Room count ranges
- Room size ranges
- Entity spawn rates
- Difficulty scaling

### System Interactions

- **Combat System**: Enemies in dungeons
- **Quest System**: Dungeon completion objectives
- **Achievement System**: Dungeon-related achievements
- **Network System**: Syncs dungeon state to clients

## Dynamic Events System

### Overview

The dynamic events system spawns random world events.

### Event Types

1. **Treasure Hunt**: Find hidden treasures
2. **Enemy Swarm**: Increased enemy spawns
3. **Resource Boost**: Increased resource gathering
4. **Boss Spawn**: Special boss encounters
5. **Weather Change**: Environmental changes
6. **NPC Quest**: Special NPC quests

### Configuration

Event configuration is in `server/src/systems/DynamicEventSystem.ts`:

- Event spawn intervals
- Event duration
- Event rewards
- Event participation limits

### System Interactions

- **Combat System**: Spawns enemies for events
- **Quest System**: Event completion objectives
- **Achievement System**: Event participation achievements
- **Network System**: Broadcasts events to clients

## System Dependencies

### Core Dependencies

```
Character System
├── Combat System
├── Quest System
├── Achievement System
└── Trading System

Combat System
├── Character System
└── Enemy System

Crafting System
├── Inventory System
└── Character System

Quest System
├── Character System
└── Battle Pass System

Battle Pass System
└── Character System

Trading System
├── Inventory System
└── Character System

Achievement System
└── Character System

Social System
└── Character System

Housing System
├── Inventory System
└── Character System

Dungeon System
├── Combat System
└── Character System

Dynamic Events System
├── Combat System
└── Character System
```

## Extension Points

### Adding New Systems

1. Create system file in `server/src/systems/` or `src/game/systems/`
2. Define system interface
3. Implement system class
4. Integrate into `NexusRoom.ts` or client game loop
5. Add network message handlers
6. Add tests in `__tests__/systems/`

### Adding New Features to Existing Systems

1. Extend system interface
2. Implement feature in system class
3. Add network message handlers if needed
4. Update tests
5. Update documentation

## Performance Considerations

- **Caching**: Systems use cache service for frequently accessed data
- **Batching**: Database writes are batched to reduce load
- **Delta Compression**: Only changed data is sent over network
- **Interest Management**: Only relevant entities are sent to clients
- **Spatial Hashing**: Efficient collision detection and entity queries

