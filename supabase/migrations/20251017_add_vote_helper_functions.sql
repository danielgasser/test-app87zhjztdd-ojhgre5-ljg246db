-- Migration: Add helper functions for review voting system
-- Created: 2025-10-17

-- Function to increment review count
CREATE OR REPLACE FUNCTION increment_review_count(review_id uuid, count_field text)
RETURNS void AS $$
BEGIN
  IF count_field = 'helpful_count' THEN
    UPDATE reviews SET helpful_count = helpful_count + 1 WHERE id = review_id;
  ELSIF count_field = 'unhelpful_count' THEN
    UPDATE reviews SET unhelpful_count = unhelpful_count + 1 WHERE id = review_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement review count
CREATE OR REPLACE FUNCTION decrement_review_count(review_id uuid, count_field text)
RETURNS void AS $$
BEGIN
  IF count_field = 'helpful_count' THEN
    UPDATE reviews SET helpful_count = GREATEST(helpful_count - 1, 0) WHERE id = review_id;
  ELSIF count_field = 'unhelpful_count' THEN
    UPDATE reviews SET unhelpful_count = GREATEST(unhelpful_count - 1, 0) WHERE id = review_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;