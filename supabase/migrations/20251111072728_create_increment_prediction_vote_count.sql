-- Helper function to increment prediction vote count
CREATE OR REPLACE FUNCTION increment_prediction_vote_count(
  p_location_id uuid, 
  p_demographic_type text,
  p_demographic_value text,
  p_count_field text
)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to decrement prediction vote count
CREATE OR REPLACE FUNCTION decrement_prediction_vote_count(
  p_location_id uuid,
  p_demographic_type text,
  p_demographic_value text,
  p_count_field text
)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;