-- Function to get a user's public reviews
CREATE OR REPLACE FUNCTION "public"."get_user_public_reviews"(
  "profile_user_id" "uuid",
  "review_limit" integer DEFAULT 10
) 
RETURNS TABLE(
  "id" "uuid",
  "location_id" "uuid",
  "location_name" "text",
  "location_address" "text",
  "overall_rating" numeric,
  "safety_rating" numeric,
  "title" "text",
  "content" "text",
  "created_at" timestamp with time zone
)
LANGUAGE "plpgsql"
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.location_id,
    l.name as location_name,
    l.address as location_address,
    r.overall_rating,
    r.safety_rating,
    r.title,
    r.content,
    r.created_at
  FROM reviews r
  JOIN locations l ON r.location_id = l.id
  WHERE r.user_id = profile_user_id
    AND r.status = 'active'
  ORDER BY r.created_at DESC
  LIMIT review_limit;
END;
$$;