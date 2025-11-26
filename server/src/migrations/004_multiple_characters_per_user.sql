-- Migration 004: Support Multiple Characters Per User
-- This migration modifies the schema to allow users to have multiple characters
-- Each character gets a unique ID, and we track which user (Firebase UID) owns it

-- Step 1: Add user_id column to track the Firebase UID (account owner)
ALTER TABLE players 
  ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- Step 2: For existing players, set user_id = id (backwards compatibility)
-- This assumes existing players were using Firebase UID as their player ID
UPDATE players 
  SET user_id = id 
  WHERE user_id IS NULL;

-- Step 3: Create a new character_id column that will become the new primary key
-- We'll use UUIDs for character IDs
ALTER TABLE players 
  ADD COLUMN IF NOT EXISTS character_id VARCHAR(255);

-- Step 4: Generate character IDs for existing players (using id as base + UUID suffix)
-- For new players, character_id will be generated during creation
UPDATE players 
  SET character_id = id || '_' || gen_random_uuid()::text
  WHERE character_id IS NULL;

-- Step 5: Make user_id NOT NULL now that we've populated it
ALTER TABLE players 
  ALTER COLUMN user_id SET NOT NULL;

-- Step 6: Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);
CREATE INDEX IF NOT EXISTS idx_players_character_id ON players(character_id);
CREATE INDEX IF NOT EXISTS idx_players_user_id_last_login ON players(user_id, last_login DESC);

-- Step 7: Drop the unique constraint on player name (now names can repeat across different users)
-- But keep names unique per user (we'll enforce this at application level)
ALTER TABLE players 
  DROP CONSTRAINT IF EXISTS unique_player_name;

-- Note: Character names should still be unique per user, but we'll enforce this
-- in application logic rather than database constraints to allow flexibility

-- Step 8: Update housing table to reference character_id instead of player_id
-- For now, we'll keep it as is and update the foreign key later if needed
-- The housing table can remain linked to character_id

-- Step 9: Update guild leader_id and member_ids to use character_id
-- This is more complex and may require data migration in application code
-- For now, guilds will reference character_id

-- Note: The old 'id' column will continue to exist for backwards compatibility
-- but new characters should use character_id as the primary identifier
-- We'll eventually migrate fully to character_id as primary key in a future migration

