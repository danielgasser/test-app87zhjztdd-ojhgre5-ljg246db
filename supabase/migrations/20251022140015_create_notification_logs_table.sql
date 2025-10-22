-- Migration: Add notification_logs table for rate limiting
-- Description: Track sent notifications to prevent spam and enable analytics

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES routes(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for fast lookups
CREATE INDEX idx_notification_logs_user_route 
  ON notification_logs(user_id, route_id, sent_at DESC);

CREATE INDEX idx_notification_logs_type_time 
  ON notification_logs(notification_type, sent_at DESC);

CREATE INDEX idx_notification_logs_user_time 
  ON notification_logs(user_id, sent_at DESC);

-- Add RLS policies
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notification logs
CREATE POLICY "Users can read own notification logs"
  ON notification_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert notification logs (for Edge Functions)
CREATE POLICY "Service role can insert notification logs"
  ON notification_logs
  FOR INSERT
  WITH CHECK (true);

-- Add cleanup function to delete old logs (optional - keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM notification_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
END;
$$;

-- Optional: Create a scheduled job to run cleanup weekly
-- (Uncomment if you want automatic cleanup)
-- SELECT cron.schedule(
--   'cleanup-notification-logs',
--   '0 2 * * 0', -- Every Sunday at 2 AM
--   'SELECT cleanup_old_notification_logs();'
-- );

COMMENT ON TABLE notification_logs IS 'Tracks sent push notifications for rate limiting and analytics';
COMMENT ON COLUMN notification_logs.user_id IS 'User who received the notification';
COMMENT ON COLUMN notification_logs.route_id IS 'Route associated with the notification (if applicable)';
COMMENT ON COLUMN notification_logs.notification_type IS 'Type of notification (e.g., route_safety_alert, weekly_digest)';
COMMENT ON COLUMN notification_logs.sent_at IS 'When the notification was sent';
COMMENT ON COLUMN notification_logs.review_ids IS 'Array of review IDs that triggered this notification';
COMMENT ON COLUMN notification_logs.metadata IS 'Additional notification metadata (batch_size, etc.)';