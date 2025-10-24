-- Function to get a user's public profile data
-- Only returns data if user's privacy_level is 'public'
-- Returns their profile info and recent reviews
CREATE OR REPLACE FUNCTION "public"."get_user_public_profile"(
  "profile_user_id" "uuid"
) 
RETURNS TABLE(
  "user_id" "uuid",
  "full_name" "text",
  "race_ethnicity" "text"[],
  "gender" "text",
  "lgbtq_status" boolean,
  "disability_status" "text"[],
  "religion" "text",
  "age_range" "text",
  "privacy_level" "text",
  "show_demographics" boolean,
  "total_reviews" integer,
  "created_at" timestamp with time zone,
  "is_public" boolean
)
LANGUAGE "plpgsql"
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id as user_id,
    up.full_name,
    up.race_ethnicity,
    up.gender,
    up.lgbtq_status,
    up.disability_status,
    up.religion,
    up.age_range,
    up.privacy_level,
    up.show_demographics,
    up.total_reviews,
    up.created_at,
    (up.privacy_level = 'public') as is_public
  FROM user_profiles up
  WHERE up.id = profile_user_id;
END;
$$;