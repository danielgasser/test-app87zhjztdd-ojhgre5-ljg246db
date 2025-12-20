-- Migration: add_legal_acceptance_to_profiles
-- Add columns to profiles table (not user_profiles)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location_disclosure_accepted_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN profiles.terms_accepted_at IS 
'Timestamp when user accepted Terms of Service and Privacy Policy';

COMMENT ON COLUMN profiles.location_disclosure_accepted_at IS 
'Timestamp when user acknowledged location permission disclosure';

ALTER TABLE user_profiles DROP COLUMN IF EXISTS terms_accepted_at;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS location_disclosure_accepted_at;

NOTIFY pgrst, 'reload schema';