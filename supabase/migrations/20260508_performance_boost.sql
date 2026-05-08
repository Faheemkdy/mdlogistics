-- 1. Create optimized security functions with SECURITY DEFINER
-- These bypass RLS and are cached, preventing recursion and lag.

CREATE OR REPLACE FUNCTION public.is_admin_v3()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE -- Optimization: same result for same user in one transaction
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

-- 2. Update Profiles Policies
DROP POLICY IF EXISTS "Profiles are viewable by users and admins" ON profiles;
DROP POLICY IF EXISTS "Profiles can be updated by users and admins" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

CREATE POLICY "Profiles select v3" ON profiles
FOR SELECT USING (auth.uid() = id OR is_admin_v3());

CREATE POLICY "Profiles update v3" ON profiles
FOR UPDATE USING (auth.uid() = id OR is_admin_v3());

CREATE POLICY "Profiles delete v3" ON profiles
FOR DELETE USING (is_admin_v3());

-- 3. Update Day Sheets (Performance Boost)
ALTER TABLE public.day_sheets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage day_sheets" ON day_sheets;
DROP POLICY IF EXISTS "Users view day_sheets" ON day_sheets;

CREATE POLICY "Day sheets access v3" ON day_sheets
FOR ALL TO authenticated
USING (is_admin_v3());

-- 4. Update Vouchers (Performance Boost)
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert vouchers" ON vouchers;
DROP POLICY IF EXISTS "Admins manage vouchers" ON vouchers;

CREATE POLICY "Vouchers insert v3" ON vouchers
FOR INSERT WITH CHECK (true); -- Public or Staff can insert

CREATE POLICY "Vouchers select v3" ON vouchers
FOR SELECT USING (is_admin_v3());

-- 5. Update Pickups & Deliveries
DROP POLICY IF EXISTS "Pickups viewable by owner or admin" ON pickups;
CREATE POLICY "Pickups access v3" ON pickups
FOR SELECT USING (auth.uid() = user_id OR is_admin_v3());

DROP POLICY IF EXISTS "Deliveries viewable by owner or admin" ON deliveries;
CREATE POLICY "Deliveries access v3" ON deliveries
FOR SELECT USING (auth.uid() = user_id OR is_admin_v3());

-- 6. Update Companies & Shops
DROP POLICY IF EXISTS "Companies viewable by staff" ON companies;
CREATE POLICY "Companies access v3" ON companies
FOR SELECT USING (is_active_staff_v3());

DROP POLICY IF EXISTS "Shops viewable by staff" ON shops;
CREATE POLICY "Shops access v3" ON shops
FOR SELECT USING (is_active_staff_v3());

-- 7. Dispatches & Bills (Master Admin Lock)
DROP POLICY IF EXISTS "Master Admin full access dispatches" ON dispatches;
CREATE POLICY "Dispatches master v3" ON dispatches
FOR ALL USING (is_md_v3());

DROP POLICY IF EXISTS "Admins can insert dispatches" ON dispatches;
CREATE POLICY "Dispatches insert v3" ON dispatches
FOR INSERT WITH CHECK (is_admin_v3());

DROP POLICY IF EXISTS "Master Admin can manage all bills" ON bills;
CREATE POLICY "Bills master v3" ON bills
FOR ALL USING (is_md_v3());

-- 8. Final Notify
NOTIFY pgrst, 'reload schema';
