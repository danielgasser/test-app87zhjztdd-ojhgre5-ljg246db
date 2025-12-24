-- Create function to calculate time_of_day from visited_at
CREATE OR REPLACE FUNCTION calculate_time_of_day(visit_time TIMESTAMPTZ)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to auto-set time_of_day when visited_at is set
CREATE OR REPLACE FUNCTION set_time_of_day()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visited_at IS NOT NULL THEN
    NEW.time_of_day := calculate_time_of_day(NEW.visited_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_set_time_of_day
BEFORE INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION set_time_of_day();

-- Backfill existing reviews
UPDATE reviews 
SET time_of_day = calculate_time_of_day(visited_at)
WHERE visited_at IS NOT NULL;