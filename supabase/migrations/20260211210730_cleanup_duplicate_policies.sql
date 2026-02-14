-- Clean up true duplicate policies only

-- prediction_votes: Remove old-style duplicates, keep the newer authenticated ones
DROP POLICY IF EXISTS "Users can delete their own votes" ON public.prediction_votes;
DROP POLICY IF EXISTS "Users can change their own votes" ON public.prediction_votes;
DROP POLICY IF EXISTS "Votes are viewable by everyone" ON public.prediction_votes;

-- neighborhood_stats: Remove duplicate SELECT policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.neighborhood_stats;

-- safety_scores: Remove duplicate SELECT policy
DROP POLICY IF EXISTS "Safety scores are viewable by everyone" ON public.safety_scores;

-- notification_logs: Fix security issue - should be service_role only
DROP POLICY IF EXISTS "Service role can insert notification logs" ON public.notification_logs;

CREATE POLICY "Service role can insert notification logs"
ON public.notification_logs
FOR INSERT
TO service_role
WITH CHECK (true);