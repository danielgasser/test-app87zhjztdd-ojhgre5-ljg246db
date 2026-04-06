-- Migration: Add GiST index on neighborhood_stats boundary cast to geometry
-- ST_Contains casts boundary::geometry which prevented the existing geography
-- GiST index from being used, causing full table scans at ~1600ms per query.
-- This index on the cast expression reduces query time to ~3ms.

CREATE INDEX IF NOT EXISTS idx_neighborhood_stats_boundary_geom
ON public.neighborhood_stats
USING gist ((boundary::geometry));