-- Migration 002: Add Firebase Authentication Support
-- Adds unique constraint on player names to prevent duplicates

-- Add unique constraint on player names (one character name per user)
-- Since id is now Firebase UID, each user can only have one character
ALTER TABLE players 
  ADD CONSTRAINT unique_player_name UNIQUE (name);

-- Add index on id for faster Firebase UID lookups (should already be primary key, but ensure it exists)
-- CREATE INDEX IF NOT EXISTS idx_players_id ON players(id); -- Already primary key, no need

-- Note: The 'id' column now stores Firebase UID instead of sessionId
-- This ensures persistent player identity across sessions

