-- Migration: Prevent users from updating their own role or is_protected flag
-- Regular users can update their own profile but not sensitive columns.
-- Only admins can change role. is_protected is already guarded by trigger.

-- Drop the existing permissive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Recreate it with column-level restriction
-- Users can update their own profile EXCEPT role and is_protected
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
TO public
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
  AND is_protected = (SELECT is_protected FROM public.user_profiles WHERE id = auth.uid())
);

-- Separate policy: only admins can change role
CREATE POLICY "Admins can update any profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);