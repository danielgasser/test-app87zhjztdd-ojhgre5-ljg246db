-- Migration: Per-user API rate limiting for Edge Functions
-- Strategy: Sliding window via Postgres atomic function
-- Each request is logged as a timestamp; old entries outside the window are pruned atomically.

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name TEXT        NOT NULL,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index for fast per-user/per-function window lookups
CREATE INDEX idx_api_rate_limits_user_function_time
  ON public.api_rate_limits(user_id, function_name, requested_at DESC);

-- RLS: users cannot read or manipulate their own rate limit records
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- No user-facing policies — Edge Functions use service role only
-- This prevents any client from reading or spoofing their own records

-- ============================================================
-- Atomic sliding window check-and-record function
-- Returns: allowed (bool), current_count (int), limit_max (int)
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
  p_user_id       UUID,
  p_function_name TEXT,
  p_limit         INT,
  p_window_seconds INT
)
RETURNS TABLE(allowed BOOLEAN, current_count INT, limit_max INT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count        INT;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Prune expired entries for this user+function outside the window
  DELETE FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND requested_at < v_window_start;

  -- Count remaining requests within the window
  SELECT COUNT(*) INTO v_count
  FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND function_name = p_function_name
    AND requested_at >= v_window_start;

  -- If under limit, record this request
  IF v_count < p_limit THEN
    INSERT INTO public.api_rate_limits(user_id, function_name)
    VALUES (p_user_id, p_function_name);

    RETURN QUERY SELECT true, v_count + 1, p_limit;
  ELSE
    RETURN QUERY SELECT false, v_count, p_limit;
  END IF;
END;
$$;