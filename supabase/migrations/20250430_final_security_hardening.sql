-- 1. Fix SignUp Role Escalation Loophole
-- The previous trigger allowed users to set their own role during signup via metadata.
-- We now force all new users to have the 'user' role by default.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (new.id, split_part(new.email, '@', 1), 'user'); -- Forced to 'user'
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Prevent Role Escalation on Profile Update
-- Ensures that only an existing admin can change a user's role or active status.

CREATE OR REPLACE FUNCTION public.handle_profile_update_security()
RETURNS TRIGGER AS $$
BEGIN
  -- If sensitive columns are changing, verify the executor is an admin
  IF (NEW.role <> OLD.role OR NEW.is_active <> OLD.is_active) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      -- If NOT an admin, revert changes to sensitive columns
      NEW.role := OLD.role;
      NEW.is_active := OLD.is_active;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_profile_update_security ON public.profiles;
CREATE TRIGGER on_profile_update_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_update_security();


-- 3. Refine Dispatches Security (Operational Access vs Reconciliation Access)
-- Regular admins can RECORD dispatches (INSERT), but only the Master Admin can VIEW/MANAGE them (SELECT/ALL).
-- This satisfies the "No Reconciliation access for other admins" requirement at the database level.

ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dispatches viewable by authenticated users" ON public.dispatches;
DROP POLICY IF EXISTS "Admin full access dispatches" ON public.dispatches;
DROP POLICY IF EXISTS "Dispatches viewable by master admin only" ON public.dispatches;
DROP POLICY IF EXISTS "Master Admin full access dispatches" ON public.dispatches;

-- Master Admin: Full Control
CREATE POLICY "Master Admin full access dispatches" ON public.dispatches
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND username = 'md'
        )
    );

-- Regular Admins: Can only Record (INSERT)
CREATE POLICY "Admins can insert dispatches" ON public.dispatches
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );


-- 4. Final Security Check on sensitive tables
ALTER TABLE public.day_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- 5. Force Schema Reload
NOTIFY pgrst, 'reload schema';
