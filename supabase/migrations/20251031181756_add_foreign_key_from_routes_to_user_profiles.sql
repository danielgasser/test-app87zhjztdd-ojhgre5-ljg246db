-- Add foreign key from routes to user_profiles
ALTER TABLE public.routes 
  ADD CONSTRAINT routes_user_profile_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.user_profiles(id) 
  ON DELETE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';