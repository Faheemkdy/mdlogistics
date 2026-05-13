-- Migration: Add Courier Exchange Tables
-- Created: 2026-05-13

-- Create courier_partners table
CREATE TABLE IF NOT EXISTS courier_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create courier_logs table
CREATE TABLE IF NOT EXISTS courier_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES courier_partners(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('inward', 'outward')),
    count INTEGER NOT NULL DEFAULT 0,
    shop_name TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE courier_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_logs ENABLE ROW LEVEL SECURITY;

-- Add Policies (Admin Only)
DROP POLICY IF EXISTS "Admin access to courier_partners" ON courier_partners;
CREATE POLICY "Admin access to courier_partners" ON courier_partners
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'master_admin')
        )
    );

-- Add to auto-cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete old pickup items first
  DELETE FROM pickup_items 
  WHERE pickup_id IN (SELECT id FROM pickups WHERE date < (CURRENT_DATE - INTERVAL '3 months'));

  -- 2. Delete old pickups
  DELETE FROM pickups WHERE date < (CURRENT_DATE - INTERVAL '3 months');
  
  -- 3. Delete old deliveries
  DELETE FROM deliveries WHERE date < (CURRENT_DATE - INTERVAL '3 months');
  
  -- 4. Delete old day sheets
  DELETE FROM day_sheets WHERE date < (CURRENT_DATE - INTERVAL '3 months');

  -- 5. Delete old courier logs
  DELETE FROM courier_logs WHERE date < (CURRENT_DATE - INTERVAL '3 months');
END;
$$;

DROP POLICY IF EXISTS "Admin access to courier_logs" ON courier_logs;
CREATE POLICY "Admin access to courier_logs" ON courier_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'master_admin')
        )
    );
