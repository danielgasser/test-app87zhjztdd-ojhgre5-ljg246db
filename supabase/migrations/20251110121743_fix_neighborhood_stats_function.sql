-- Fix column name mismatch: state -> state_code
-- Migration: fix_neighborhood_stats_function
-- Created: 2025-11-10

DROP FUNCTION IF EXISTS get_neighborhood_stats_for_point(DOUBLE PRECISION, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION get_neighborhood_stats_for_point(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS TABLE(
  block_group_fips CHAR(12),
  name TEXT,
  city TEXT,
  state_code CHAR(2),  -- Fixed: was "state"
  population INTEGER,
  crime_rate_per_1000 NUMERIC,
  violent_crime_rate NUMERIC,
  property_crime_rate NUMERIC,
  hate_crime_incidents INTEGER,
  diversity_index NUMERIC,
  pct_minority NUMERIC,
  walkability_score INTEGER,
  police_response_min NUMERIC,
  data_source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ns.block_group_fips,
    ns.name,
    ns.city,
    ns.state_code,  -- Fixed: was "ns.state"
    ns.population,
    ns.crime_rate_per_1000,
    ns.violent_crime_rate,
    ns.property_crime_rate,
    ns.hate_crime_incidents,
    ns.diversity_index,
    ns.pct_minority,
    ns.walkability_score,
    ns.police_response_min,
    ns.data_source
  FROM neighborhood_stats ns
  WHERE ST_Contains(ns.boundary::geometry, ST_MakePoint(lng, lat)::geometry)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION get_neighborhood_stats_for_point IS 
'Returns neighborhood statistics for a given coordinate point. Uses spatial containment query.';