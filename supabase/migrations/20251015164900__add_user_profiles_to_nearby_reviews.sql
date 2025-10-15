-- Migration: Add user profile data to get_nearby_reviews function
-- This allows the community feed to respect privacy settings
DROP FUNCTION IF EXISTS public.get_nearby_reviews(double precision, double precision, integer, integer);

CREATE OR REPLACE FUNCTION public.get_nearby_reviews(
  lat double precision,
  lng double precision,
  radius_meters integer DEFAULT 10000,
  review_limit integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  location_id uuid,
  title text,
  content text,
  safety_rating numeric,
  overall_rating numeric,
  created_at timestamp with time zone,
  location_name text,
  location_address text,
  distance_meters double precision,
  -- NEW: User profile fields for privacy enforcement
  user_full_name text,
  user_show_demographics boolean,
  user_race_ethnicity text[],
  user_gender text,
  user_lgbtq_status boolean,
  user_disability_status text[]
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.location_id,
    r.title,
    r.content,
    r.safety_rating,
    r.overall_rating,
    r.created_at,
    l.name as location_name,
    l.address as location_address,
    ST_Distance(
      l.coordinates::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters,
    -- NEW: Join user profile data
    up.full_name as user_full_name,
    up.show_demographics as user_show_demographics,
    up.race_ethnicity as user_race_ethnicity,
    up.gender as user_gender,
    up.lgbtq_status as user_lgbtq_status,
    up.disability_status as user_disability_status
  FROM reviews r
  JOIN locations l ON r.location_id = l.id
  LEFT JOIN user_profiles up ON r.user_id = up.id
  WHERE 
    r.status = 'active'
    AND ST_DWithin(
      l.coordinates::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY r.created_at DESC
  LIMIT review_limit;
END;
$$;