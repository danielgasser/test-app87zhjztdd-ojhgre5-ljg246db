CREATE OR REPLACE FUNCTION get_location_time_safety(
  p_location_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'morning', json_build_object(
      'avg_safety', ROUND(AVG(CASE WHEN time_of_day = 'morning' THEN safety_rating END)::numeric, 1),
      'review_count', COUNT(CASE WHEN time_of_day = 'morning' THEN 1 END)
    ),
    'afternoon', json_build_object(
      'avg_safety', ROUND(AVG(CASE WHEN time_of_day = 'afternoon' THEN safety_rating END)::numeric, 1),
      'review_count', COUNT(CASE WHEN time_of_day = 'afternoon' THEN 1 END)
    ),
    'evening', json_build_object(
      'avg_safety', ROUND(AVG(CASE WHEN time_of_day = 'evening' THEN safety_rating END)::numeric, 1),
      'review_count', COUNT(CASE WHEN time_of_day = 'evening' THEN 1 END)
    ),
    'night', json_build_object(
      'avg_safety', ROUND(AVG(CASE WHEN time_of_day = 'night' THEN safety_rating END)::numeric, 1),
      'review_count', COUNT(CASE WHEN time_of_day = 'night' THEN 1 END)
    ),
    'total_with_time', COUNT(time_of_day)
  ) INTO v_result
  FROM reviews
  WHERE location_id = p_location_id
    AND status = 'active';

  RETURN v_result;
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_location_time_safety TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_time_safety TO anon;