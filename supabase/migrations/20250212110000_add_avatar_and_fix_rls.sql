-- 1. Add avatar_url column to profiles if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Enable RLS on profiles (just in case)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 4. Create Comprehensive Policies

-- A. Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- B. Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- C. Admins can view ALL profiles (Fixes "Admin cannot see users list")
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- D. Admins can update ALL profiles (Fixes "Admin cannot edit users")
CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- E. Admins can delete profiles (Fixes "Admin cannot delete users")
CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Force Schema Cache Reload (Supabase specific trick)
NOTIFY pgrst, 'reload schema';
