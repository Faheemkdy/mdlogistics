-- 1. Create missing security helper functions first (to prevent ERROR 42883)
CREATE OR REPLACE FUNCTION public.is_admin_v3()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_md_v3()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND username = 'md'
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff_v3()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_active = true
  );
$$;


-- 2. Optimize Companies Write Policies (using the functions defined above)
DROP POLICY IF EXISTS "Admin can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admin can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admin can delete companies" ON public.companies;

CREATE POLICY "Admin insert companies v3" ON public.companies 
  FOR INSERT TO authenticated WITH CHECK (is_admin_v3());

CREATE POLICY "Admin update companies v3" ON public.companies 
  FOR UPDATE TO authenticated USING (is_admin_v3());

CREATE POLICY "Admin delete companies v3" ON public.companies 
  FOR DELETE TO authenticated USING (is_admin_v3());


-- 3. Optimize Shops Write Policies (using the functions defined above)
DROP POLICY IF EXISTS "Admin can insert shops" ON public.shops;
DROP POLICY IF EXISTS "Admin can update shops" ON public.shops;
DROP POLICY IF EXISTS "Admin can delete shops" ON public.shops;

CREATE POLICY "Admin insert shops v3" ON public.shops 
  FOR INSERT TO authenticated WITH CHECK (is_admin_v3());

CREATE POLICY "Admin update shops v3" ON public.shops 
  FOR UPDATE TO authenticated USING (is_admin_v3());

CREATE POLICY "Admin delete shops v3" ON public.shops 
  FOR DELETE TO authenticated USING (is_admin_v3());


-- 4. Fix/Ensure main admin "md" role and active status
UPDATE public.profiles 
SET role = 'admin', is_active = true 
WHERE username = 'md';


-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
