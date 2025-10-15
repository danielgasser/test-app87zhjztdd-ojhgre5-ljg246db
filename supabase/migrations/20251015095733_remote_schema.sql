create extension if not exists "postgis" with schema "public" version '3.3.7';

create type "public"."place_type_enum" as enum ('accounting', 'airport', 'amusement_park', 'aquarium', 'art_gallery', 'atm', 'bakery', 'bank', 'bar', 'beauty_salon', 'bicycle_store', 'book_store', 'bowling_alley', 'bus_station', 'cafe', 'campground', 'car_dealer', 'car_rental', 'car_repair', 'car_wash', 'casino', 'cemetery', 'church', 'city_hall', 'clothing_store', 'convenience_store', 'courthouse', 'dentist', 'department_store', 'doctor', 'drugstore', 'electrician', 'electronics_store', 'embassy', 'fire_station', 'florist', 'funeral_home', 'furniture_store', 'gas_station', 'gym', 'hair_care', 'hardware_store', 'hindu_temple', 'home_goods_store', 'hospital', 'insurance_agency', 'jewelry_store', 'laundry', 'lawyer', 'library', 'light_rail_station', 'liquor_store', 'local_government_office', 'locksmith', 'lodging', 'meal_delivery', 'meal_takeaway', 'mosque', 'movie_rental', 'movie_theater', 'moving_company', 'museum', 'night_club', 'painter', 'park', 'parking', 'pet_store', 'pharmacy', 'physiotherapist', 'plumber', 'police', 'post_office', 'primary_school', 'real_estate_agency', 'restaurant', 'roofing_contractor', 'rv_park', 'school', 'secondary_school', 'shoe_store', 'shopping_mall', 'spa', 'stadium', 'storage', 'store', 'subway_station', 'supermarket', 'synagogue', 'taxi_stand', 'tourist_attraction', 'train_station', 'transit_station', 'travel_agency', 'university', 'veterinary_care', 'zoo', 'address', 'neighborhood', 'locality', 'region', 'district', 'postcode', 'country', 'poi', 'place', 'other');

create table "public"."locations" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "address" text not null,
    "city" text not null,
    "state_province" text not null,
    "country" text not null default 'US'::text,
    "postal_code" text,
    "coordinates" geography(Point,4326) not null,
    "place_type" place_type_enum not null,
    "tags" text[],
    "google_place_id" text,
    "created_by" uuid,
    "verified" boolean default false,
    "active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "place_type_backup" text,
    "avg_safety_score" numeric(3,2),
    "avg_comfort_score" numeric(3,2),
    "avg_overall_score" numeric(3,2),
    "review_count" integer default 0
);


alter table "public"."locations" enable row level security;

create table "public"."ml_training_data" (
    "id" uuid not null default gen_random_uuid(),
    "location_id" uuid,
    "demographic_features" jsonb,
    "safety_metrics" jsonb,
    "temporal_features" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."ml_training_data" enable row level security;

create table "public"."profiles" (
    "id" uuid not null default uuid_generate_v4(),
    "user_id" uuid,
    "demographics" jsonb default '{}'::jsonb,
    "onboarding_complete" boolean default false,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now())
);


alter table "public"."profiles" enable row level security;

create table "public"."review_votes" (
    "id" uuid not null default gen_random_uuid(),
    "review_id" uuid not null,
    "user_id" uuid not null,
    "vote_type" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."review_votes" enable row level security;

create table "public"."reviews" (
    "id" uuid not null default gen_random_uuid(),
    "location_id" uuid not null,
    "user_id" uuid not null,
    "title" text not null,
    "content" text not null,
    "overall_rating" numeric(2,1) not null,
    "safety_rating" integer not null,
    "comfort_rating" integer not null,
    "accessibility_rating" integer,
    "service_rating" integer,
    "visit_type" text,
    "photo_urls" text[],
    "status" text default 'active'::text,
    "flag_count" integer default 0,
    "helpful_count" integer default 0,
    "unhelpful_count" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "visited_at" timestamp with time zone
);


alter table "public"."reviews" enable row level security;

create table "public"."route_segments" (
    "id" uuid not null default gen_random_uuid(),
    "start_point" geography(Point,4326),
    "end_point" geography(Point,4326),
    "path" geography(LineString,4326),
    "demographic_type" text,
    "demographic_value" text,
    "safety_score" numeric(3,2),
    "last_calculated" timestamp with time zone default now()
);


alter table "public"."route_segments" enable row level security;

create table "public"."safety_scores" (
    "id" uuid not null default gen_random_uuid(),
    "location_id" uuid not null,
    "demographic_type" text not null,
    "demographic_value" text,
    "avg_safety_score" numeric(3,2),
    "avg_comfort_score" numeric(3,2),
    "avg_overall_score" numeric(3,2),
    "review_count" integer default 0,
    "last_review_date" timestamp with time zone,
    "calculated_at" timestamp with time zone default now()
);


alter table "public"."safety_scores" enable row level security;

create table "public"."user_profiles" (
    "id" uuid not null,
    "username" text,
    "full_name" text,
    "avatar_url" text,
    "race_ethnicity" text[],
    "gender" text,
    "lgbtq_status" boolean,
    "disability_status" text[],
    "religion" text,
    "age_range" text,
    "privacy_level" text default 'public'::text,
    "show_demographics" boolean default true,
    "total_reviews" integer default 0,
    "helpful_votes" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "role" text default 'user'::text,
    "push_token" text
);


alter table "public"."user_profiles" enable row level security;

CREATE INDEX idx_locations_coordinates ON public.locations USING gist (coordinates);

CREATE INDEX idx_reviews_created ON public.reviews USING btree (created_at DESC);

CREATE INDEX idx_reviews_location ON public.reviews USING btree (location_id);

CREATE INDEX idx_reviews_user ON public.reviews USING btree (user_id);

CREATE INDEX idx_safety_scores_demographic ON public.safety_scores USING btree (demographic_type, demographic_value);

CREATE INDEX idx_safety_scores_location ON public.safety_scores USING btree (location_id);

CREATE UNIQUE INDEX idx_unique_user_location_review ON public.reviews USING btree (user_id, location_id) WHERE (status = 'active'::text);

CREATE UNIQUE INDEX locations_google_place_id_key ON public.locations USING btree (google_place_id);

CREATE UNIQUE INDEX locations_pkey ON public.locations USING btree (id);

CREATE UNIQUE INDEX ml_training_data_pkey ON public.ml_training_data USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX review_votes_pkey ON public.review_votes USING btree (id);

CREATE UNIQUE INDEX review_votes_review_id_user_id_key ON public.review_votes USING btree (review_id, user_id);

CREATE UNIQUE INDEX reviews_pkey ON public.reviews USING btree (id);

CREATE UNIQUE INDEX route_segments_pkey ON public.route_segments USING btree (id);

CREATE UNIQUE INDEX safety_scores_location_id_demographic_type_demographic_valu_key ON public.safety_scores USING btree (location_id, demographic_type, demographic_value) NULLS NOT DISTINCT;

CREATE UNIQUE INDEX safety_scores_pkey ON public.safety_scores USING btree (id);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);

CREATE UNIQUE INDEX user_profiles_username_key ON public.user_profiles USING btree (username);

alter table "public"."locations" add constraint "locations_pkey" PRIMARY KEY using index "locations_pkey";

alter table "public"."ml_training_data" add constraint "ml_training_data_pkey" PRIMARY KEY using index "ml_training_data_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."review_votes" add constraint "review_votes_pkey" PRIMARY KEY using index "review_votes_pkey";

alter table "public"."reviews" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "public"."route_segments" add constraint "route_segments_pkey" PRIMARY KEY using index "route_segments_pkey";

alter table "public"."safety_scores" add constraint "safety_scores_pkey" PRIMARY KEY using index "safety_scores_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."locations" add constraint "locations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."locations" validate constraint "locations_created_by_fkey";

alter table "public"."locations" add constraint "locations_google_place_id_key" UNIQUE using index "locations_google_place_id_key";

alter table "public"."ml_training_data" add constraint "ml_training_data_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) not valid;

alter table "public"."ml_training_data" validate constraint "ml_training_data_location_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_key" UNIQUE using index "profiles_user_id_key";

alter table "public"."review_votes" add constraint "review_votes_review_id_fkey" FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE not valid;

alter table "public"."review_votes" validate constraint "review_votes_review_id_fkey";

alter table "public"."review_votes" add constraint "review_votes_review_id_user_id_key" UNIQUE using index "review_votes_review_id_user_id_key";

alter table "public"."review_votes" add constraint "review_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."review_votes" validate constraint "review_votes_user_id_fkey";

alter table "public"."review_votes" add constraint "review_votes_vote_type_check" CHECK ((vote_type = ANY (ARRAY['helpful'::text, 'unhelpful'::text]))) not valid;

alter table "public"."review_votes" validate constraint "review_votes_vote_type_check";

alter table "public"."reviews" add constraint "reviews_accessibility_rating_check" CHECK (((accessibility_rating >= 1) AND (accessibility_rating <= 5))) not valid;

alter table "public"."reviews" validate constraint "reviews_accessibility_rating_check";

alter table "public"."reviews" add constraint "reviews_comfort_rating_check" CHECK (((comfort_rating >= 1) AND (comfort_rating <= 5))) not valid;

alter table "public"."reviews" validate constraint "reviews_comfort_rating_check";

alter table "public"."reviews" add constraint "reviews_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."reviews" validate constraint "reviews_location_id_fkey";

alter table "public"."reviews" add constraint "reviews_overall_rating_check" CHECK (((overall_rating >= (1)::numeric) AND (overall_rating <= (5)::numeric))) not valid;

alter table "public"."reviews" validate constraint "reviews_overall_rating_check";

alter table "public"."reviews" add constraint "reviews_safety_rating_check" CHECK (((safety_rating >= 1) AND (safety_rating <= 5))) not valid;

alter table "public"."reviews" validate constraint "reviews_safety_rating_check";

alter table "public"."reviews" add constraint "reviews_service_rating_check" CHECK (((service_rating >= 1) AND (service_rating <= 5))) not valid;

alter table "public"."reviews" validate constraint "reviews_service_rating_check";

alter table "public"."reviews" add constraint "reviews_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'flagged'::text, 'hidden'::text, 'deleted'::text]))) not valid;

alter table "public"."reviews" validate constraint "reviews_status_check";

alter table "public"."reviews" add constraint "reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."reviews" validate constraint "reviews_user_id_fkey";

alter table "public"."reviews" add constraint "reviews_visit_type_check" CHECK ((visit_type = ANY (ARRAY['solo'::text, 'couple'::text, 'family'::text, 'group'::text, 'business'::text]))) not valid;

alter table "public"."reviews" validate constraint "reviews_visit_type_check";

alter table "public"."safety_scores" add constraint "safety_scores_avg_comfort_score_check" CHECK (((avg_comfort_score >= (1)::numeric) AND (avg_comfort_score <= (5)::numeric))) not valid;

alter table "public"."safety_scores" validate constraint "safety_scores_avg_comfort_score_check";

alter table "public"."safety_scores" add constraint "safety_scores_avg_overall_score_check" CHECK (((avg_overall_score >= (1)::numeric) AND (avg_overall_score <= (5)::numeric))) not valid;

alter table "public"."safety_scores" validate constraint "safety_scores_avg_overall_score_check";

alter table "public"."safety_scores" add constraint "safety_scores_avg_safety_score_check" CHECK (((avg_safety_score >= (1)::numeric) AND (avg_safety_score <= (5)::numeric))) not valid;

alter table "public"."safety_scores" validate constraint "safety_scores_avg_safety_score_check";

alter table "public"."safety_scores" add constraint "safety_scores_demographic_type_check" CHECK ((demographic_type = ANY (ARRAY['race_ethnicity'::text, 'gender'::text, 'lgbtq'::text, 'disability'::text, 'religion'::text, 'age'::text, 'overall'::text]))) not valid;

alter table "public"."safety_scores" validate constraint "safety_scores_demographic_type_check";

alter table "public"."safety_scores" add constraint "safety_scores_location_id_demographic_type_demographic_valu_key" UNIQUE using index "safety_scores_location_id_demographic_type_demographic_valu_key";

alter table "public"."safety_scores" add constraint "safety_scores_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE not valid;

alter table "public"."safety_scores" validate constraint "safety_scores_location_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_id_fkey";

alter table "public"."user_profiles" add constraint "user_profiles_privacy_level_check" CHECK ((privacy_level = ANY (ARRAY['public'::text, 'anonymous'::text, 'private'::text]))) not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_privacy_level_check";

alter table "public"."user_profiles" add constraint "user_profiles_username_key" UNIQUE using index "user_profiles_username_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.calculate_location_safety_scores(p_location_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
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
  HAVING COUNT(*) > 0
  ON CONFLICT (location_id, demographic_type, demographic_value) 
  DO UPDATE SET
    avg_safety_score = EXCLUDED.avg_safety_score,
    avg_comfort_score = EXCLUDED.avg_comfort_score,
    avg_overall_score = EXCLUDED.avg_overall_score,
    review_count = EXCLUDED.review_count,
    last_review_date = EXCLUDED.last_review_date,
    calculated_at = now();

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
  HAVING COUNT(*) > 0
  ON CONFLICT (location_id, demographic_type, demographic_value) 
  DO UPDATE SET
    avg_safety_score = EXCLUDED.avg_safety_score,
    avg_comfort_score = EXCLUDED.avg_comfort_score,
    avg_overall_score = EXCLUDED.avg_overall_score,
    review_count = EXCLUDED.review_count,
    last_review_date = EXCLUDED.last_review_date,
    calculated_at = now();

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
  HAVING COUNT(*) > 0
  ON CONFLICT (location_id, demographic_type, demographic_value) 
  DO UPDATE SET
    avg_safety_score = EXCLUDED.avg_safety_score,
    avg_comfort_score = EXCLUDED.avg_comfort_score,
    avg_overall_score = EXCLUDED.avg_overall_score,
    review_count = EXCLUDED.review_count,
    last_review_date = EXCLUDED.last_review_date,
    calculated_at = now();

  -- Update the locations table with overall scores
  UPDATE locations 
  SET 
    avg_safety_score = (SELECT avg_safety_score FROM safety_scores WHERE location_id = p_location_id AND demographic_type = 'overall'),
    avg_comfort_score = (SELECT avg_comfort_score FROM safety_scores WHERE location_id = p_location_id AND demographic_type = 'overall'),
    avg_overall_score = (SELECT avg_overall_score FROM safety_scores WHERE location_id = p_location_id AND demographic_type = 'overall'),
    review_count = (SELECT review_count FROM safety_scores WHERE location_id = p_location_id AND demographic_type = 'overall')
  WHERE id = p_location_id;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.extract_ml_training_data()
 RETURNS TABLE(user_id uuid, location_id uuid, user_race_ethnicity text[], user_gender text, user_lgbtq_status boolean, user_religion text, user_age_range text, location_type text, location_latitude numeric, location_longitude numeric, safety_rating numeric, comfort_rating numeric, overall_rating numeric, review_created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    r.location_id,
    up.race_ethnicity,
    up.gender,
    up.lgbtq_status,
    up.religion,
    up.age_range,
    l.place_type::text,
    ST_Y(l.coordinates::geometry) as location_latitude,
    ST_X(l.coordinates::geometry) as location_longitude,
    r.safety_rating,
    r.comfort_rating,
    r.overall_rating,
    r.created_at
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id
  JOIN locations l ON r.location_id = l.id
  WHERE r.status = 'active'
    AND up.race_ethnicity IS NOT NULL 
    AND up.gender IS NOT NULL
    AND up.gender != ''
  ORDER BY r.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.find_similar_users(target_user_id uuid, similarity_threshold numeric DEFAULT 0.6)
 RETURNS TABLE(similar_user_id uuid, similarity_score numeric, shared_demographics text[])
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH target_user AS (
    SELECT race_ethnicity, gender, lgbtq_status, religion, age_range
    FROM user_profiles 
    WHERE id = target_user_id
  ),
  user_similarities AS (
    SELECT 
      up.id as similar_user_id,
      CASE 
        WHEN up.id = target_user_id THEN 0  -- Exclude self
        ELSE
          -- Calculate similarity score (0-1)
          (
            -- Race/ethnicity overlap (40% weight)
            CASE 
              WHEN up.race_ethnicity && tu.race_ethnicity THEN 0.4
              ELSE 0 
            END +
            -- Gender match (20% weight)  
            CASE 
              WHEN up.gender = tu.gender THEN 0.2
              ELSE 0
            END +
            -- LGBTQ+ match (20% weight)
            CASE 
              WHEN up.lgbtq_status = tu.lgbtq_status THEN 0.2
              ELSE 0
            END +
            -- Religion match (10% weight)
            CASE 
              WHEN up.religion = tu.religion THEN 0.1
              ELSE 0
            END +
            -- Age range match (10% weight)
            CASE 
              WHEN up.age_range = tu.age_range THEN 0.1
              ELSE 0
            END
          )
      END as similarity_score,
      -- Track which demographics matched
      ARRAY[
        CASE WHEN up.race_ethnicity && tu.race_ethnicity THEN 'race' ELSE NULL END,
        CASE WHEN up.gender = tu.gender THEN 'gender' ELSE NULL END,
        CASE WHEN up.lgbtq_status = tu.lgbtq_status THEN 'lgbtq' ELSE NULL END,
        CASE WHEN up.religion = tu.religion THEN 'religion' ELSE NULL END,
        CASE WHEN up.age_range = tu.age_range THEN 'age' ELSE NULL END
      ]::text[] as shared_demographics
    FROM user_profiles up, target_user tu
    WHERE up.id != target_user_id
  )
  SELECT 
    us.similar_user_id,
    us.similarity_score,
    array_remove(us.shared_demographics, NULL) as shared_demographics
  FROM user_similarities us
  WHERE us.similarity_score >= similarity_threshold
  ORDER BY us.similarity_score DESC
  LIMIT 10;
END;
$function$
;

create type "public"."geometry_dump" as ("path" integer[], "geom" geometry);

CREATE OR REPLACE FUNCTION public.get_basic_ml_recommendations(target_user_id uuid, max_recommendations integer DEFAULT 5)
 RETURNS TABLE(location_id uuid, location_name text, predicted_safety_score numeric, confidence_score numeric, similar_user_count integer, recommendation_reason text)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH target_user_demographics AS (
    SELECT race_ethnicity, gender, lgbtq_status
    FROM user_profiles 
    WHERE id = target_user_id
  ),
  similar_users AS (
    -- Find users with overlapping demographics
    SELECT 
      up.id as similar_user_id,
      CASE 
        -- Calculate similarity score (0-1)
        WHEN up.race_ethnicity && tu.race_ethnicity AND up.gender = tu.gender AND up.lgbtq_status = tu.lgbtq_status THEN 1.0  -- Perfect match
        WHEN up.race_ethnicity && tu.race_ethnicity AND up.gender = tu.gender THEN 0.8  -- Race + gender match
        WHEN up.race_ethnicity && tu.race_ethnicity AND up.lgbtq_status = tu.lgbtq_status THEN 0.7  -- Race + LGBTQ+ match
        WHEN up.gender = tu.gender AND up.lgbtq_status = tu.lgbtq_status THEN 0.6  -- Gender + LGBTQ+ match
        WHEN up.race_ethnicity && tu.race_ethnicity THEN 0.5  -- Race match only
        WHEN up.gender = tu.gender THEN 0.4  -- Gender match only
        WHEN up.lgbtq_status = tu.lgbtq_status THEN 0.3  -- LGBTQ+ match only
        ELSE 0
      END as similarity_score
    FROM user_profiles up, target_user_demographics tu
    WHERE up.id != target_user_id
      AND up.race_ethnicity IS NOT NULL
      AND up.gender IS NOT NULL
  ),
  user_location_scores AS (
    -- Get ratings from similar users, excluding locations target user already reviewed
    SELECT 
      r.location_id,
      r.safety_rating,
      r.overall_rating,
      su.similarity_score,
      su.similar_user_id
    FROM reviews r
    JOIN similar_users su ON r.user_id = su.similar_user_id
    WHERE r.status = 'active'
      AND su.similarity_score >= 0.3  -- Minimum similarity threshold
      AND r.location_id NOT IN (
        -- Exclude locations the target user has already reviewed
        SELECT rev.location_id FROM reviews rev WHERE rev.user_id = target_user_id AND rev.status = 'active'
      )
  ),
  location_predictions AS (
    SELECT 
      uls.location_id,
      -- Weighted average safety score based on user similarity
      ROUND(
        SUM(uls.safety_rating * uls.similarity_score) / 
        NULLIF(SUM(uls.similarity_score), 0), 
        2
      ) as predicted_safety_score,
      -- Confidence based on number of similar users and their similarity scores
      LEAST(
        ROUND(
          (COUNT(DISTINCT uls.similar_user_id) * AVG(uls.similarity_score))::numeric, 
          2
        ),
        1.0
      ) as confidence_score,
      COUNT(DISTINCT uls.similar_user_id)::integer as similar_user_count,
      CASE 
        WHEN COUNT(DISTINCT uls.similar_user_id) >= 3 THEN 'Highly recommended by users like you'
        WHEN COUNT(DISTINCT uls.similar_user_id) = 2 THEN 'Recommended by similar users'  
        ELSE 'Limited data from similar users'
      END as recommendation_reason
    FROM user_location_scores uls
    GROUP BY uls.location_id
    HAVING COUNT(DISTINCT uls.similar_user_id) >= 1  -- At least 1 similar user reviewed
  )
  SELECT 
    lp.location_id,
    l.name as location_name,
    lp.predicted_safety_score,
    lp.confidence_score,
    lp.similar_user_count,
    lp.recommendation_reason
  FROM location_predictions lp
  JOIN locations l ON lp.location_id = l.id
  WHERE l.active = true
    AND lp.predicted_safety_score >= 3.0  -- Only recommend reasonably safe places
  ORDER BY 
    lp.confidence_score DESC,
    lp.predicted_safety_score DESC
  LIMIT max_recommendations;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_discrimination_patterns(p_location_id uuid DEFAULT NULL::uuid, p_threshold numeric DEFAULT 1.5)
 RETURNS TABLE(location_id uuid, location_name text, pattern_type text, severity text, affected_demographics text[], evidence jsonb, recommendation text)
 LANGUAGE sql
AS $function$
  -- Pattern 1: Demographic Disparity
  SELECT 
    l.id,
    l.name,
    'demographic_disparity'::TEXT,
    CASE 
      WHEN ABS(ss.avg_overall_score - overall.avg_overall_score) >= 3 THEN 'high'
      WHEN ABS(ss.avg_overall_score - overall.avg_overall_score) >= 2 THEN 'medium'
      ELSE 'low'
    END::TEXT,
    ARRAY[ss.demographic_type || ': ' || ss.demographic_value]::TEXT[],
    jsonb_build_object(
      'score_disparity', ROUND(ABS(ss.avg_overall_score - overall.avg_overall_score)::NUMERIC, 2),
      'review_count', ss.review_count,
      'specific_issues', ARRAY[
        ss.demographic_type || ': ' || ss.demographic_value || ' rates this ' || ROUND(ss.avg_overall_score, 1) || '/5',
        'Overall average is ' || ROUND(overall.avg_overall_score, 1) || '/5',
        'Disparity of ' || ROUND(ABS(ss.avg_overall_score - overall.avg_overall_score), 1) || ' points'
      ]
    ),
    CASE 
      WHEN ss.avg_overall_score < overall.avg_overall_score THEN
        'Investigate why ' || ss.demographic_type || ': ' || ss.demographic_value || ' users feel less safe'
      ELSE
        'This location is particularly welcoming to ' || ss.demographic_type || ': ' || ss.demographic_value
    END
  FROM locations l
  JOIN safety_scores ss ON ss.location_id = l.id
  JOIN safety_scores overall ON overall.location_id = l.id AND overall.demographic_type = 'overall'
  WHERE l.active = true
    AND (p_location_id IS NULL OR l.id = p_location_id)
    AND ss.demographic_type != 'overall'
    AND ABS(ss.avg_overall_score - overall.avg_overall_score) >= p_threshold

  UNION ALL

  -- Pattern 2: Time-Based Discrimination
  SELECT 
    l.id,
    l.name,
    'time_based_discrimination'::TEXT,
    'high'::TEXT,
    ARRAY_AGG(DISTINCT 
      CASE 
        WHEN r.content ILIKE '%night%' OR r.content ILIKE '%evening%' OR r.content ILIKE '%dark%' THEN
          up.gender || ' users'
        WHEN r.content ILIKE '%sundown%' OR r.content ILIKE '%sunset%' THEN
          COALESCE(up.race_ethnicity[1], 'minority') || ' users'
      END
    )::TEXT[],
    jsonb_build_object(
      'review_count', COUNT(*),
      'active_times', ARRAY['evening', 'night'],
      'specific_issues', ARRAY_AGG(
        SUBSTRING(r.content FROM '.{0,50}(night|evening|dark|sundown|sunset).{0,50}')
      )
    ),
    'Location shows increased safety concerns during evening/night hours'
  FROM locations l
  JOIN reviews r ON r.location_id = l.id
  JOIN user_profiles up ON up.id = r.user_id
  WHERE l.active = true
    AND (p_location_id IS NULL OR l.id = p_location_id)
    AND r.status = 'active'
    AND (r.safety_rating <= 2 OR r.comfort_rating <= 2)
    AND (
      r.content ILIKE '%night%' OR 
      r.content ILIKE '%evening%' OR 
      r.content ILIKE '%dark%' OR
      r.content ILIKE '%sundown%' OR
      r.content ILIKE '%sunset%' OR
      r.content ILIKE '%after dark%'
    )
  GROUP BY l.id, l.name
  HAVING COUNT(*) >= 2

  UNION ALL

  -- Pattern 3: Systematic Bias
  SELECT 
    l.id,
    l.name,
    'systematic_bias'::TEXT,
    'high'::TEXT,
    ARRAY_AGG(DISTINCT 
      CASE 
        WHEN array_length(up.race_ethnicity, 1) > 0 THEN 'race: ' || up.race_ethnicity[1]
        WHEN up.lgbtq_status = true THEN 'lgbtq: yes'
        ELSE 'gender: ' || up.gender
      END
    )::TEXT[],
    jsonb_build_object(
      'review_count', COUNT(*),
      'avg_rating', ROUND(AVG(r.overall_rating), 1),
      'specific_issues', ARRAY[
        'Consistent pattern of low ratings from specific demographic groups',
        COUNT(*) || ' negative reviews from affected demographics',
        'Average rating from affected groups: ' || ROUND(AVG(r.overall_rating), 1) || '/5'
      ]
    ),
    'This location shows systematic bias against certain demographic groups'
  FROM locations l
  JOIN reviews r ON r.location_id = l.id
  JOIN user_profiles up ON up.id = r.user_id
  WHERE l.active = true
    AND (p_location_id IS NULL OR l.id = p_location_id)
    AND r.status = 'active'
    AND r.overall_rating <= 2.5
  GROUP BY l.id, l.name
  HAVING COUNT(*) >= 3
    AND AVG(r.overall_rating) <= 2.5

  ORDER BY 
    1, -- location_id
    3
$function$
;

CREATE OR REPLACE FUNCTION public.get_heatmap_data(center_lat double precision, center_lng double precision, radius_meters integer DEFAULT 10000, user_race_ethnicity text[] DEFAULT NULL::text[], user_gender text DEFAULT NULL::text, user_lgbtq_status boolean DEFAULT NULL::boolean, user_disability_status text[] DEFAULT NULL::text[], user_religion text DEFAULT NULL::text, user_age_range text DEFAULT NULL::text)
 RETURNS TABLE(latitude double precision, longitude double precision, safety_score numeric, review_count integer, heat_weight numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Y(l.coordinates::geometry) as latitude,
    ST_X(l.coordinates::geometry) as longitude,
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
      l.avg_safety_score,
      3.0  -- Default neutral score
    ) as safety_score,
    l.review_count::INTEGER as review_count,
    COALESCE(
      -- Same logic for heat weight
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
      l.avg_safety_score,
      3.0
    ) as heat_weight
  FROM locations l
  WHERE ST_DWithin(l.coordinates, ST_MakePoint(center_lng, center_lat)::geography, radius_meters)
    AND l.active = true
    AND l.review_count > 0  -- Only include locations with reviews for heat map
  ORDER BY review_count DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_location_with_coords(location_id uuid)
 RETURNS TABLE(id uuid, name text, address text, city text, state_province text, country text, place_type text, latitude double precision, longitude double precision, avg_safety_score numeric, avg_comfort_score numeric, avg_overall_score numeric, review_count integer, verified boolean, active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.address,
    l.city,
    l.state_province,
    l.country,
    l.place_type::text,
    ST_Y(l.coordinates::geometry) as latitude,
    ST_X(l.coordinates::geometry) as longitude,
    l.avg_safety_score,
    l.avg_comfort_score,
    l.avg_overall_score,
    l.review_count,
    l.verified,
    l.active,
    l.created_at,
    l.updated_at
  FROM locations l
  WHERE l.id = location_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_ml_recommendations_for_user(target_user_id uuid, user_lat numeric DEFAULT NULL::numeric, user_lng numeric DEFAULT NULL::numeric, max_distance_meters integer DEFAULT 50000)
 RETURNS TABLE(location_id uuid, location_name text, predicted_safety_score numeric, confidence_score numeric, similar_user_count integer, recommendation_reason text, distance_meters integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH similar_users AS (
    SELECT similar_user_id, similarity_score 
    FROM find_similar_users(target_user_id, 0.4)
  ),
  similar_user_reviews AS (
    SELECT 
      r.location_id,
      r.safety_rating,
      r.overall_rating,
      su.similarity_score,
      COUNT(*) OVER (PARTITION BY r.location_id) as review_count
    FROM reviews r
    JOIN similar_users su ON r.user_id = su.similar_user_id
    WHERE r.status = 'active'
  ),
  location_predictions AS (
    SELECT 
      sur.location_id,
      -- Weighted average safety score based on user similarity
      ROUND(
        SUM(sur.safety_rating * sur.similarity_score) / 
        SUM(sur.similarity_score), 
        2
      ) as predicted_safety_score,
      -- Confidence based on number of similar users and their similarity
      LEAST(
        ROUND(
          (COUNT(DISTINCT sur.similarity_score) * AVG(sur.similarity_score))::numeric, 
          2
        ),
        1.0
      ) as confidence_score,
      COUNT(DISTINCT sur.similarity_score)::integer as similar_user_count,
      CASE 
        WHEN COUNT(DISTINCT sur.similarity_score) >= 3 THEN 'Highly recommended by similar users'
        WHEN COUNT(DISTINCT sur.similarity_score) = 2 THEN 'Recommended by similar users'  
        ELSE 'Limited data from similar users'
      END as recommendation_reason
    FROM similar_user_reviews sur
    GROUP BY sur.location_id
    HAVING COUNT(DISTINCT sur.similarity_score) >= 1  -- At least 1 similar user reviewed
  )
  SELECT 
    lp.location_id,
    l.name as location_name,
    lp.predicted_safety_score,
    lp.confidence_score,
    lp.similar_user_count,
    lp.recommendation_reason,
    CASE 
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL THEN
        ROUND(ST_Distance(l.coordinates, ST_MakePoint(user_lng, user_lat)::geography))::integer
      ELSE NULL
    END as distance_meters
  FROM location_predictions lp
  JOIN locations l ON lp.location_id = l.id
  WHERE l.active = true
    AND (
      user_lat IS NULL OR user_lng IS NULL OR
      ST_DWithin(l.coordinates, ST_MakePoint(user_lng, user_lat)::geography, max_distance_meters)
    )
  ORDER BY 
    lp.confidence_score DESC,
    lp.predicted_safety_score DESC,
    distance_meters ASC NULLS LAST
  LIMIT 10;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_nearby_locations(lat double precision, lng double precision, radius_meters integer DEFAULT 5000)
 RETURNS TABLE(id uuid, name text, address text, place_type text, distance_meters integer, avg_safety_score numeric, latitude double precision, longitude double precision)
 LANGUAGE plpgsql
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_nearby_locations_for_user(lat double precision, lng double precision, user_race_ethnicity text[] DEFAULT NULL::text[], user_gender text DEFAULT NULL::text, user_lgbtq_status boolean DEFAULT NULL::boolean, radius_meters integer DEFAULT 5000)
 RETURNS TABLE(id uuid, name text, address text, place_type text, distance_meters integer, avg_safety_score numeric, demographic_safety_score numeric, latitude double precision, longitude double precision)
 LANGUAGE plpgsql
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_nearby_reviews(lat double precision, lng double precision, radius_meters integer DEFAULT 5000, review_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, user_id uuid, location_id uuid, location_name text, location_address text, location_latitude double precision, location_longitude double precision, safety_rating numeric, overall_rating numeric, title text, content text, created_at timestamp with time zone, distance_meters integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.user_id,
    r.location_id,
    l.name as location_name,
    l.address as location_address,
    ST_Y(l.coordinates::geometry) as location_latitude,
    ST_X(l.coordinates::geometry) as location_longitude,
    r.safety_rating::numeric,        -- ADD ::numeric here
    r.overall_rating::numeric,       -- ADD ::numeric here
    r.title,
    r.content,
    r.created_at,
    ROUND(ST_Distance(
      l.coordinates,
      ST_MakePoint(lng, lat)::geography
    ))::integer as distance_meters
  FROM reviews r
  JOIN locations l ON r.location_id = l.id
  WHERE r.status = 'active'
    AND ST_DWithin(
      l.coordinates,
      ST_MakePoint(lng, lat)::geography,
      radius_meters
    )
  ORDER BY r.created_at DESC
  LIMIT review_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_safety_insights(user_lat double precision DEFAULT NULL::double precision, user_lng double precision DEFAULT NULL::double precision, radius_meters integer DEFAULT 50000, max_results integer DEFAULT 5)
 RETURNS TABLE(insight_type text, message text, location_id uuid, location_name text, location_address text, severity text, created_at timestamp with time zone, change_value numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  
  -- 1. RATING DROPS: Locations with significant safety rating decreases
  WITH recent_reviews AS (
    SELECT 
      r.location_id,
      AVG(r.safety_rating) as recent_avg,
      COUNT(*) as recent_count
    FROM reviews r
    WHERE r.status = 'active'
      AND r.created_at >= NOW() - INTERVAL '7 days'
    GROUP BY r.location_id
    HAVING COUNT(*) >= 2
  ),
  older_reviews AS (
    SELECT 
      r.location_id,
      AVG(r.safety_rating) as older_avg
    FROM reviews r
    WHERE r.status = 'active'
      AND r.created_at < NOW() - INTERVAL '7 days'
      AND r.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY r.location_id
    HAVING COUNT(*) >= 2
  ),
  rating_drops AS (
    SELECT 
      l.id as location_id,
      l.name as location_name,
      l.address as location_address,
      'rating_drop' as insight_type,
      '⚠️ Safety concerns reported at ' || l.name as message,
      'high' as severity,
      MAX(r.created_at) as created_at,
      ROUND(rr.recent_avg - orr.older_avg, 1) as change_value
    FROM locations l
    JOIN recent_reviews rr ON l.id = rr.location_id
    JOIN older_reviews orr ON l.id = orr.location_id
    LEFT JOIN reviews r ON l.id = r.location_id AND r.created_at >= NOW() - INTERVAL '7 days'
    WHERE l.active = true
      AND (rr.recent_avg - orr.older_avg) <= -1.0
      AND (user_lat IS NULL OR ST_DWithin(
        l.coordinates, 
        ST_MakePoint(user_lng, user_lat)::geography, 
        radius_meters
      ))
    GROUP BY l.id, l.name, l.address, rr.recent_avg, orr.older_avg
  ),
  
  -- 2. RATING IMPROVEMENTS: Locations getting safer
  rating_improvements AS (
    SELECT 
      l.id as location_id,
      l.name as location_name,
      l.address as location_address,
      'rating_improve' as insight_type,
      '📈 Safety improving at ' || l.name as message,
      'low' as severity,
      MAX(r.created_at) as created_at,
      ROUND(rr.recent_avg - orr.older_avg, 1) as change_value
    FROM locations l
    JOIN recent_reviews rr ON l.id = rr.location_id
    JOIN older_reviews orr ON l.id = orr.location_id
    LEFT JOIN reviews r ON l.id = r.location_id AND r.created_at >= NOW() - INTERVAL '7 days'
    WHERE l.active = true
      AND (rr.recent_avg - orr.older_avg) >= 0.5
      AND (user_lat IS NULL OR ST_DWithin(
        l.coordinates, 
        ST_MakePoint(user_lng, user_lat)::geography, 
        radius_meters
      ))
    GROUP BY l.id, l.name, l.address, rr.recent_avg, orr.older_avg
  ),
  
  -- 3. HIGH ACTIVITY: Locations with sudden review spikes
  high_activity AS (
    SELECT 
      l.id as location_id,
      l.name as location_name,
      l.address as location_address,
      'high_activity' as insight_type,
      '🔥 ' || l.name || ' receiving high attention (' || COUNT(r.id)::text || ' new reviews)' as message,
      'medium' as severity,
      MAX(r.created_at) as created_at,
      COUNT(r.id)::numeric as change_value
    FROM locations l
    JOIN reviews r ON l.id = r.location_id
    WHERE l.active = true
      AND r.status = 'active'
      AND r.created_at >= NOW() - INTERVAL '7 days'
      AND (user_lat IS NULL OR ST_DWithin(
        l.coordinates, 
        ST_MakePoint(user_lng, user_lat)::geography, 
        radius_meters
      ))
    GROUP BY l.id, l.name, l.address
    HAVING COUNT(r.id) >= 5
  ),
  
  -- 4. CONSISTENTLY SAFE: Locations maintaining excellent ratings
  consistently_safe AS (
    SELECT 
      l.id as location_id,
      l.name as location_name,
      l.address as location_address,
      'consistently_safe' as insight_type,
      '✅ ' || l.name || ' consistently rated safe' as message,
      'low' as severity,
      MAX(r.created_at) as created_at,
      ROUND(AVG(r.safety_rating), 1) as change_value
    FROM locations l
    JOIN reviews r ON l.id = r.location_id
    WHERE l.active = true
      AND r.status = 'active'
      AND r.created_at >= NOW() - INTERVAL '30 days'
      AND (user_lat IS NULL OR ST_DWithin(
        l.coordinates, 
        ST_MakePoint(user_lng, user_lat)::geography, 
        radius_meters
      ))
    GROUP BY l.id, l.name, l.address
    HAVING COUNT(r.id) >= 5 AND AVG(r.safety_rating) >= 4.5
  ),
  
  -- Combine all insights with proper CTE
  all_insights AS (
    SELECT * FROM rating_drops
    UNION ALL
    SELECT * FROM rating_improvements
    UNION ALL
    SELECT * FROM high_activity
    UNION ALL
    SELECT * FROM consistently_safe
  )
  
  SELECT 
    all_insights.insight_type,
    all_insights.message,
    all_insights.location_id,
    all_insights.location_name,
    all_insights.location_address,
    all_insights.severity,
    all_insights.created_at,
    all_insights.change_value
  FROM all_insights
  ORDER BY 
    CASE all_insights.severity 
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END,
    all_insights.created_at DESC
  LIMIT max_results;
  
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_trending_locations(days_window integer DEFAULT 7, max_results integer DEFAULT 5)
 RETURNS TABLE(location_id uuid, location_name text, location_address text, review_count_current integer, review_count_previous integer, trend_direction text, trend_percentage numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      r.location_id,
      COUNT(*)::integer as review_count
    FROM reviews r
    WHERE r.status = 'active'
      AND r.created_at >= NOW() - (days_window || ' days')::INTERVAL
    GROUP BY r.location_id
  ),
  previous_period AS (
    SELECT 
      r.location_id,
      COUNT(*)::integer as review_count
    FROM reviews r
    WHERE r.status = 'active'
      AND r.created_at >= NOW() - (days_window * 2 || ' days')::INTERVAL
      AND r.created_at < NOW() - (days_window || ' days')::INTERVAL
    GROUP BY r.location_id
  )
  SELECT 
    l.id as location_id,
    l.name as location_name,
    l.address as location_address,
    COALESCE(cp.review_count, 0)::integer as review_count_current,
    COALESCE(pp.review_count, 0)::integer as review_count_previous,
    'up' as trend_direction,
    CASE 
      WHEN COALESCE(pp.review_count, 0) = 0 THEN 100.0
      ELSE ROUND(
        ((COALESCE(cp.review_count, 0) - COALESCE(pp.review_count, 0))::NUMERIC / 
        NULLIF(COALESCE(pp.review_count, 0), 0)::NUMERIC) * 100, 
        1
      )
    END as trend_percentage
  FROM locations l
  INNER JOIN current_period cp ON l.id = cp.location_id
  LEFT JOIN previous_period pp ON l.id = pp.location_id
  WHERE l.active = true
    -- Must have meaningful activity this period
    AND cp.review_count >= 2
    -- Must show growth (more reviews than last period)
    AND cp.review_count > COALESCE(pp.review_count, 0)
    -- Must have significant growth (at least 50% increase OR went from 0 to multiple reviews)
    AND (
      COALESCE(pp.review_count, 0) = 0 -- New buzz (0 to multiple reviews)
      OR (
        (cp.review_count - COALESCE(pp.review_count, 0))::NUMERIC / 
        NULLIF(COALESCE(pp.review_count, 0), 0)::NUMERIC >= 0.5 -- 50%+ growth
      )
    )
  ORDER BY 
    -- Prioritize percentage growth, then absolute growth
    trend_percentage DESC,
    (cp.review_count - COALESCE(pp.review_count, 0)) DESC
  LIMIT max_results;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (new.id);
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_locations_with_coords(search_query text, result_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, name text, address text, city text, state_province text, place_type text, latitude double precision, longitude double precision)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.address,
    l.city,
    l.state_province,
    l.place_type::text,
    ST_Y(l.coordinates::geometry) as latitude,
    ST_X(l.coordinates::geometry) as longitude
  FROM locations l
  WHERE (
    l.name ILIKE '%' || search_query || '%' OR
    l.address ILIKE '%' || search_query || '%' OR
    l.city ILIKE '%' || search_query || '%'
  )
    AND l.active = true
  ORDER BY 
    -- Prioritize name matches over address matches
    CASE 
      WHEN l.name ILIKE '%' || search_query || '%' THEN 1
      ELSE 2
    END,
    l.name
  LIMIT result_limit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_demographic_patterns()
 RETURNS TABLE(pattern_type text, pattern_value text, user_count bigint, avg_safety_rating numeric, sample_locations text[])
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Race/ethnicity patterns
  RETURN QUERY
  SELECT 
    'race_ethnicity' as pattern_type,
    race_val as pattern_value,
    COUNT(DISTINCT r.user_id) as user_count,
    ROUND(AVG(r.safety_rating), 2) as avg_safety_rating,
    array_agg(DISTINCT l.name ORDER BY l.name) as sample_locations
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id
  JOIN locations l ON r.location_id = l.id,
  LATERAL unnest(up.race_ethnicity) AS race_val
  WHERE r.status = 'active'
    AND up.race_ethnicity IS NOT NULL
  GROUP BY race_val
  HAVING COUNT(DISTINCT r.user_id) >= 1;

  -- Gender patterns  
  RETURN QUERY
  SELECT 
    'gender' as pattern_type,
    up.gender as pattern_value,
    COUNT(DISTINCT r.user_id) as user_count,
    ROUND(AVG(r.safety_rating), 2) as avg_safety_rating,
    array_agg(DISTINCT l.name ORDER BY l.name) as sample_locations
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id
  JOIN locations l ON r.location_id = l.id
  WHERE r.status = 'active'
    AND up.gender IS NOT NULL 
    AND up.gender != ''
  GROUP BY up.gender
  HAVING COUNT(DISTINCT r.user_id) >= 1;

  -- LGBTQ+ patterns
  RETURN QUERY
  SELECT 
    'lgbtq_status' as pattern_type,
    CASE WHEN up.lgbtq_status THEN 'LGBTQ+' ELSE 'Non-LGBTQ+' END as pattern_value,
    COUNT(DISTINCT r.user_id) as user_count,
    ROUND(AVG(r.safety_rating), 2) as avg_safety_rating,
    array_agg(DISTINCT l.name ORDER BY l.name) as sample_locations
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id
  JOIN locations l ON r.location_id = l.id
  WHERE r.status = 'active'
  GROUP BY up.lgbtq_status
  HAVING COUNT(DISTINCT r.user_id) >= 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_extract_ml_data()
 RETURNS TABLE(user_id uuid, location_id uuid, user_race_ethnicity text[], user_gender text, user_lgbtq_status boolean, location_name text, location_type text, safety_rating numeric, overall_rating numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    r.location_id,
    up.race_ethnicity,
    up.gender,
    up.lgbtq_status,
    l.name as location_name,
    l.place_type::text as location_type,
    r.safety_rating::numeric,  -- Explicit cast to numeric
    r.overall_rating::numeric  -- Explicit cast to numeric
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id
  JOIN locations l ON r.location_id = l.id
  WHERE r.status = 'active'
    AND up.race_ethnicity IS NOT NULL 
    AND up.gender IS NOT NULL
    AND up.gender != ''
  ORDER BY r.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_calculate_safety_scores()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Add logging
  RAISE NOTICE 'Trigger fired for location_id: %', NEW.location_id;
  
  -- Call the existing safety score calculation function
  PERFORM calculate_location_safety_scores(NEW.location_id);
  
  RAISE NOTICE 'Safety scores calculated for location_id: %', NEW.location_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

create type "public"."valid_detail" as ("valid" boolean, "reason" character varying, "location" geometry);

grant delete on table "public"."locations" to "anon";

grant insert on table "public"."locations" to "anon";

grant references on table "public"."locations" to "anon";

grant select on table "public"."locations" to "anon";

grant trigger on table "public"."locations" to "anon";

grant truncate on table "public"."locations" to "anon";

grant update on table "public"."locations" to "anon";

grant delete on table "public"."locations" to "authenticated";

grant insert on table "public"."locations" to "authenticated";

grant references on table "public"."locations" to "authenticated";

grant select on table "public"."locations" to "authenticated";

grant trigger on table "public"."locations" to "authenticated";

grant truncate on table "public"."locations" to "authenticated";

grant update on table "public"."locations" to "authenticated";

grant delete on table "public"."locations" to "service_role";

grant insert on table "public"."locations" to "service_role";

grant references on table "public"."locations" to "service_role";

grant select on table "public"."locations" to "service_role";

grant trigger on table "public"."locations" to "service_role";

grant truncate on table "public"."locations" to "service_role";

grant update on table "public"."locations" to "service_role";

grant delete on table "public"."ml_training_data" to "anon";

grant insert on table "public"."ml_training_data" to "anon";

grant references on table "public"."ml_training_data" to "anon";

grant select on table "public"."ml_training_data" to "anon";

grant trigger on table "public"."ml_training_data" to "anon";

grant truncate on table "public"."ml_training_data" to "anon";

grant update on table "public"."ml_training_data" to "anon";

grant delete on table "public"."ml_training_data" to "authenticated";

grant insert on table "public"."ml_training_data" to "authenticated";

grant references on table "public"."ml_training_data" to "authenticated";

grant select on table "public"."ml_training_data" to "authenticated";

grant trigger on table "public"."ml_training_data" to "authenticated";

grant truncate on table "public"."ml_training_data" to "authenticated";

grant update on table "public"."ml_training_data" to "authenticated";

grant delete on table "public"."ml_training_data" to "service_role";

grant insert on table "public"."ml_training_data" to "service_role";

grant references on table "public"."ml_training_data" to "service_role";

grant select on table "public"."ml_training_data" to "service_role";

grant trigger on table "public"."ml_training_data" to "service_role";

grant truncate on table "public"."ml_training_data" to "service_role";

grant update on table "public"."ml_training_data" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."review_votes" to "anon";

grant insert on table "public"."review_votes" to "anon";

grant references on table "public"."review_votes" to "anon";

grant select on table "public"."review_votes" to "anon";

grant trigger on table "public"."review_votes" to "anon";

grant truncate on table "public"."review_votes" to "anon";

grant update on table "public"."review_votes" to "anon";

grant delete on table "public"."review_votes" to "authenticated";

grant insert on table "public"."review_votes" to "authenticated";

grant references on table "public"."review_votes" to "authenticated";

grant select on table "public"."review_votes" to "authenticated";

grant trigger on table "public"."review_votes" to "authenticated";

grant truncate on table "public"."review_votes" to "authenticated";

grant update on table "public"."review_votes" to "authenticated";

grant delete on table "public"."review_votes" to "service_role";

grant insert on table "public"."review_votes" to "service_role";

grant references on table "public"."review_votes" to "service_role";

grant select on table "public"."review_votes" to "service_role";

grant trigger on table "public"."review_votes" to "service_role";

grant truncate on table "public"."review_votes" to "service_role";

grant update on table "public"."review_votes" to "service_role";

grant delete on table "public"."reviews" to "anon";

grant insert on table "public"."reviews" to "anon";

grant references on table "public"."reviews" to "anon";

grant select on table "public"."reviews" to "anon";

grant trigger on table "public"."reviews" to "anon";

grant truncate on table "public"."reviews" to "anon";

grant update on table "public"."reviews" to "anon";

grant delete on table "public"."reviews" to "authenticated";

grant insert on table "public"."reviews" to "authenticated";

grant references on table "public"."reviews" to "authenticated";

grant select on table "public"."reviews" to "authenticated";

grant trigger on table "public"."reviews" to "authenticated";

grant truncate on table "public"."reviews" to "authenticated";

grant update on table "public"."reviews" to "authenticated";

grant delete on table "public"."reviews" to "service_role";

grant insert on table "public"."reviews" to "service_role";

grant references on table "public"."reviews" to "service_role";

grant select on table "public"."reviews" to "service_role";

grant trigger on table "public"."reviews" to "service_role";

grant truncate on table "public"."reviews" to "service_role";

grant update on table "public"."reviews" to "service_role";

grant delete on table "public"."route_segments" to "anon";

grant insert on table "public"."route_segments" to "anon";

grant references on table "public"."route_segments" to "anon";

grant select on table "public"."route_segments" to "anon";

grant trigger on table "public"."route_segments" to "anon";

grant truncate on table "public"."route_segments" to "anon";

grant update on table "public"."route_segments" to "anon";

grant delete on table "public"."route_segments" to "authenticated";

grant insert on table "public"."route_segments" to "authenticated";

grant references on table "public"."route_segments" to "authenticated";

grant select on table "public"."route_segments" to "authenticated";

grant trigger on table "public"."route_segments" to "authenticated";

grant truncate on table "public"."route_segments" to "authenticated";

grant update on table "public"."route_segments" to "authenticated";

grant delete on table "public"."route_segments" to "service_role";

grant insert on table "public"."route_segments" to "service_role";

grant references on table "public"."route_segments" to "service_role";

grant select on table "public"."route_segments" to "service_role";

grant trigger on table "public"."route_segments" to "service_role";

grant truncate on table "public"."route_segments" to "service_role";

grant update on table "public"."route_segments" to "service_role";

grant delete on table "public"."safety_scores" to "anon";

grant insert on table "public"."safety_scores" to "anon";

grant references on table "public"."safety_scores" to "anon";

grant select on table "public"."safety_scores" to "anon";

grant trigger on table "public"."safety_scores" to "anon";

grant truncate on table "public"."safety_scores" to "anon";

grant update on table "public"."safety_scores" to "anon";

grant delete on table "public"."safety_scores" to "authenticated";

grant insert on table "public"."safety_scores" to "authenticated";

grant references on table "public"."safety_scores" to "authenticated";

grant select on table "public"."safety_scores" to "authenticated";

grant trigger on table "public"."safety_scores" to "authenticated";

grant truncate on table "public"."safety_scores" to "authenticated";

grant update on table "public"."safety_scores" to "authenticated";

grant delete on table "public"."safety_scores" to "service_role";

grant insert on table "public"."safety_scores" to "service_role";

grant references on table "public"."safety_scores" to "service_role";

grant select on table "public"."safety_scores" to "service_role";

grant trigger on table "public"."safety_scores" to "service_role";

grant truncate on table "public"."safety_scores" to "service_role";

grant update on table "public"."safety_scores" to "service_role";

grant delete on table "public"."spatial_ref_sys" to "anon";

grant insert on table "public"."spatial_ref_sys" to "anon";

grant references on table "public"."spatial_ref_sys" to "anon";

grant select on table "public"."spatial_ref_sys" to "anon";

grant trigger on table "public"."spatial_ref_sys" to "anon";

grant truncate on table "public"."spatial_ref_sys" to "anon";

grant update on table "public"."spatial_ref_sys" to "anon";

grant delete on table "public"."spatial_ref_sys" to "authenticated";

grant insert on table "public"."spatial_ref_sys" to "authenticated";

grant references on table "public"."spatial_ref_sys" to "authenticated";

grant select on table "public"."spatial_ref_sys" to "authenticated";

grant trigger on table "public"."spatial_ref_sys" to "authenticated";

grant truncate on table "public"."spatial_ref_sys" to "authenticated";

grant update on table "public"."spatial_ref_sys" to "authenticated";

grant delete on table "public"."spatial_ref_sys" to "postgres";

grant insert on table "public"."spatial_ref_sys" to "postgres";

grant references on table "public"."spatial_ref_sys" to "postgres";

grant select on table "public"."spatial_ref_sys" to "postgres";

grant trigger on table "public"."spatial_ref_sys" to "postgres";

grant truncate on table "public"."spatial_ref_sys" to "postgres";

grant update on table "public"."spatial_ref_sys" to "postgres";

grant delete on table "public"."spatial_ref_sys" to "service_role";

grant insert on table "public"."spatial_ref_sys" to "service_role";

grant references on table "public"."spatial_ref_sys" to "service_role";

grant select on table "public"."spatial_ref_sys" to "service_role";

grant trigger on table "public"."spatial_ref_sys" to "service_role";

grant truncate on table "public"."spatial_ref_sys" to "service_role";

grant update on table "public"."spatial_ref_sys" to "service_role";

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";

create policy "Admins can see all locations"
on "public"."locations"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));


create policy "Admins can update any location"
on "public"."locations"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));


create policy "Authenticated users can create locations"
on "public"."locations"
as permissive
for insert
to public
with check ((auth.uid() IS NOT NULL));


create policy "Locations are viewable by everyone"
on "public"."locations"
as permissive
for select
to public
using ((active = true));


create policy "Users can update own locations"
on "public"."locations"
as permissive
for update
to public
using ((auth.uid() = created_by));


create policy "ml_training_data readable by authenticated"
on "public"."ml_training_data"
as permissive
for select
to authenticated
using (true);


create policy "Users can insert own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Authenticated users can vote"
on "public"."review_votes"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can change their own votes"
on "public"."review_votes"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can delete their own votes"
on "public"."review_votes"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Votes are viewable by everyone"
on "public"."review_votes"
as permissive
for select
to public
using (true);


create policy "Active reviews are viewable by everyone"
on "public"."reviews"
as permissive
for select
to public
using ((status = 'active'::text));


create policy "Admins can insert reviews as any user"
on "public"."reviews"
as permissive
for insert
to authenticated
with check ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));


create policy "Admins can see all reviews"
on "public"."reviews"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));


create policy "Admins can update any review"
on "public"."reviews"
as permissive
for update
to authenticated
using ((EXISTS ( SELECT 1
   FROM user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));


create policy "Authenticated users can create reviews"
on "public"."reviews"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update own reviews"
on "public"."reviews"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "route_segments readable by all"
on "public"."route_segments"
as permissive
for select
to public
using (true);


create policy "Allow safety score calculation"
on "public"."safety_scores"
as permissive
for insert
to authenticated, anon
with check (true);


create policy "Allow safety score updates"
on "public"."safety_scores"
as permissive
for update
to authenticated, anon
using (true)
with check (true);


create policy "Safety scores are viewable by everyone"
on "public"."safety_scores"
as permissive
for select
to public
using (true);


create policy "Public profiles are viewable by everyone"
on "public"."user_profiles"
as permissive
for select
to public
using (true);


create policy "Users can insert own profile"
on "public"."user_profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update own profile"
on "public"."user_profiles"
as permissive
for update
to public
using ((auth.uid() = id));


CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER auto_calculate_safety_scores AFTER INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION trigger_calculate_safety_scores();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


