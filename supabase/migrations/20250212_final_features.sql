-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. STORAGE SETUP for Avatars
-- Create a new bucket called 'avatars'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'avatars' AND auth.uid() = owner );

-- 2. PASSWORD RESET FUNCTION (RPC)
-- This allows an Admin to update another user's password securely via SQL
CREATE OR REPLACE FUNCTION update_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with superuser privileges
AS $$
BEGIN
  -- Check if the executor is an admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access Denied: Only Admins can reset passwords.';
  END IF;

  -- Update the password in auth.users
  -- NOTE: We use pgcrypto's crypt() function to hash the password compatible with Supabase Auth
  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_user_id;
END;
$$;
