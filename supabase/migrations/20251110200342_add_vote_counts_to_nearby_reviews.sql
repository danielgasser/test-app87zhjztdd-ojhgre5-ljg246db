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
  location_latitude double precision, 
  location_longitude double precision, 
  distance_meters double precision, 
  user_full_name text, 
  user_show_demographics boolean, 
  user_race_ethnicity text[], 
  user_gender text, 
  user_lgbtq_status boolean, 
  user_disability_status text[],
  helpful_count integer,
  unhelpful_count integer
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.location_id,
    r.title,
    r.content,
    r.safety_rating::numeric,
    r.overall_rating::numeric,
    r.created_at,
    l.name as location_name,
    l.address as location_address,
    ST_Y(l.coordinates::geometry) as location_latitude,
    ST_X(l.coordinates::geometry) as location_longitude,
    ST_Distance(
      l.coordinates::geography,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) as distance_meters,
    COALESCE(up.full_name, 'Anonymous') as user_full_name,
    COALESCE(up.show_demographics, false) as user_show_demographics,
    COALESCE(up.race_ethnicity, ARRAY[]::text[]) as user_race_ethnicity,
    COALESCE(up.gender, '') as user_gender,
    COALESCE(up.lgbtq_status, false) as user_lgbtq_status,
    COALESCE(up.disability_status, ARRAY[]::text[]) as user_disability_status,
    COALESCE(r.helpful_count, 0) as helpful_count,
    COALESCE(r.unhelpful_count, 0) as unhelpful_count
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
$function$;