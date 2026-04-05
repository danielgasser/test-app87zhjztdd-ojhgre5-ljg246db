-- Migration: Restrict safety_scores INSERT and UPDATE to service_role only.
-- These rows are written exclusively by DB triggers running as SECURITY DEFINER,
-- which execute under the postgres/service role and bypass RLS entirely.
-- Authenticated users have no legitimate reason to write safety scores directly.

DROP POLICY IF EXISTS "Allow safety score calculation from triggers" ON public.safety_scores;
DROP POLICY IF EXISTS "Allow safety score updates from triggers" ON public.safety_scores;

-- No replacement policies needed — triggers bypass RLS via SECURITY DEFINER.
-- Read access is preserved by the existing SELECT policy.