-- ================================================================
-- SAFEPATH CRITICAL FUNCTIONS BACKUP
-- Recreated from exported JSON definitions
-- Date: July 24, 2025
-- ================================================================

-- ================================================================
-- FUNCTION 1: Calculate Location Safety Scores (THE CORE!)
-- ================================================================
CREATE OR REPLACE FUNCTION calculate_location_safety_scores(p_location_id uuid)
RETURNS void AS $$
BEGIN
  -- Delete existing scores for this location
  DELETE FROM safety_scores WHERE location_id = p_location_id;
  
  -- Calculate OVERALL scores (all users combined)
  INSERT INTO safety_scores (
    location_id, demographic_type, demographic_value,
    avg_safety_score, avg_comfort_score, avg_overall_score, review_count, last_review_date
  )
  SELECT 
    p_location_id, 'overall', null,
    AVG(r.safety_rating)::numeric,
    AVG(r.comfort_rating)::numeric, 
    AVG(r.overall_rating)::numeric,
    COUNT(*)::integer,
    MAX(r.created_at)
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id
  WHERE r.location_id = p_location_id AND r.status = 'active'
  HAVING COUNT(*) > 0;

  -- Calculate RACE/ETHNICITY specific scores
  INSERT INTO safety_scores (
    location_id, demographic_type, demographic_value,
    avg_safety_score, avg_comfort_score, avg_overall_score, review_count, last_review_date
  )
  SELECT 
    p_location_id, 'race_ethnicity', race_val,
    AVG(r.safety_rating)::numeric,
    AVG(r.comfort_rating)::numeric,
    AVG(r.overall_rating)::numeric,
    COUNT(*)::integer,
    MAX(r.created_at)
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id,
  LATERAL unnest(up.race_ethnicity) AS race_val
  WHERE r.location_id = p_location_id AND r.status = 'active'
    AND up.race_ethnicity IS NOT NULL AND array_length(up.race_ethnicity, 1) > 0
  GROUP BY race_val
  HAVING COUNT(*) > 0;

  -- Calculate GENDER specific scores  
  INSERT INTO safety_scores (
    location_id, demographic_type, demographic_value,
    avg_safety_score, avg_comfort_score, avg_overall_score, review_count, last_review_date
  )
  SELECT 
    p_location_id, 'gender', up.gender,
    AVG(r.safety_rating)::numeric,
    AVG(r.comfort_rating)::numeric,
    AVG(r.overall_rating)::numeric,
    COUNT(*)::integer,
    MAX(r.created_at)
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id
  WHERE r.location_id = p_location_id AND r.status = 'active'
    AND up.gender IS NOT NULL AND up.gender != ''
  GROUP BY up.gender
  HAVING COUNT(*) > 0;

  -- Update the locations table with overall scores
  UPDATE locations 
  SET 
    avg_safety_score = (SELECT avg_safety_score FROM safety_scores WHERE location_id = p_location_id AND demographic_type = 'overall'),
    avg_comfort_score = (SELECT avg_comfort_score FROM safety_scores WHERE location_id = p_location_id AND demographic_type = 'overall'),
    avg_overall_score = (SELECT avg_overall_score FROM safety_scores WHERE location_id = p_location_id AND demographic_type = 'overall'),
    review_count = (SELECT review_count FROM safety_scores WHERE location_id = p_location_id AND demographic_type = 'overall')
  WHERE id = p_location_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- FUNCTION 2: Get Nearby Locations (Standard)
-- ================================================================
CREATE OR REPLACE FUNCTION get_nearby_locations(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  place_type text,
  distance_meters INTEGER,
  avg_safety_score NUMERIC,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.address,
    l.place_type::text,
    ROUND(ST_Distance(l.coordinates, ST_MakePoint(lng, lat)::geography))::INTEGER as distance_meters,
    l.avg_safety_score,  -- Use the direct column
    ST_Y(l.coordinates::geometry) as latitude,
    ST_X(l.coordinates::geometry) as longitude
  FROM locations l
  WHERE ST_DWithin(l.coordinates, ST_MakePoint(lng, lat)::geography, radius_meters)
    AND l.active = true
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- FUNCTION 3: Get Nearby Locations For User (DEMOGRAPHIC-AWARE!)
-- ================================================================
CREATE OR REPLACE FUNCTION get_nearby_locations_for_user(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  user_race_ethnicity text[] DEFAULT NULL,
  user_gender text DEFAULT NULL,
  user_lgbtq_status boolean DEFAULT NULL,
  radius_meters INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  place_type text,
  distance_meters INTEGER,
  avg_safety_score NUMERIC,
  demographic_safety_score NUMERIC,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.address,
    l.place_type::text,
    ROUND(ST_Distance(l.coordinates, ST_MakePoint(lng, lat)::geography))::INTEGER as distance_meters,
    l.avg_safety_score,
    COALESCE(
      -- Try race-specific score first
      (SELECT ss.avg_safety_score FROM safety_scores ss 
       WHERE ss.location_id = l.id 
         AND ss.demographic_type = 'race_ethnicity' 
         AND user_race_ethnicity IS NOT NULL 
         AND ss.demographic_value = ANY(user_race_ethnicity)
       LIMIT 1),
      -- Then gender-specific score
      (SELECT ss.avg_safety_score FROM safety_scores ss 
       WHERE ss.location_id = l.id 
         AND ss.demographic_type = 'gender' 
         AND user_gender IS NOT NULL 
         AND ss.demographic_value = user_gender
       LIMIT 1),
      -- Fall back to overall score
      l.avg_safety_score
    ) as demographic_safety_score,
    ST_Y(l.coordinates::geometry) as latitude,
    ST_X(l.coordinates::geometry) as longitude
  FROM locations l
  WHERE ST_DWithin(l.coordinates, ST_MakePoint(lng, lat)::geography, radius_meters)
    AND l.active = true
  ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;