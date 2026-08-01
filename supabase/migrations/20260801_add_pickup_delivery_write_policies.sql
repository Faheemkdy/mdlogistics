-- Create policy to allow Admins to UPDATE and DELETE pickups
DROP POLICY IF EXISTS "Admin update pickups v3" ON public.pickups;
CREATE POLICY "Admin update pickups v3" ON public.pickups 
  FOR UPDATE TO authenticated USING (is_admin_v3());

DROP POLICY IF EXISTS "Admin delete pickups v3" ON public.pickups;
CREATE POLICY "Admin delete pickups v3" ON public.pickups 
  FOR DELETE TO authenticated USING (is_admin_v3());

-- Create policy to allow Admins to UPDATE and DELETE pickup items
DROP POLICY IF EXISTS "Admin update pickup_items v3" ON public.pickup_items;
CREATE POLICY "Admin update pickup_items v3" ON public.pickup_items 
  FOR UPDATE TO authenticated USING (is_admin_v3());

DROP POLICY IF EXISTS "Admin delete pickup_items v3" ON public.pickup_items;
CREATE POLICY "Admin delete pickup_items v3" ON public.pickup_items 
  FOR DELETE TO authenticated USING (is_admin_v3());

-- Create policy to allow Admins to UPDATE and DELETE deliveries
DROP POLICY IF EXISTS "Admin update deliveries v3" ON public.deliveries;
CREATE POLICY "Admin update deliveries v3" ON public.deliveries 
  FOR UPDATE TO authenticated USING (is_admin_v3());

DROP POLICY IF EXISTS "Admin delete deliveries v3" ON public.deliveries;
CREATE POLICY "Admin delete deliveries v3" ON public.deliveries 
  FOR DELETE TO authenticated USING (is_admin_v3());

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
