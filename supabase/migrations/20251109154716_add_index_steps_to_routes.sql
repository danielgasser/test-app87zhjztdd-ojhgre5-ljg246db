-- Add index for better query performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_routes_steps 
ON routes USING GIN (steps);