ALTER TABLE user_profiles
ALTER COLUMN trial_expires_at TYPE JSONB
USING CASE
  WHEN trial_expires_at IS NULL THEN NULL
  ELSE jsonb_build_object('advancedFilters', trial_expires_at::text)
END;