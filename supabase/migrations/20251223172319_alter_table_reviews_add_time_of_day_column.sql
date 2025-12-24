ALTER TABLE reviews 
ADD COLUMN time_of_day TEXT 
CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night'));