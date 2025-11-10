-- Add missing columns to match Excel template
ALTER TABLE neighborhood_stats 
ADD COLUMN name TEXT,
ADD COLUMN notes TEXT;

-- Add comment
COMMENT ON COLUMN neighborhood_stats.name IS 'Human-readable name (e.g., Block Group 1, Tract 1.01)';
COMMENT ON COLUMN neighborhood_stats.notes IS 'Additional context or warnings about the data';