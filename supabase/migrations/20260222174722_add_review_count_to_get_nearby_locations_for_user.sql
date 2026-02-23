DROP FUNCTION public.get_nearby_locations_for_user(double precision, double precision, text[], text, boolean, integer);

CREATE OR REPLACE FUNCTION public.get_nearby_locations_for_user(lat double precision, lng double precision, user_race_ethnicity text[] DEFAULT NULL::text[], user_gender text DEFAULT NULL::text, user_lgbtq_status boolean DEFAULT NULL::boolean, radius_meters integer DEFAULT 5000)
 RETURNS TABLE(id uuid, name text, address text, place_type text, distance_meters integer, avg_safety_score numeric, demographic_safety_score numeric, latitude double precision, longitude double precision, review_count integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
      (SELECT ss.avg_safety_score FROM safety_scores ss 
       WHERE ss.location_id = l.id 
         AND ss.demographic_type = 'race_ethnicity' 
         AND user_race_ethnicity IS NOT NULL 
         AND ss.demographic_value = ANY(user_race_ethnicity)
       LIMIT 1),
      (SELECT ss.avg_safety_score FROM safety_scores ss 
       WHERE ss.location_id = l.id 
         AND ss.demographic_type = 'gender' 
         AND user_gender IS NOT NULL 
         AND ss.demographic_value = user_gender
       LIMIT 1),
      l.avg_safety_score
    ) as demographic_safety_score,
    ST_Y(l.coordinates::geometry) as latitude,
    ST_X(l.coordinates::geometry) as longitude,
    l.review_count::integer
  FROM locations l
  WHERE ST_DWithin(l.coordinates, ST_MakePoint(lng, lat)::geography, radius_meters)
    AND l.active = true
  ORDER BY distance_meters;
END;
$function$