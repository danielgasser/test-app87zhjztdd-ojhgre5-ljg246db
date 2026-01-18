-- Migration: Fix overly permissive RLS policies
-- 1. Remove unnecessary INSERT/UPDATE policies on safety_scores and neighborhood_stats
-- 2. Remove unnecessary INSERT policy on email_signups (Edge Function uses service role)
-- 3. Tighten prediction_votes policy to ensure users can only vote as themselves
-- Created: 2025-01-07

-- ============================================================================
-- DROP PERMISSIVE POLICIES: safety_scores & neighborhood_stats
-- (Edge Functions use service_role which bypasses RLS)
-- ============================================================================

DROP POLICY IF EXISTS "Allow stats insert" ON public.neighborhood_stats;
DROP POLICY IF EXISTS "Allow stats updates" ON public.neighborhood_stats;
DROP POLICY IF EXISTS "Allow safety score calculation" ON public.safety_scores;
DROP POLICY IF EXISTS "Allow safety score updates" ON public.safety_scores;

-- ============================================================================
-- DROP PERMISSIVE POLICY: email_signups
-- (website-signup Edge Function uses service_role)
-- ============================================================================

DROP POLICY IF EXISTS "Allow public inserts" ON public.email_signups;

-- ============================================================================
-- FIX POLICY: prediction_votes
-- (vote-prediction Edge Function uses anon key with user JWT)
-- Users should only be able to insert/update their own votes
-- ============================================================================

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.prediction_votes;

CREATE POLICY "Users can insert own votes"
ON public.prediction_votes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also add UPDATE policy so users can change their votes
DROP POLICY IF EXISTS "Users can update own votes" ON public.prediction_votes;

CREATE POLICY "Users can update own votes"
ON public.prediction_votes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy so users can remove their votes
DROP POLICY IF EXISTS "Users can delete own votes" ON public.prediction_votes;

CREATE POLICY "Users can delete own votes"
ON public.prediction_votes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- ENSURE SELECT POLICIES EXIST
-- ============================================================================

-- safety_scores: public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'safety_scores' 
    AND policyname = 'Allow public read access to safety scores'
  ) THEN
    CREATE POLICY "Allow public read access to safety scores"
    ON public.safety_scores
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- neighborhood_stats: public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'neighborhood_stats' 
    AND policyname = 'Allow public read access to neighborhood stats'
  ) THEN
    CREATE POLICY "Allow public read access to neighborhood stats"
    ON public.neighborhood_stats
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- prediction_votes: users can read all votes (for displaying vote counts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'prediction_votes' 
    AND policyname = 'Allow public read access to prediction votes'
  ) THEN
    CREATE POLICY "Allow public read access to prediction votes"
    ON public.prediction_votes
    FOR SELECT
    USING (true);
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.safety_scores IS 'Safety scores calculated by Edge Functions. Read-only for users, write access via service_role only.';
COMMENT ON TABLE public.neighborhood_stats IS 'Neighborhood statistics updated by admin. Read-only for users, write access via service_role only.';
COMMENT ON TABLE public.email_signups IS 'Email signups from website. Write access via service_role only (website-signup Edge Function).';
COMMENT ON TABLE public.prediction_votes IS 'User votes on ML prediction accuracy. Users can only manage their own votes.';