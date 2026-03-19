CREATE OR REPLACE FUNCTION prevent_is_protected_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_protected IS DISTINCT FROM OLD.is_protected THEN
    IF auth.uid() != 'b62b4b7b-2116-4741-b1ff-20f1270e0f7b'::uuid THEN
      RAISE EXCEPTION 'Only the owner can modify is_protected';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guard_is_protected
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_is_protected_change();