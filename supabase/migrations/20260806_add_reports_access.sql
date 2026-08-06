-- Migration: Add can_access_reports column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_access_reports BOOLEAN DEFAULT false;
