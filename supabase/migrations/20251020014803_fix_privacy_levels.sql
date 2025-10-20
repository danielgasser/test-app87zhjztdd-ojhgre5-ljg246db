-- Fix get_nearby_reviews to respect privacy settings
CREATE OR REPLACE FUNCTION "public"."get_nearby_reviews"(
  "lat" double precision, 
  "lng" double precision, 
  "radius_meters" integer DEFAULT 10000, 
  "review_limit" integer DEFAULT 10
) 
RETURNS TABLE(
  "id" "uuid", 
  "user_id" "uuid", 
  "location_id" "uuid", 
  "title" "text", 
  "content" "text", 
  "safety_rating" numeric, 
  "overall_rating" numeric, 
  "created_at" timestamp with time zone, 
  "location_name" "text", 
  "location_address" "text", 
  "location_latitude" double precision, 
  "location_longitude" double precision, 
  "distance_meters" double precision, 
  "user_full_name" "text", 
  "user_show_demographics" boolean, 
  "user_race_ethnicity" "text"[], 
  "user_gender" "text", 
  "user_lgbtq_status" boolean, 
  "user_disability_status" "text"[]
)
LANGUAGE "plpgsql"
AS $$
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
    COALESCE(up.disability_status, ARRAY[]::text[]) as user_disability_status
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
    AND up.privacy_level != 'private'
  ORDER BY r.created_at DESC
  LIMIT review_limit;
END;
$$;