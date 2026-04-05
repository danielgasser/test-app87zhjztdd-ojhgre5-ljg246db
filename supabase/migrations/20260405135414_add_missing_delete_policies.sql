-- Migration: Add missing DELETE policies for locations and reviews.
-- adminDeleteLocation and adminDeleteReview were silently failing due to
-- no DELETE policy existing on either table.

-- Locations: admins only
CREATE POLICY "Admins can delete any location"
ON public.locations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Reviews: admins only
CREATE POLICY "Admins can delete any review"
ON public.reviews
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);