-- Add preferences column to user_profiles
-- Migration: add_search_radius_preference
-- Created: 2025-11-03

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}'::jsonb;

-- Add index for preferences queries (optional, for performance)
CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences 
ON user_profiles USING gin (preferences);

-- Add comment
COMMENT ON COLUMN user_profiles.preferences IS 
'User preference settings stored as JSON. Structure: {"routing": {...}, "search": {"radius_km": 10}, "display": {...}}';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'preferences';