-- Migration: Add delete_user_account RPC function
-- Created: 2026-06-29

CREATE OR REPLACE FUNCTION delete_user_account(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the person calling this function is an admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Only admins can delete accounts.';
  END IF;

  -- Delete from auth.users (which cascades to public.profiles and sets null to other tables)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$;
