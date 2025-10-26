-- ============================================
-- SafePath - Create Diverse Test Users
-- ============================================

-- Insert test users into auth.users first

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
) VALUES
  -- User 1: Asian, Female, LGBTQ+, Buddhist
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'maya.chen@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 2: Black, Male, Christian
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'marcus.williams@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 3: Hispanic/Latino, Non-Binary, LGBTQ+, None
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'alex.rodriguez@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 4: Middle Eastern, Female, Muslim
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'fatima.hassan@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 5: Caucasian, Male, Jewish
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'david.goldstein@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 6: Mixed Race (Asian + Caucasian), Female, Hindu
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'priya.kumar@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 7: Native American, Male, Other religion
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'joseph.running-bear@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 8: Pacific Islander, Transgender, LGBTQ+, Christian
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'kai.patel@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 9: Black/African American, Female, None, with disability
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000', 'aisha.jones@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 10: Caucasian, Female, LGBTQ+, Jewish, with disability
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'sarah.cohen@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 11: Hispanic/Latino + Native American, Male, Sikh
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'raj.garcia@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 12: Asian, Male, None, Older adult
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'ken.tanaka@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 13: Middle Eastern + Caucasian, Other gender, LGBTQ+, Muslim
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', 'rami.smith@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 14: Black/African American, Male, Christian, Young adult
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000000', 'tyrone.jackson@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated'),
  
  -- User 15: Caucasian, Female, Buddhist
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000000', 'emma.walker@test.com', 
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', NOW(), NOW(), NOW(), 
   '{"provider":"email","providers":["email"]}', '{}', 'authenticated', 'authenticated');

-- Now insert user_profiles for each user
INSERT INTO user_profiles (
  id,
  full_name,
  race_ethnicity,
  gender,
  lgbtq_status,
  disability_status,
  religion,
  age_range,
  show_demographics,
  privacy_level
) VALUES
  -- User 1: Asian, Female, LGBTQ+, Buddhist, 25-34
  ('11111111-1111-1111-1111-111111111111', 'Maya Chen', 
   ARRAY['Asian'], 'Female', true, ARRAY[]::text[], 'Buddhist', '25-34', true, 'public'),
  
  -- User 2: Black, Male, Christian, 35-44
  ('22222222-2222-2222-2222-222222222222', 'Marcus Williams', 
   ARRAY['Black/African American'], 'Male', false, ARRAY[]::text[], 'Christian', '35-44', true, 'public'),
  
  -- User 3: Hispanic/Latino, Non-Binary, LGBTQ+, None, 18-24
  ('33333333-3333-3333-3333-333333333333', 'Alex Rodriguez', 
   ARRAY['Hispanic/Latino'], 'Non-Binary', true, ARRAY[]::text[], 'None', '18-24', true, 'public'),
  
  -- User 4: Middle Eastern, Female, Muslim, 25-34
  ('44444444-4444-4444-4444-444444444444', 'Fatima Hassan', 
   ARRAY['Middle Eastern'], 'Female', false, ARRAY[]::text[], 'Muslim', '25-34', true, 'public'),
  
  -- User 5: Caucasian, Male, Jewish, 45-54
  ('55555555-5555-5555-5555-555555555555', 'David Goldstein', 
   ARRAY['Caucasian'], 'Male', false, ARRAY[]::text[], 'Jewish', '45-54', true, 'public'),
  
  -- User 6: Mixed Race (Asian + Caucasian), Female, Hindu, 25-34
  ('66666666-6666-6666-6666-666666666666', 'Priya Kumar', 
   ARRAY['Asian', 'Caucasian'], 'Female', false, ARRAY[]::text[], 'Hindu', '25-34', true, 'public'),
  
  -- User 7: Native American, Male, Other religion, 35-44
  ('77777777-7777-7777-7777-777777777777', 'Joseph Running Bear', 
   ARRAY['Native American'], 'Male', false, ARRAY[]::text[], 'Other', '35-44', true, 'public'),
  
  -- User 8: Pacific Islander, Transgender, LGBTQ+, Christian, 25-34
  ('88888888-8888-8888-8888-888888888888', 'Kai Patel', 
   ARRAY['Pacific Islander'], 'Transgender', true, ARRAY[]::text[], 'Christian', '25-34', true, 'public'),
  
  -- User 9: Black/African American, Female, None, with disability (mobility), 25-34
  ('99999999-9999-9999-9999-999999999999', 'Aisha Jones', 
   ARRAY['Black/African American'], 'Female', false, ARRAY['Mobility'], 'None', '25-34', true, 'public'),
  
  -- User 10: Caucasian, Female, LGBTQ+, Jewish, with disability (hearing), 35-44
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sarah Cohen', 
   ARRAY['Caucasian'], 'Female', true, ARRAY['Hearing'], 'Jewish', '35-44', true, 'public'),
  
  -- User 11: Hispanic/Latino + Native American, Male, Sikh, 25-34
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Raj Garcia', 
   ARRAY['Hispanic/Latino', 'Native American'], 'Male', false, ARRAY[]::text[], 'Sikh', '25-34', true, 'public'),
  
  -- User 12: Asian, Male, None, 55-64
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Ken Tanaka', 
   ARRAY['Asian'], 'Male', false, ARRAY[]::text[], 'None', '55-64', true, 'public'),
  
  -- User 13: Middle Eastern + Caucasian, Other gender, LGBTQ+, Muslim, 18-24
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Rami Smith', 
   ARRAY['Middle Eastern', 'Caucasian'], 'Other', true, ARRAY[]::text[], 'Muslim', '18-24', true, 'public'),
  
  -- User 14: Black/African American, Male, Christian, 18-24
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Tyrone Jackson', 
   ARRAY['Black/African American'], 'Male', false, ARRAY[]::text[], 'Christian', '18-24', true, 'public'),
  
  -- User 15: Caucasian, Female, Buddhist, 25-34
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Emma Walker', 
   ARRAY['Caucasian'], 'Female', false, ARRAY[]::text[], 'Buddhist', '25-34', true, 'public');

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Created % test users', (SELECT COUNT(*) FROM auth.users);
  RAISE NOTICE 'Created % user profiles', (SELECT COUNT(*) FROM user_profiles);
END $$;