-- Migration: Allow users to be deleted without deleting their deliveries or pickups
-- This changes the foreign key behavior from blocking deletion to setting the reference to NULL

-- 1. Day Sheets
ALTER TABLE public.day_sheets
  DROP CONSTRAINT IF EXISTS day_sheets_created_by_fkey;

ALTER TABLE public.day_sheets
  ADD CONSTRAINT day_sheets_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 2. Pickups
ALTER TABLE public.pickups
  DROP CONSTRAINT IF EXISTS pickups_user_id_fkey;

ALTER TABLE public.pickups
  ADD CONSTRAINT pickups_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 3. Deliveries
ALTER TABLE public.deliveries
  DROP CONSTRAINT IF EXISTS deliveries_user_id_fkey;

ALTER TABLE public.deliveries
  ADD CONSTRAINT deliveries_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
