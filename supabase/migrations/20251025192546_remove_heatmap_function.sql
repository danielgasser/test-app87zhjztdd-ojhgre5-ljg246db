-- Drop the get_heatmap_data function
DROP FUNCTION IF EXISTS public.get_heatmap_data(
  center_lat double precision,
  center_lng double precision,
  radius_meters integer,
  user_race_ethnicity text[],
  user_gender text,
  user_lgbtq_status boolean,
  user_disability_status text[],
  user_religion text,
  user_age_range text
);

-- Revoke any permissions that were granted
-- (This is safe to run even if already revoked)
REVOKE ALL ON FUNCTION public.get_heatmap_data FROM anon;
REVOKE ALL ON FUNCTION public.get_heatmap_data FROM authenticated;
REVOKE ALL ON FUNCTION public.get_heatmap_data FROM service_role;