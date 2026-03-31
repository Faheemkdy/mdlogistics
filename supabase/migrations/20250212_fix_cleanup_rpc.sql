-- Function to delete records older than 3 months
-- This will be called automatically by the Admin Dashboard once a day
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete Pickups older than 3 months
  DELETE FROM pickups WHERE date < current_date - interval '3 months';
  
  -- Delete Deliveries older than 3 months
  DELETE FROM deliveries WHERE date < current_date - interval '3 months';
  
  -- Delete Day Sheets older than 3 months
  DELETE FROM day_sheets WHERE date < current_date - interval '3 months';
END;
$$;
