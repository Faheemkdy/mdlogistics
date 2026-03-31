-- 1. Fix the missing column issue first
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Create a secure function to check admin status without triggering RLS loops
-- SECURITY DEFINER ensures this runs with database owner privileges, bypassing the recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 3. Clean up ALL existing policies on 'profiles' to remove the recursive ones
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by users and admins" ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by users and admins" ON profiles;

-- 4. Re-apply clean, non-recursive policies using the new helper function

-- SELECT: Users see their own profile, Admins see everyone
CREATE POLICY "Profiles are viewable by users and admins" ON profiles
FOR SELECT USING (
  auth.uid() = id OR is_admin()
);

-- UPDATE: Users update their own profile, Admins update everyone
CREATE POLICY "Profiles can be updated by users and admins" ON profiles
FOR UPDATE USING (
  auth.uid() = id OR is_admin()
);

-- INSERT: Allow users to create their own profile (needed for registration)
CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
);

-- DELETE: Only admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON profiles
FOR DELETE USING (
  is_admin()
);
