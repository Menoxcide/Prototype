-- Initial database schema for NEX://VOID
-- Run this migration to set up the database

CREATE TABLE IF NOT EXISTS players (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  race VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  xp_to_next INTEGER NOT NULL DEFAULT 100,
  credits BIGINT NOT NULL DEFAULT 0,
  position_x REAL NOT NULL DEFAULT 0,
  position_y REAL NOT NULL DEFAULT 0,
  position_z REAL NOT NULL DEFAULT 0,
  rotation REAL NOT NULL DEFAULT 0,
  health INTEGER NOT NULL DEFAULT 100,
  max_health INTEGER NOT NULL DEFAULT 100,
  mana INTEGER NOT NULL DEFAULT 100,
  max_mana INTEGER NOT NULL DEFAULT 100,
  inventory JSONB NOT NULL DEFAULT '[]',
  equipped_spells JSONB NOT NULL DEFAULT '[]',
  guild_id VARCHAR(255),
  guild_tag VARCHAR(10),
  achievements JSONB NOT NULL DEFAULT '[]',
  quests JSONB NOT NULL DEFAULT '[]',
  battle_pass JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_players_guild_id ON players(guild_id);
CREATE INDEX IF NOT EXISTS idx_players_last_login ON players(last_login);

-- Guilds table
CREATE TABLE IF NOT EXISTS guilds (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  tag VARCHAR(10) NOT NULL UNIQUE,
  leader_id VARCHAR(255) NOT NULL,
  member_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (leader_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guilds_tag ON guilds(tag);

-- Quest definitions table
CREATE TABLE IF NOT EXISTS quest_definitions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL,
  prerequisites JSONB NOT NULL DEFAULT '[]',
  objectives JSONB NOT NULL DEFAULT '[]',
  rewards JSONB NOT NULL DEFAULT '[]',
  repeatable BOOLEAN NOT NULL DEFAULT false,
  time_limit INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Battle pass seasons table
CREATE TABLE IF NOT EXISTS battle_pass_seasons (
  id VARCHAR(255) PRIMARY KEY,
  season INTEGER NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  tiers JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Analytics/events table (for monitoring)
CREATE TABLE IF NOT EXISTS game_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  player_id VARCHAR(255),
  data JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events(event_type);
CREATE INDEX IF NOT EXISTS idx_game_events_player_id ON game_events(player_id);
CREATE INDEX IF NOT EXISTS idx_game_events_timestamp ON game_events(timestamp);

-- Housing table
CREATE TABLE IF NOT EXISTS housing (
  id VARCHAR(255) PRIMARY KEY,
  player_id VARCHAR(255) UNIQUE NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  size JSONB NOT NULL,
  furniture JSONB NOT NULL DEFAULT '[]',
  upgrades JSONB NOT NULL DEFAULT '[]',
  created_at BIGINT NOT NULL,
  last_visited BIGINT NOT NULL,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_housing_player_id ON housing(player_id);
CREATE INDEX IF NOT EXISTS idx_housing_last_visited ON housing(last_visited);

