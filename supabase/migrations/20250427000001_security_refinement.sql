-- 1. Refine Billing Table Access (Master Admin Only)
DROP POLICY IF EXISTS "Admins can manage all bills" ON public.bills;

CREATE POLICY "Master Admin can manage all bills" ON public.bills
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND username = 'md'
        )
    );

-- 2. Refine Pickups Table Access (Owner or Admin)
DROP POLICY IF EXISTS "Pickups viewable by authenticated users" ON public.pickups;
CREATE POLICY "Pickups viewable by owner or admin" ON public.pickups
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Refine Deliveries Table Access (Owner or Admin)
DROP POLICY IF EXISTS "Deliveries viewable by authenticated users" ON public.deliveries;
CREATE POLICY "Deliveries viewable by owner or admin" ON public.deliveries
    FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Secure companies and shops (Staff only)
DROP POLICY IF EXISTS "Companies viewable by authenticated users" ON public.companies;
CREATE POLICY "Companies viewable by staff" ON public.companies
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

DROP POLICY IF EXISTS "Shops viewable by authenticated users" ON public.shops;
CREATE POLICY "Shops viewable by staff" ON public.shops
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_active = true
        )
    );

-- 5. Final Notify
NOTIFY pgrst, 'reload schema';
