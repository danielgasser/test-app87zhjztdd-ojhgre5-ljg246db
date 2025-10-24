-- Function to update user's total_reviews count
CREATE OR REPLACE FUNCTION update_user_review_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger on reviews table
DROP TRIGGER IF EXISTS trigger_update_review_count ON reviews;
CREATE TRIGGER trigger_update_review_count
  AFTER INSERT OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_user_review_count();

-- Recalculate existing review counts
UPDATE user_profiles up
SET total_reviews = (
  SELECT COUNT(*) 
  FROM reviews r 
  WHERE r.user_id = up.id 
    AND r.status = 'active'
);
