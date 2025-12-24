-- Drop and recreate to use actual neighborhood_stats table
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
  -- Find the census block group that contains this point
  SELECT json_build_object(
    'block_group_fips', ns.block_group_fips,
    'name', ns.name,
    'city', ns.city,
    'county_name', ns.county_name,
    'state_code', ns.state_code,
    'population', ns.population,
    'diversity_index', ns.diversity_index,
    'pct_minority', ns.pct_minority,
    'crime_rate_per_1000', ns.crime_rate_per_1000,
    'violent_crime_rate', ns.violent_crime_rate,
    'property_crime_rate', ns.property_crime_rate,
    'hate_crime_incidents', ns.hate_crime_incidents,
    'walkability_score', ns.walkability_score,
    'data_source', ns.data_source,
    'data_year', ns.data_year
  ) INTO v_result
  FROM neighborhood_stats ns
  WHERE ST_Contains(
    ns.boundary::geometry,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
  )
  LIMIT 1;

  RETURN v_result;
END;
$$;