-- Table to track votes on ML predictions and statistical data
CREATE TABLE prediction_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid REFERENCES locations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('accurate', 'inaccurate')),
  prediction_source text NOT NULL CHECK (prediction_source IN ('ml_prediction', 'statistics', 'cold_start')),
  predicted_safety_score numeric NOT NULL,
  user_demographics jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(location_id, user_id)
);

-- Add indexes for performance
CREATE INDEX idx_prediction_votes_location ON prediction_votes(location_id);
CREATE INDEX idx_prediction_votes_user ON prediction_votes(user_id);
CREATE INDEX idx_prediction_votes_source ON prediction_votes(prediction_source);