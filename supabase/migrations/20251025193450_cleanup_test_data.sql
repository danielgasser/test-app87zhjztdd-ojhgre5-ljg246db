-- ============================================
-- SafePath - Cleanup All Test Data
-- ============================================
-- This migration removes all test data to start fresh
-- Order matters due to foreign key constraints

-- 1. Delete all reviews (cascades to review_votes automatically)
DELETE FROM reviews;

-- 2. Delete all safety_scores
DELETE FROM safety_scores;

-- 3. Delete all routes (cascades to route_segments automatically)
DELETE FROM routes;

-- 4. Delete all locations
DELETE FROM locations;

-- 5. Delete all user_profiles
DELETE FROM user_profiles;

-- 6. Delete all users from auth.users
-- Note: This uses Supabase auth schema
DELETE FROM auth.users;

-- 7. Optional: Drop the unused ml_training_data table
DROP TABLE IF EXISTS ml_training_data CASCADE;

-- Verify cleanup
DO $$
BEGIN
  RAISE NOTICE 'Cleanup complete. Remaining records:';
  RAISE NOTICE '  Users: %', (SELECT COUNT(*) FROM auth.users);
  RAISE NOTICE '  Locations: %', (SELECT COUNT(*) FROM locations);
  RAISE NOTICE '  Reviews: %', (SELECT COUNT(*) FROM reviews);
  RAISE NOTICE '  Routes: %', (SELECT COUNT(*) FROM routes);
  RAISE NOTICE '  Safety Scores: %', (SELECT COUNT(*) FROM safety_scores);
END $$;