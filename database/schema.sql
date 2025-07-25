-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  address text NOT NULL,
  city text NOT NULL,
  state_province text NOT NULL,
  country text NOT NULL DEFAULT 'US'::text,
  postal_code text,
  coordinates USER-DEFINED NOT NULL,
  place_type USER-DEFINED NOT NULL,
  tags ARRAY,
  google_place_id text UNIQUE,
  created_by uuid,
  verified boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  place_type_backup text,
  CONSTRAINT locations_pkey PRIMARY KEY (id),
  CONSTRAINT locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.ml_training_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  location_id uuid,
  demographic_features jsonb,
  safety_metrics jsonb,
  temporal_features jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ml_training_data_pkey PRIMARY KEY (id),
  CONSTRAINT ml_training_data_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid UNIQUE,
  demographics jsonb DEFAULT '{}'::jsonb,
  onboarding_complete boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.review_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type text NOT NULL CHECK (vote_type = ANY (ARRAY['helpful'::text, 'unhelpful'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT review_votes_pkey PRIMARY KEY (id),
  CONSTRAINT review_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.reviews(id)
);
CREATE TABLE public.reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  overall_rating numeric NOT NULL CHECK (overall_rating >= 1::numeric AND overall_rating <= 5::numeric),
  safety_rating integer NOT NULL CHECK (safety_rating >= 1 AND safety_rating <= 5),
  comfort_rating integer NOT NULL CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
  accessibility_rating integer CHECK (accessibility_rating >= 1 AND accessibility_rating <= 5),
  service_rating integer CHECK (service_rating >= 1 AND service_rating <= 5),
  visit_type text CHECK (visit_type = ANY (ARRAY['solo'::text, 'couple'::text, 'family'::text, 'group'::text, 'business'::text])),
  photo_urls ARRAY,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'flagged'::text, 'hidden'::text, 'deleted'::text])),
  flag_count integer DEFAULT 0,
  helpful_count integer DEFAULT 0,
  unhelpful_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  visited_at timestamp with time zone,
  CONSTRAINT reviews_pkey PRIMARY KEY (id),
  CONSTRAINT reviews_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.route_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  start_point USER-DEFINED,
  end_point USER-DEFINED,
  path USER-DEFINED,
  demographic_type text,
  demographic_value text,
  safety_score numeric,
  last_calculated timestamp with time zone DEFAULT now(),
  CONSTRAINT route_segments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.safety_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL,
  demographic_type text NOT NULL CHECK (demographic_type = ANY (ARRAY['race_ethnicity'::text, 'gender'::text, 'lgbtq'::text, 'disability'::text, 'religion'::text, 'age'::text, 'overall'::text])),
  demographic_value text,
  avg_safety_score numeric CHECK (avg_safety_score >= 1::numeric AND avg_safety_score <= 5::numeric),
  avg_comfort_score numeric CHECK (avg_comfort_score >= 1::numeric AND avg_comfort_score <= 5::numeric),
  avg_overall_score numeric CHECK (avg_overall_score >= 1::numeric AND avg_overall_score <= 5::numeric),
  review_count integer DEFAULT 0,
  last_review_date timestamp with time zone,
  calculated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT safety_scores_pkey PRIMARY KEY (id),
  CONSTRAINT safety_scores_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.spatial_ref_sys (
  srid integer NOT NULL CHECK (srid > 0 AND srid <= 998999),
  auth_name character varying,
  auth_srid integer,
  srtext character varying,
  proj4text character varying,
  CONSTRAINT spatial_ref_sys_pkey PRIMARY KEY (srid)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  race_ethnicity ARRAY,
  gender text,
  lgbtq_status boolean,
  disability_status ARRAY,
  religion text,
  age_range text,
  privacy_level text DEFAULT 'public'::text CHECK (privacy_level = ANY (ARRAY['public'::text, 'anonymous'::text, 'private'::text])),
  show_demographics boolean DEFAULT true,
  total_reviews integer DEFAULT 0,
  helpful_votes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);