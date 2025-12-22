-- Migration: Premium Features Tables
-- Description: Add tables for saved locations, search history, and recently viewed
-- Date: 2024-12-22

-- ============================================================================
-- SAVED LOCATIONS (Favorites/Bookmarks)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.saved_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Can reference existing location OR store Google Place data
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  google_place_id TEXT,
  
  -- Denormalized data for quick display (avoids joins)
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- User customization
  nickname TEXT,  -- User's custom name for this place
  notes TEXT,     -- User's private notes
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: Either location_id OR google_place_id must be set
  CONSTRAINT saved_locations_has_reference CHECK (
    location_id IS NOT NULL OR google_place_id IS NOT NULL
  ),
  -- Prevent duplicate saves
  CONSTRAINT saved_locations_unique_location UNIQUE (user_id, location_id),
  CONSTRAINT saved_locations_unique_google UNIQUE (user_id, google_place_id)
);

-- Indexes
CREATE INDEX idx_saved_locations_user ON public.saved_locations(user_id);
CREATE INDEX idx_saved_locations_created ON public.saved_locations(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.saved_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved locations"
  ON public.saved_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved locations"
  ON public.saved_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved locations"
  ON public.saved_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved locations"
  ON public.saved_locations FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_saved_locations_updated_at
  BEFORE UPDATE ON public.saved_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- SEARCH HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What was searched
  query TEXT NOT NULL,
  
  -- What was selected (if any)
  selected_place_id TEXT,      -- Google Place ID if selected from results
  selected_location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  selected_name TEXT,
  selected_latitude DECIMAL(10, 8),
  selected_longitude DECIMAL(11, 8),
  
  -- Context
  search_context TEXT DEFAULT 'map',  -- 'map', 'route_origin', 'route_destination'
  
  -- Metadata
  searched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_search_history_user ON public.search_history(user_id);
CREATE INDEX idx_search_history_recent ON public.search_history(user_id, searched_at DESC);
CREATE INDEX idx_search_history_query ON public.search_history(user_id, query);

-- RLS Policies
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON public.search_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON public.search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history"
  ON public.search_history FOR DELETE
  USING (auth.uid() = user_id);

-- No update policy - search history is immutable


-- ============================================================================
-- RECENTLY VIEWED LOCATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What was viewed
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  google_place_id TEXT,
  
  -- Denormalized for quick display
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metadata
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_count INTEGER DEFAULT 1,  -- Track how many times viewed
  
  -- Constraints
  CONSTRAINT recently_viewed_has_reference CHECK (
    location_id IS NOT NULL OR google_place_id IS NOT NULL
  )
);

-- Unique constraint to upsert on re-view
CREATE UNIQUE INDEX idx_recently_viewed_unique_location 
  ON public.recently_viewed(user_id, location_id) 
  WHERE location_id IS NOT NULL;

CREATE UNIQUE INDEX idx_recently_viewed_unique_google 
  ON public.recently_viewed(user_id, google_place_id) 
  WHERE google_place_id IS NOT NULL;

-- Query indexes
CREATE INDEX idx_recently_viewed_user ON public.recently_viewed(user_id);
CREATE INDEX idx_recently_viewed_recent ON public.recently_viewed(user_id, viewed_at DESC);

-- RLS Policies
ALTER TABLE public.recently_viewed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recently viewed"
  ON public.recently_viewed FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recently viewed"
  ON public.recently_viewed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recently viewed"
  ON public.recently_viewed FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recently viewed"
  ON public.recently_viewed FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to upsert recently viewed (updates viewed_at and increments count if exists)
CREATE OR REPLACE FUNCTION upsert_recently_viewed(
  p_user_id UUID,
  p_location_id UUID DEFAULT NULL,
  p_google_place_id TEXT DEFAULT NULL,
  p_name TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Try to update existing record
  IF p_location_id IS NOT NULL THEN
    UPDATE public.recently_viewed
    SET viewed_at = NOW(),
        view_count = view_count + 1,
        name = COALESCE(p_name, name),
        address = COALESCE(p_address, address)
    WHERE user_id = p_user_id AND location_id = p_location_id
    RETURNING id INTO v_id;
  ELSIF p_google_place_id IS NOT NULL THEN
    UPDATE public.recently_viewed
    SET viewed_at = NOW(),
        view_count = view_count + 1,
        name = COALESCE(p_name, name),
        address = COALESCE(p_address, address)
    WHERE user_id = p_user_id AND google_place_id = p_google_place_id
    RETURNING id INTO v_id;
  END IF;

  -- If no update, insert new record
  IF v_id IS NULL THEN
    INSERT INTO public.recently_viewed (
      user_id, location_id, google_place_id, name, address, latitude, longitude
    ) VALUES (
      p_user_id, p_location_id, p_google_place_id, p_name, p_address, p_latitude, p_longitude
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

-- Function to clean up old search history (keep last 100 per user)
CREATE OR REPLACE FUNCTION cleanup_search_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to clean up old recently viewed (keep last 50 per user)
CREATE OR REPLACE FUNCTION cleanup_recently_viewed()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.recently_viewed
  WHERE id IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY viewed_at DESC) as rn
      FROM public.recently_viewed
    ) ranked
    WHERE rn > 50
  );
END;
$$;


-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_locations TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recently_viewed TO authenticated;

GRANT EXECUTE ON FUNCTION upsert_recently_viewed TO authenticated;