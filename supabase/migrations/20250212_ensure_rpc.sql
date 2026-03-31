-- Secure function to allow Admins to reset other users' passwords
-- This is required for the "Key" icon in User Management to work

CREATE OR REPLACE FUNCTION update_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the person calling this function is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admins can reset passwords.';
  END IF;

  -- Update the user's password in the auth.users table
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;
