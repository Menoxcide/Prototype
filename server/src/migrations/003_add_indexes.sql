-- Migration 003: Add additional indexes for query performance
-- This migration adds indexes on frequently queried columns

-- Player indexes
CREATE INDEX IF NOT EXISTS idx_players_id ON players(id);
CREATE INDEX IF NOT EXISTS idx_players_level ON players(level);
CREATE INDEX IF NOT EXISTS idx_players_credits ON players(credits);

-- Quest indexes (if quests table exists or in players.quests JSONB)
-- Note: JSONB indexes require GIN indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_players_quests_gin ON players USING GIN (quests);

-- Achievement indexes
CREATE INDEX IF NOT EXISTS idx_players_achievements_gin ON players USING GIN (achievements);

-- Battle pass indexes
CREATE INDEX IF NOT EXISTS idx_players_battle_pass_gin ON players USING GIN (battle_pass);

-- Guild indexes
CREATE INDEX IF NOT EXISTS idx_guilds_leader_id ON guilds(leader_id);
CREATE INDEX IF NOT EXISTS idx_guilds_name ON guilds(name);

-- Quest definition indexes
CREATE INDEX IF NOT EXISTS idx_quest_definitions_category ON quest_definitions(category);
CREATE INDEX IF NOT EXISTS idx_quest_definitions_level ON quest_definitions(level);
CREATE INDEX IF NOT EXISTS idx_quest_definitions_repeatable ON quest_definitions(repeatable);

-- Battle pass season indexes
CREATE INDEX IF NOT EXISTS idx_battle_pass_seasons_season ON battle_pass_seasons(season);
CREATE INDEX IF NOT EXISTS idx_battle_pass_seasons_dates ON battle_pass_seasons(start_date, end_date);

-- Game events indexes (additional)
CREATE INDEX IF NOT EXISTS idx_game_events_type_timestamp ON game_events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_game_events_player_timestamp ON game_events(player_id, timestamp);

-- Housing indexes (additional)
CREATE INDEX IF NOT EXISTS idx_housing_level ON housing(level);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_players_guild_level ON players(guild_id, level);
CREATE INDEX IF NOT EXISTS idx_players_level_credits ON players(level, credits);

