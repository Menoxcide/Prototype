-- Add dungeon-related tables
-- Run this migration to add dungeon persistence support

-- Dungeon progress table
CREATE TABLE IF NOT EXISTS dungeon_progress (
  id VARCHAR(255) PRIMARY KEY,
  player_id VARCHAR(255) NOT NULL,
  dungeon_id VARCHAR(255) NOT NULL,
  current_floor INTEGER NOT NULL DEFAULT 0,
  rooms_cleared JSONB NOT NULL DEFAULT '[]',
  entities_defeated JSONB NOT NULL DEFAULT '[]',
  started_at BIGINT NOT NULL,
  completed_at BIGINT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dungeon_progress_player_id ON dungeon_progress(player_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_progress_dungeon_id ON dungeon_progress(dungeon_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_progress_completed_at ON dungeon_progress(completed_at);

-- Dungeon completions table (for tracking completion history)
CREATE TABLE IF NOT EXISTS dungeon_completions (
  id VARCHAR(255) PRIMARY KEY,
  player_id VARCHAR(255) NOT NULL,
  dungeon_id VARCHAR(255) NOT NULL,
  seed BIGINT NOT NULL,
  difficulty INTEGER NOT NULL,
  level INTEGER NOT NULL,
  completed_at BIGINT NOT NULL,
  rewards JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dungeon_completions_player_id ON dungeon_completions(player_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_completions_dungeon_id ON dungeon_completions(dungeon_id);
CREATE INDEX IF NOT EXISTS idx_dungeon_completions_completed_at ON dungeon_completions(completed_at);

