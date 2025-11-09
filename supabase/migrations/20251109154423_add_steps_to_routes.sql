-- Add steps column to routes table
ALTER TABLE routes 
ADD COLUMN IF NOT EXISTS steps JSONB;

-- Add comment for documentation
COMMENT ON COLUMN routes.steps IS 'Turn-by-turn navigation steps from Google Maps API';