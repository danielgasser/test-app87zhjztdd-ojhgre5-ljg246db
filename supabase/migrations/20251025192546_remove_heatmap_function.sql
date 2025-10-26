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

