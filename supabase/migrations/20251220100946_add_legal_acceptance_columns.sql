-- Migration: add_legal_acceptance_columns
-- Add columns to track Terms and Location Disclosure acceptance

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location_disclosure_accepted_at TIMESTAMPTZ DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN user_profiles.terms_accepted_at IS 
'Timestamp when user accepted Terms of Service and Privacy Policy';

COMMENT ON COLUMN user_profiles.location_disclosure_accepted_at IS 
'Timestamp when user acknowledged location permission disclosure';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';