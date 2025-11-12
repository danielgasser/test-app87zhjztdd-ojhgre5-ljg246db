-- Table to track votes on ML predictions and statistical data
-- Supports both database locations and temporary Google Place locations
CREATE TABLE prediction_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  google_place_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('accurate', 'inaccurate')),
  prediction_source text NOT NULL CHECK (prediction_source IN ('ml_prediction', 'statistics', 'cold_start', 'community_reviews')),
  predicted_safety_score numeric NOT NULL,
  user_demographics jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  -- Must have either location_id OR google_place_id, but not both
  CONSTRAINT prediction_votes_identifier_check 
    CHECK (
      (location_id IS NOT NULL AND google_place_id IS NULL) OR
      (location_id IS NULL AND google_place_id IS NOT NULL)
    )
);

-- Unique constraint for database locations
CREATE UNIQUE INDEX prediction_votes_location_user_unique 
ON prediction_votes(location_id, user_id) 
WHERE location_id IS NOT NULL;

-- Unique constraint for Google Place locations
CREATE UNIQUE INDEX prediction_votes_google_place_user_unique 
ON prediction_votes(google_place_id, user_id) 
WHERE google_place_id IS NOT NULL;

-- Add indexes for performance
CREATE INDEX idx_prediction_votes_location ON prediction_votes(location_id);
CREATE INDEX idx_prediction_votes_google_place ON prediction_votes(google_place_id);
CREATE INDEX idx_prediction_votes_user ON prediction_votes(user_id);
CREATE INDEX idx_prediction_votes_source ON prediction_votes(prediction_source);