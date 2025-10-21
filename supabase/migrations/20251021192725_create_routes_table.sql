-- Create routes table for tracking user routes and navigation sessions
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Route details
    route_coordinates JSONB NOT NULL, -- Array of {latitude, longitude}
    origin_name TEXT NOT NULL,
    destination_name TEXT NOT NULL,
    distance_km NUMERIC(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    safety_score NUMERIC(3, 2), -- Overall safety score of route
    
    -- Navigation tracking
    navigation_started_at TIMESTAMPTZ,
    navigation_ended_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_routes_user_id ON public.routes(user_id);
CREATE INDEX idx_routes_active_navigation ON public.routes(user_id) 
    WHERE navigation_started_at IS NOT NULL AND navigation_ended_at IS NULL;
CREATE INDEX idx_routes_created_at ON public.routes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own routes"
    ON public.routes FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routes"
    ON public.routes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routes"
    ON public.routes FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own routes"
    ON public.routes FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_routes_updated_at
    BEFORE UPDATE ON public.routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE public.routes IS 'Stores user routes for navigation tracking and safety alerts';