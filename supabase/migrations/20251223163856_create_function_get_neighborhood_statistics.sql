-- Function to get neighborhood statistics
CREATE OR REPLACE FUNCTION get_neighborhood_stats(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_radius_meters INTEGER DEFAULT 500
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_locations', COUNT(DISTINCT l.id),
    'total_reviews', COALESCE(SUM(l.review_count), 0),
    'average_rating', ROUND(AVG(l.average_rating)::numeric, 2),
    'rating_distribution', json_build_object(
      'safe', COUNT(DISTINCT CASE WHEN l.average_rating >= 4 THEN l.id END),
      'mixed', COUNT(DISTINCT CASE WHEN l.average_rating >= 3 AND l.average_rating < 4 THEN l.id END),
      'unsafe', COUNT(DISTINCT CASE WHEN l.average_rating < 3 AND l.average_rating IS NOT NULL THEN l.id END),
      'unrated', COUNT(DISTINCT CASE WHEN l.average_rating IS NULL OR l.review_count = 0 THEN l.id END)
    ),
    'place_types', (
      SELECT json_agg(json_build_object('type', place_type, 'count', cnt))
      FROM (
        SELECT place_type, COUNT(*) as cnt
        FROM locations
        WHERE ST_DWithin(
          coordinates::geography,
          ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
          p_radius_meters
        )
        AND place_type IS NOT NULL
        GROUP BY place_type
        ORDER BY cnt DESC
        LIMIT 5
      ) pt
    ),
    'recent_reviews_count', (
      SELECT COUNT(*)
      FROM reviews r
      JOIN locations l ON r.location_id = l.id
      WHERE ST_DWithin(
        l.coordinates::geography,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        p_radius_meters
      )
      AND r.created_at > NOW() - INTERVAL '30 days'
    )
  ) INTO v_result
  FROM locations l
  WHERE ST_DWithin(
    l.coordinates::geography,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
    p_radius_meters
  );

  RETURN COALESCE(v_result, json_build_object(
    'total_locations', 0,
    'total_reviews', 0,
    'average_rating', null,
    'rating_distribution', json_build_object('safe', 0, 'mixed', 0, 'unsafe', 0, 'unrated', 0),
    'place_types', '[]'::json,
    'recent_reviews_count', 0
  ));
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION get_neighborhood_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_neighborhood_stats TO anon;