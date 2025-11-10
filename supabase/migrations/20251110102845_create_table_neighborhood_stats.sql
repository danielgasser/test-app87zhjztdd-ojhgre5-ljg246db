-- Create neighborhood_stats table with PostGIS geometry
CREATE TABLE neighborhood_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Census Block Group identifier (12-character FIPS code)
  block_group_fips CHAR(12) NOT NULL UNIQUE,
  
  -- Spatial boundary for containment queries
  boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,
  
  -- Location identifiers
  city TEXT NOT NULL,
  state_code CHAR(2) NOT NULL,  -- FL, CA, NY, etc.
  county_name TEXT,
  
  -- Basic demographics
  population INTEGER,
  diversity_index NUMERIC(3,2),  -- 0.00 to 1.00
  pct_minority NUMERIC(5,2),     -- 0.00 to 100.00
  
  -- Crime statistics (per 1,000 residents)
  crime_rate_per_1000 NUMERIC(6,2),
  violent_crime_rate NUMERIC(6,2),
  property_crime_rate NUMERIC(6,2),
  hate_crime_incidents INTEGER DEFAULT 0,
  
  -- Optional infrastructure metrics
  walkability_score INTEGER CHECK (walkability_score BETWEEN 0 AND 100),
  police_response_min NUMERIC(4,1),
  
  -- Data provenance
  data_source TEXT,  -- e.g., "FBI UCR 2023", "Census 2020"
  data_year INTEGER,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure Florida data first
  CHECK (state_code IN ('FL', 'TX', 'CA', 'NY', 'GA'))  -- Expandable list
);

-- Create spatial index for fast containment queries
CREATE INDEX idx_neighborhood_stats_boundary 
ON neighborhood_stats USING GIST(boundary);

-- Create index for block group lookups
CREATE INDEX idx_neighborhood_stats_fips 
ON neighborhood_stats(block_group_fips);

-- Create index for city queries (for data seeding)
CREATE INDEX idx_neighborhood_stats_city 
ON neighborhood_stats(city, state_code);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_neighborhood_stats_updated_at
  BEFORE UPDATE ON neighborhood_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();