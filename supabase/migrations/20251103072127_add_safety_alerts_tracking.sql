-- Add navigation session tracking and safety alerts handling to routes table

-- Add new columns
ALTER TABLE routes 
ADD COLUMN navigation_session_id uuid,
ADD COLUMN safety_alerts_handled jsonb DEFAULT '[]'::jsonb;

-- Add index for faster session queries
CREATE INDEX idx_routes_navigation_session ON routes(navigation_session_id)
WHERE navigation_session_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN routes.safety_alerts_handled IS 
'Array of safety alerts shown and handled during this route. Each entry: {review_id, handled_at, action, review_location, review_safety_rating}';

COMMENT ON COLUMN routes.navigation_session_id IS
'Groups routes that are part of the same navigation session. When rerouting, new routes preserve the same session_id.';