-- Create function to get user activity statistics
-- Returns review count and route count for a given user
CREATE OR REPLACE FUNCTION public.get_user_activity_stats(
  p_user_id uuid
)
RETURNS TABLE(
  review_count integer,
  route_count integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (
      SELECT COUNT(*)::integer 
      FROM reviews r 
      WHERE r.user_id = p_user_id 
        AND r.status = 'active'
    ) as review_count,
    (
      SELECT COUNT(*)::integer 
      FROM routes rt 
      WHERE rt.user_id = p_user_id
    ) as route_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_user_activity_stats(uuid) IS 'Returns the count of active reviews and routes for a given user';