ALTER TABLE user_profiles ADD COLUMN is_protected BOOLEAN DEFAULT false;

CREATE POLICY "Prevent role change on protected admins"
ON user_profiles
FOR UPDATE
USING (is_protected = false)
WITH CHECK (is_protected = false);