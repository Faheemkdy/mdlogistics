-- 1. Enable RLS on Voucher Tables
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_items ENABLE ROW LEVEL SECURITY;

-- 2. Secure Vouchers Table
DROP POLICY IF EXISTS "Public can insert vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admins can view all vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admins can update vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Admins can delete vouchers" ON public.vouchers;

CREATE POLICY "Public can insert vouchers" ON public.vouchers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all vouchers" ON public.vouchers
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update vouchers" ON public.vouchers
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete vouchers" ON public.vouchers
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Secure Voucher Items Table
DROP POLICY IF EXISTS "Public can insert voucher items" ON public.voucher_items;
DROP POLICY IF EXISTS "Admins can view all voucher items" ON public.voucher_items;
DROP POLICY IF EXISTS "Admins can update voucher items" ON public.voucher_items;
DROP POLICY IF EXISTS "Admins can delete voucher items" ON public.voucher_items;

CREATE POLICY "Public can insert voucher items" ON public.voucher_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all voucher items" ON public.voucher_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update voucher items" ON public.voucher_items
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete voucher items" ON public.voucher_items
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Hardening Bills Table (Removing Public Access)
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access to bills" ON public.bills;
DROP POLICY IF EXISTS "Allow authenticated users to manage bills" ON public.bills;

CREATE POLICY "Admins can manage all bills" ON public.bills
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Hardening Profiles Table
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles viewable by owner or admin" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. Notify schema reload
NOTIFY pgrst, 'reload schema';
