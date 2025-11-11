-- Drop and recreate the function with vote weighting
DROP FUNCTION IF EXISTS public.calculate_location_safety_scores(uuid);

CREATE OR REPLACE FUNCTION public.calculate_location_safety_scores(p_location_id uuid)
RETURNS void
LANGUAGE plpgsql
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