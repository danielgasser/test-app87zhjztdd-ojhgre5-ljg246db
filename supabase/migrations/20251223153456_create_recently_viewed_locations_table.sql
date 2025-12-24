-- Migration: create_recently_viewed_locations_table
-- Created: 2024-12-23

CREATE TABLE recently_viewed_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
  google_place_id TEXT,
  name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique per user + location (either by location_id or google_place_id)
  CONSTRAINT recently_viewed_unique_location 
    UNIQUE (user_id, location_id),
  CONSTRAINT recently_viewed_unique_google_place 
    UNIQUE (user_id, google_place_id)
);

-- Enable RLS
ALTER TABLE recently_viewed_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recently viewed"
  ON recently_viewed_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recently viewed"
  ON recently_viewed_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recently viewed"
  ON recently_viewed_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recently viewed"
  ON recently_viewed_locations FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast user lookups, ordered by recency
CREATE INDEX idx_recently_viewed_user_recent 
  ON recently_viewed_locations(user_id, viewed_at DESC);

COMMENT ON TABLE recently_viewed_locations IS 'Track recently viewed locations for premium users';
