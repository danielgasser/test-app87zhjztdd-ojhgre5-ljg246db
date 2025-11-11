-- Add vote counts to safety_scores table
ALTER TABLE safety_scores 
ADD COLUMN IF NOT EXISTS accurate_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS inaccurate_count integer DEFAULT 0;