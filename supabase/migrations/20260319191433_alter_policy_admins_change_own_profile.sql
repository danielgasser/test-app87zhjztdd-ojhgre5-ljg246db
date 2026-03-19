DROP POLICY IF EXISTS "Prevent role change on protected admins" ON user_profiles;

CREATE POLICY "Prevent role change on protected admins"
ON user_profiles AS RESTRICTIVE
FOR UPDATE
USING (is_protected = false OR auth.uid() = id)
WITH CHECK (is_protected = false OR auth.uid() = id);