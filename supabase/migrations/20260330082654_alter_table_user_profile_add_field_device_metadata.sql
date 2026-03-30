-- Migration: add_device_metadata_to_user_profiles
-- JSONB column for technical/device info (platform, OS version, app version, etc.)

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS device_metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_profiles.device_metadata IS
'Technical device information: {platform, os_version, app_version, ...}';

NOTIFY pgrst, 'reload schema';