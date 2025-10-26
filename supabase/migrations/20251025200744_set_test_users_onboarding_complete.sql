-- ============================================
-- SafePath - Mark Test Users as Onboarded with Demographics
-- ============================================

-- Create or update profiles table entries for test users
-- with their demographic data in JSONB format

INSERT INTO profiles (
  id,
  user_id,
  onboarding_complete,
  demographics,
  created_at,
  updated_at
) VALUES
  -- User 1: Maya Chen - Asian, Female, LGBTQ+, Buddhist
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', true, 
   '{"full_name": "Maya Chen", "race_ethnicity": ["Asian"], "gender": "Female", "lgbtq_status": true, "disability_status": [], "religion": "Buddhist", "age_range": "25-34", "privacy_level": "public", "show_demographics": true}'::jsonb, 
   NOW(), NOW()),
  
  -- User 2: Marcus Williams - Black, Male, Christian
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', true,
   '{"full_name": "Marcus Williams", "race_ethnicity": ["Black/African American"], "gender": "Male", "lgbtq_status": false, "disability_status": [], "religion": "Christian", "age_range": "35-44", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 3: Alex Rodriguez - Hispanic/Latino, Non-Binary, LGBTQ+, None
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', true,
   '{"full_name": "Alex Rodriguez", "race_ethnicity": ["Hispanic/Latino"], "gender": "Non-Binary", "lgbtq_status": true, "disability_status": [], "religion": "None", "age_range": "18-24", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 4: Fatima Hassan - Middle Eastern, Female, Muslim
  (gen_random_uuid(), '44444444-4444-4444-4444-444444444444', true,
   '{"full_name": "Fatima Hassan", "race_ethnicity": ["Middle Eastern"], "gender": "Female", "lgbtq_status": false, "disability_status": [], "religion": "Muslim", "age_range": "25-34", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 5: David Goldstein - Caucasian, Male, Jewish
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', true,
   '{"full_name": "David Goldstein", "race_ethnicity": ["Caucasian"], "gender": "Male", "lgbtq_status": false, "disability_status": [], "religion": "Jewish", "age_range": "45-54", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 6: Priya Kumar - Mixed Race (Asian + Caucasian), Female, Hindu
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', true,
   '{"full_name": "Priya Kumar", "race_ethnicity": ["Asian", "Caucasian"], "gender": "Female", "lgbtq_status": false, "disability_status": [], "religion": "Hindu", "age_range": "25-34", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 7: Joseph Running Bear - Native American, Male, Other religion
  (gen_random_uuid(), '77777777-7777-7777-7777-777777777777', true,
   '{"full_name": "Joseph Running Bear", "race_ethnicity": ["Native American"], "gender": "Male", "lgbtq_status": false, "disability_status": [], "religion": "Other", "age_range": "35-44", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 8: Kai Patel - Pacific Islander, Transgender, LGBTQ+, Christian
  (gen_random_uuid(), '88888888-8888-8888-8888-888888888888', true,
   '{"full_name": "Kai Patel", "race_ethnicity": ["Pacific Islander"], "gender": "Transgender", "lgbtq_status": true, "disability_status": [], "religion": "Christian", "age_range": "25-34", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 9: Aisha Jones - Black, Female, None, with disability (mobility)
  (gen_random_uuid(), '99999999-9999-9999-9999-999999999999', true,
   '{"full_name": "Aisha Jones", "race_ethnicity": ["Black/African American"], "gender": "Female", "lgbtq_status": false, "disability_status": ["Mobility"], "religion": "None", "age_range": "25-34", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 10: Sarah Cohen - Caucasian, Female, LGBTQ+, Jewish, with disability (hearing)
  (gen_random_uuid(), 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true,
   '{"full_name": "Sarah Cohen", "race_ethnicity": ["Caucasian"], "gender": "Female", "lgbtq_status": true, "disability_status": ["Hearing"], "religion": "Jewish", "age_range": "35-44", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 11: Raj Garcia - Hispanic/Latino + Native American, Male, Sikh
  (gen_random_uuid(), 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true,
   '{"full_name": "Raj Garcia", "race_ethnicity": ["Hispanic/Latino", "Native American"], "gender": "Male", "lgbtq_status": false, "disability_status": [], "religion": "Sikh", "age_range": "25-34", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 12: Ken Tanaka - Asian, Male, None
  (gen_random_uuid(), 'cccccccc-cccc-cccc-cccc-cccccccccccc', true,
   '{"full_name": "Ken Tanaka", "race_ethnicity": ["Asian"], "gender": "Male", "lgbtq_status": false, "disability_status": [], "religion": "None", "age_range": "55-64", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 13: Rami Smith - Middle Eastern + Caucasian, Other gender, LGBTQ+, Muslim
  (gen_random_uuid(), 'dddddddd-dddd-dddd-dddd-dddddddddddd', true,
   '{"full_name": "Rami Smith", "race_ethnicity": ["Middle Eastern", "Caucasian"], "gender": "Other", "lgbtq_status": true, "disability_status": [], "religion": "Muslim", "age_range": "18-24", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 14: Tyrone Jackson - Black, Male, Christian
  (gen_random_uuid(), 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true,
   '{"full_name": "Tyrone Jackson", "race_ethnicity": ["Black/African American"], "gender": "Male", "lgbtq_status": false, "disability_status": [], "religion": "Christian", "age_range": "18-24", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW()),
  
  -- User 15: Emma Walker - Caucasian, Female, Buddhist
  (gen_random_uuid(), 'ffffffff-ffff-ffff-ffff-ffffffffffff', true,
   '{"full_name": "Emma Walker", "race_ethnicity": ["Caucasian"], "gender": "Female", "lgbtq_status": false, "disability_status": [], "religion": "Buddhist", "age_range": "25-34", "privacy_level": "public", "show_demographics": true}'::jsonb,
   NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE
SET 
  onboarding_complete = EXCLUDED.onboarding_complete,
  demographics = EXCLUDED.demographics,
  updated_at = NOW();

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Test users onboarding complete with demographics';
  RAISE NOTICE 'Profiles with onboarding_complete: %', 
    (SELECT COUNT(*) FROM profiles WHERE onboarding_complete = true);
END $$;