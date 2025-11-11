-- Function to get user vote statistics
CREATE OR REPLACE FUNCTION public.get_user_vote_stats(
  p_user_id uuid
)
RETURNS TABLE(
  helpful_votes_given integer,
  unhelpful_votes_given integer,
  total_votes_given integer
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'helpful')::integer as helpful_votes_given,
    COUNT(*) FILTER (WHERE vote_type = 'unhelpful')::integer as unhelpful_votes_given,
    COUNT(*)::integer as total_votes_given
  FROM review_votes
  WHERE user_id = p_user_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_vote_stats(uuid) IS 'Returns the count of helpful and unhelpful votes given by a user';