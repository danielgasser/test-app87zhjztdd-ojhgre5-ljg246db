-- Add notification_preferences column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN notification_preferences JSONB DEFAULT '{
  "safety_alerts": true,
  "community_updates": true,
  "review_responses": true,
  "route_safety_changes": true,
  "weekly_digest": false,
  "location_triggers": false,
  "travel_reminders": false
}'::jsonb;

-- Add comment
COMMENT ON COLUMN user_profiles.notification_preferences IS 'User notification preferences stored as JSON';