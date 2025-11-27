

CREATE OR REPLACE FUNCTION batch_insert_neighborhood_stats(
  p_records JSONB
)
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION batch_insert_neighborhood_stats TO service_role;

COMMENT ON FUNCTION batch_insert_neighborhood_stats IS 
'Batch inserts/updates neighborhood_stats records from JSONB array. Returns count of processed records.';
