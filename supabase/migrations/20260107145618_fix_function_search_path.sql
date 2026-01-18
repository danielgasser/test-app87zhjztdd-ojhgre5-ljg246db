-- Migration: Fix function search_path mutable security warning
-- Adds SET search_path = public to all SafePath functions
-- This prevents potential SQL injection via search_path manipulation
-- Created: 2025-01-07

-- ============================================================================
-- RECREATE ALL FUNCTIONS WITH IMMUTABLE search_path
-- ============================================================================

CREATE OR REPLACE FUNCTION public.batch_insert_neighborhood_stats(p_records jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  record JSONB;
  inserted_count INTEGER := 0;
BEGIN
  FOR record IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    INSERT INTO neighborhood_stats (
      block_group_fips,
      boundary,
      name,
      city,
      state_code,
      county_name,
      population,
      diversity_index,
      pct_minority,
      crime_rate_per_1000,
      violent_crime_rate,
      property_crime_rate,
      hate_crime_incidents,
      data_source,
      data_year
    ) VALUES (
      record->>'block_group_fips',
      ST_GeogFromText('SRID=4326;' || (record->>'boundary_wkt')),
      record->>'name',
      record->>'city',
      record->>'state_code',
      record->>'county_name',
      (record->>'population')::INTEGER,
      (record->>'diversity_index')::NUMERIC,
      (record->>'pct_minority')::NUMERIC,
      (record->>'crime_rate_per_1000')::NUMERIC,
      (record->>'violent_crime_rate')::NUMERIC,
      (record->>'property_crime_rate')::NUMERIC,
      (record->>'hate_crime_incidents')::INTEGER,
      record->>'data_source',
      (record->>'data_year')::INTEGER
    )
    ON CONFLICT (block_group_fips) DO UPDATE SET
      boundary = EXCLUDED.boundary,
      name = EXCLUDED.name,
      city = EXCLUDED.city,
      county_name = EXCLUDED.county_name,
      population = EXCLUDED.population,
      diversity_index = EXCLUDED.diversity_index,
      pct_minority = EXCLUDED.pct_minority,
      crime_rate_per_1000 = EXCLUDED.crime_rate_per_1000,
      violent_crime_rate = EXCLUDED.violent_crime_rate,
      property_crime_rate = EXCLUDED.property_crime_rate,
      hate_crime_incidents = EXCLUDED.hate_crime_incidents,
      data_source = EXCLUDED.data_source,
      data_year = EXCLUDED.data_year,
      updated_at = NOW();
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  RETURN inserted_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.calculate_location_safety_scores(p_location_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Delete existing scores for this location
  DELETE FROM safety_scores WHERE location_id = p_location_id;
  
  -- Calculate OVERALL scores (all users combined) with vote weighting
  INSERT INTO safety_scores (
    location_id, demographic_type, demographic_value,
    avg_safety_score, avg_comfort_score, avg_overall_score, review_count, last_review_date
  )
  SELECT 
    p_location_id, 'overall', null,
    -- Weighted averages based on helpful votes
    (SUM(r.safety_rating * GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)) / 
     SUM(GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)))::numeric,
    (SUM(r.comfort_rating * GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)) / 
     SUM(GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)))::numeric,
    (SUM(r.overall_rating * GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)) / 
     SUM(GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)))::numeric,
    COUNT(*)::integer,
    MAX(r.created_at)
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id
  WHERE r.location_id = p_location_id 
    AND r.status = 'active'
    -- Filter out spam reviews (negative vote ratio)
    AND (1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2)) > 0
  HAVING COUNT(*) > 0
  ON CONFLICT (location_id, demographic_type, demographic_value) 
  DO UPDATE SET
    avg_safety_score = EXCLUDED.avg_safety_score,
    avg_comfort_score = EXCLUDED.avg_comfort_score,
    avg_overall_score = EXCLUDED.avg_overall_score,
    review_count = EXCLUDED.review_count,
    last_review_date = EXCLUDED.last_review_date,
    calculated_at = now();

  -- Calculate RACE/ETHNICITY specific scores with vote weighting
  INSERT INTO safety_scores (
    location_id, demographic_type, demographic_value,
    avg_safety_score, avg_comfort_score, avg_overall_score, review_count, last_review_date
  )
  SELECT 
    p_location_id, 'race_ethnicity', race_val,
    (SUM(r.safety_rating * GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)) / 
     SUM(GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)))::numeric,
    (SUM(r.comfort_rating * GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)) / 
     SUM(GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)))::numeric,
    (SUM(r.overall_rating * GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)) / 
     SUM(GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)))::numeric,
    COUNT(*)::integer,
    MAX(r.created_at)
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id,
  LATERAL unnest(up.race_ethnicity) AS race_val
  WHERE r.location_id = p_location_id 
    AND r.status = 'active'
    AND up.race_ethnicity IS NOT NULL 
    AND array_length(up.race_ethnicity, 1) > 0
    AND (1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2)) > 0
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

  -- Calculate GENDER specific scores with vote weighting
  INSERT INTO safety_scores (
    location_id, demographic_type, demographic_value,
    avg_safety_score, avg_comfort_score, avg_overall_score, review_count, last_review_date
  )
  SELECT 
    p_location_id, 'gender', up.gender,
    (SUM(r.safety_rating * GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)) / 
     SUM(GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)))::numeric,
    (SUM(r.comfort_rating * GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)) / 
     SUM(GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)))::numeric,
    (SUM(r.overall_rating * GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)) / 
     SUM(GREATEST(1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2), 0.1)))::numeric,
    COUNT(*)::integer,
    MAX(r.created_at)
  FROM reviews r
  JOIN user_profiles up ON r.user_id = up.id
  WHERE r.location_id = p_location_id 
    AND r.status = 'active'
    AND up.gender IS NOT NULL 
    AND up.gender != ''
    AND (1 + (COALESCE(r.helpful_count, 0) * 0.1) - (COALESCE(r.unhelpful_count, 0) * 0.2)) > 0
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
$function$;


CREATE OR REPLACE FUNCTION public.calculate_time_of_day(visit_time timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  hour INTEGER;
BEGIN
  hour := EXTRACT(HOUR FROM visit_time);
  
  IF hour >= 6 AND hour < 12 THEN
    RETURN 'morning';
  ELSIF hour >= 12 AND hour < 18 THEN
    RETURN 'afternoon';
  ELSIF hour >= 18 AND hour < 22 THEN
    RETURN 'evening';
  ELSE
    RETURN 'night';
  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.cleanup_old_notification_logs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  DELETE FROM notification_logs
  WHERE sent_at < NOW() - INTERVAL '30 days';
END;
$function$;


CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  DELETE FROM website_signup_rate_limits
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$function$;


CREATE OR REPLACE FUNCTION public.cleanup_search_history()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.search_history
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY searched_at DESC) as rn
      FROM public.search_history
    ) ranked
    WHERE rn > 100
  );
END;
$function$;


CREATE OR REPLACE FUNCTION public.decrement_prediction_vote_count(p_location_id uuid, p_demographic_type text, p_demographic_value text, p_count_field text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF p_count_field = 'accurate_count' THEN
    UPDATE safety_scores 
    SET accurate_count = GREATEST(accurate_count - 1, 0)
    WHERE location_id = p_location_id
      AND demographic_type = p_demographic_type
      AND (demographic_value = p_demographic_value OR (demographic_value IS NULL AND p_demographic_value IS NULL));
  ELSIF p_count_field = 'inaccurate_count' THEN
    UPDATE safety_scores 
    SET inaccurate_count = GREATEST(inaccurate_count - 1, 0)
    WHERE location_id = p_location_id
      AND demographic_type = p_demographic_type
      AND (demographic_value = p_demographic_value OR (demographic_value IS NULL AND p_demographic_value IS NULL));
  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.decrement_review_count(review_id uuid, count_field text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF count_field = 'helpful_count' THEN
    UPDATE reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = review_id;
  ELSIF count_field = 'unhelpful_count' THEN
    UPDATE reviews SET unhelpful_count = GREATEST(unhelpful_count - 1, 0) WHERE id = review_id;
  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.extract_ml_training_data()
 RETURNS TABLE(user_id uuid, location_id uuid, user_race_ethnicity text[], user_gender text, user_lgbtq_status boolean, user_religion text, user_age_range text, location_type text, location_latitude numeric, location_longitude numeric, safety_rating numeric, comfort_rating numeric, overall_rating numeric, review_created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.find_similar_users(target_user_id uuid, similarity_threshold numeric DEFAULT 0.6)
 RETURNS TABLE(similar_user_id uuid, similarity_score numeric, shared_demographics text[])
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.get_basic_ml_recommendations(target_user_id uuid, max_recommendations integer DEFAULT 5)
 RETURNS TABLE(location_id uuid, location_name text, predicted_safety_score numeric, confidence_score numeric, similar_user_count integer, recommendation_reason text)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.get_discrimination_patterns(p_location_id uuid DEFAULT NULL::uuid, p_threshold numeric DEFAULT 1.5)
 RETURNS TABLE(location_id uuid, location_name text, pattern_type text, severity text, affected_demographics text[], evidence jsonb, recommendation text)
 LANGUAGE sql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.get_location_time_safety(p_location_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'morning', json_build_object(
      'avg_safety', ROUND(AVG(CASE WHEN time_of_day = 'morning' THEN safety_rating END)::numeric, 1),
      'review_count', COUNT(CASE WHEN time_of_day = 'morning' THEN 1 END)
    ),
    'afternoon', json_build_object(
      'avg_safety', ROUND(AVG(CASE WHEN time_of_day = 'afternoon' THEN safety_rating END)::numeric, 1),
      'review_count', COUNT(CASE WHEN time_of_day = 'afternoon' THEN 1 END)
    ),
    'evening', json_build_object(
      'avg_safety', ROUND(AVG(CASE WHEN time_of_day = 'evening' THEN safety_rating END)::numeric, 1),
      'review_count', COUNT(CASE WHEN time_of_day = 'evening' THEN 1 END)
    ),
    'night', json_build_object(
      'avg_safety', ROUND(AVG(CASE WHEN time_of_day = 'night' THEN safety_rating END)::numeric, 1),
      'review_count', COUNT(CASE WHEN time_of_day = 'night' THEN 1 END)
    ),
    'total_with_time', COUNT(time_of_day)
  ) INTO v_result
  FROM reviews
  WHERE location_id = p_location_id
    AND status = 'active';

  RETURN v_result;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_location_with_coords(location_id uuid)
 RETURNS TABLE(id uuid, name text, address text, city text, state_province text, country text, place_type text, latitude double precision, longitude double precision, avg_safety_score numeric, avg_comfort_score numeric, avg_overall_score numeric, review_count integer, verified boolean, active boolean, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.get_ml_recommendations_for_user(target_user_id uuid, user_lat numeric DEFAULT NULL::numeric, user_lng numeric DEFAULT NULL::numeric, max_distance_meters integer DEFAULT 50000)
 RETURNS TABLE(location_id uuid, location_name text, predicted_safety_score numeric, confidence_score numeric, similar_user_count integer, recommendation_reason text, distance_meters integer)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.get_nearby_locations(lat double precision, lng double precision, radius_meters integer DEFAULT 5000)
 RETURNS TABLE(id uuid, name text, address text, place_type text, distance_meters integer, avg_safety_score numeric, latitude double precision, longitude double precision)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.get_nearby_locations_for_user(lat double precision, lng double precision, user_race_ethnicity text[] DEFAULT NULL::text[], user_gender text DEFAULT NULL::text, user_lgbtq_status boolean DEFAULT NULL::boolean, radius_meters integer DEFAULT 5000)
 RETURNS TABLE(id uuid, name text, address text, place_type text, distance_meters integer, avg_safety_score numeric, demographic_safety_score numeric, latitude double precision, longitude double precision)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.get_nearby_reviews(lat double precision, lng double precision, radius_meters integer DEFAULT 10000, review_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, user_id uuid, location_id uuid, title text, content text, safety_rating numeric, overall_rating numeric, created_at timestamp with time zone, location_name text, location_address text, location_latitude double precision, location_longitude double precision, distance_meters double precision, user_full_name text, user_show_demographics boolean, user_race_ethnicity text[], user_gender text, user_lgbtq_status boolean, user_disability_status text[], helpful_count integer, unhelpful_count integer)
 LANGUAGE plpgsql
 SET search_path = public
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


CREATE OR REPLACE FUNCTION public.get_neighborhood_stats(p_latitude numeric, p_longitude numeric, p_radius_meters integer DEFAULT 500)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_result JSON;
BEGIN
  -- Find the census block group that contains this point
  SELECT json_build_object(
    'block_group_fips', ns.block_group_fips,
    'name', ns.name,
    'city', ns.city,
    'county_name', ns.county_name,
    'state_code', ns.state_code,
    'population', ns.population,
    'diversity_index', ns.diversity_index,
    'pct_minority', ns.pct_minority,
    'crime_rate_per_1000', ns.crime_rate_per_1000,
    'violent_crime_rate', ns.violent_crime_rate,
    'property_crime_rate', ns.property_crime_rate,
    'hate_crime_incidents', ns.hate_crime_incidents,
    'walkability_score', ns.walkability_score,
    'data_source', ns.data_source,
    'data_year', ns.data_year
  ) INTO v_result
  FROM neighborhood_stats ns
  WHERE ST_Contains(
    ns.boundary::geometry,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
  )
  LIMIT 1;

  RETURN v_result;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_neighborhood_stats_for_point(lat double precision, lng double precision)
 RETURNS TABLE(block_group_fips character, name text, city text, state_code character, population integer, crime_rate_per_1000 numeric, violent_crime_rate numeric, property_crime_rate numeric, hate_crime_incidents integer, diversity_index numeric, pct_minority numeric, walkability_score integer, police_response_min numeric, data_source text)
 LANGUAGE plpgsql
 STABLE
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ns.block_group_fips,
    ns.name,
    ns.city,
    ns.state_code,
    ns.population,
    ns.crime_rate_per_1000,
    ns.violent_crime_rate,
    ns.property_crime_rate,
    ns.hate_crime_incidents,
    ns.diversity_index,
    ns.pct_minority,
    ns.walkability_score,
    ns.police_response_min,
    ns.data_source
  FROM neighborhood_stats ns
  WHERE ST_Contains(ns.boundary::geometry, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  LIMIT 1;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_safety_insights(user_lat double precision DEFAULT NULL::double precision, user_lng double precision DEFAULT NULL::double precision, radius_meters integer DEFAULT 50000, max_results integer DEFAULT 5)
 RETURNS TABLE(insight_type text, message text, location_id uuid, location_name text, location_address text, severity text, created_at timestamp with time zone, change_value numeric)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.get_trending_locations(days_window integer DEFAULT 7, max_results integer DEFAULT 5)
 RETURNS TABLE(location_id uuid, location_name text, location_address text, review_count_current integer, review_count_previous integer, trend_direction text, trend_percentage numeric)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.get_user_activity_stats(p_user_id uuid)
 RETURNS TABLE(review_count integer, route_count integer)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (
      SELECT COUNT(*)::integer 
      FROM reviews r 
      WHERE r.user_id = p_user_id 
        AND r.status = 'active'
    ) as review_count,
    (
      SELECT COUNT(*)::integer 
      FROM routes rt 
      WHERE rt.user_id = p_user_id
    ) as route_count;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_user_public_profile(profile_user_id uuid)
 RETURNS TABLE(user_id uuid, full_name text, avatar_url text, race_ethnicity text[], gender text, lgbtq_status boolean, disability_status text[], religion text, age_range text, privacy_level text, show_demographics boolean, total_reviews integer, created_at timestamp with time zone, is_public boolean)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    up.id as user_id,
    up.full_name,
    up.avatar_url,
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
$function$;


CREATE OR REPLACE FUNCTION public.get_user_public_reviews(profile_user_id uuid, review_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, location_id uuid, location_name text, location_address text, overall_rating numeric, safety_rating numeric, title text, content text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.location_id,
    l.name as location_name,
    l.address as location_address,
    r.overall_rating::numeric,
    r.safety_rating::numeric,
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
$function$;


CREATE OR REPLACE FUNCTION public.get_user_vote_stats(p_user_id uuid)
 RETURNS TABLE(helpful_votes_given integer, unhelpful_votes_given integer, total_votes_given integer)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 'helpful')::integer as helpful_votes_given,
    COUNT(*) FILTER (WHERE vote_type = 'unhelpful')::integer as unhelpful_votes_given,
    COUNT(*)::integer as total_votes_given
  FROM review_votes
  WHERE user_id = p_user_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, onboarding_complete, demographics)
  VALUES (NEW.id, false, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.increment_prediction_vote_count(p_location_id uuid, p_demographic_type text, p_demographic_value text, p_count_field text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF p_count_field = 'accurate_count' THEN
    UPDATE safety_scores 
    SET accurate_count = accurate_count + 1 
    WHERE location_id = p_location_id 
      AND demographic_type = p_demographic_type
      AND (demographic_value = p_demographic_value OR (demographic_value IS NULL AND p_demographic_value IS NULL));
  ELSIF p_count_field = 'inaccurate_count' THEN
    UPDATE safety_scores 
    SET inaccurate_count = inaccurate_count + 1 
    WHERE location_id = p_location_id 
      AND demographic_type = p_demographic_type
      AND (demographic_value = p_demographic_value OR (demographic_value IS NULL AND p_demographic_value IS NULL));
  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.increment_review_count(review_id uuid, count_field text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF count_field = 'helpful_count' THEN
    UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = review_id;
  ELSIF count_field = 'unhelpful_count' THEN
    UPDATE reviews SET unhelpful_count = unhelpful_count + 1 WHERE id = review_id;
  END IF;
END;
$function$;


CREATE OR REPLACE FUNCTION public.search_locations_with_coords(search_query text, result_limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, name text, address text, city text, state_province text, place_type text, latitude double precision, longitude double precision)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.set_time_of_day()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF NEW.visited_at IS NOT NULL THEN
    NEW.time_of_day := calculate_time_of_day(NEW.visited_at);
  END IF;
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.test_demographic_patterns()
 RETURNS TABLE(pattern_type text, pattern_value text, user_count bigint, avg_safety_rating numeric, sample_locations text[])
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.test_extract_ml_data()
 RETURNS TABLE(user_id uuid, location_id uuid, user_race_ethnicity text[], user_gender text, user_lgbtq_status boolean, location_name text, location_type text, safety_rating numeric, overall_rating numeric)
 LANGUAGE plpgsql
 SET search_path = public
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
$function$;


CREATE OR REPLACE FUNCTION public.trigger_calculate_safety_scores()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  -- Add logging
  RAISE NOTICE 'Trigger fired for location_id: %', NEW.location_id;
  
  -- Call the existing safety score calculation function
  PERFORM calculate_location_safety_scores(NEW.location_id);
  
  RAISE NOTICE 'Safety scores calculated for location_id: %', NEW.location_id;
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.update_user_review_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment count when review is created
    UPDATE user_profiles 
    SET total_reviews = total_reviews + 1 
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count when review is deleted
    UPDATE user_profiles 
    SET total_reviews = GREATEST(total_reviews - 1, 0) 
    WHERE id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$function$;


-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify all functions now have search_path set:
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND proconfig IS NOT NULL
--   AND 'search_path=public' = ANY(proconfig);