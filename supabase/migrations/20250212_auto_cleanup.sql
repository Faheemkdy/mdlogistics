-- Function to delete records older than 3 months
CREATE OR REPLACE FUNCTION cleanup_old_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Delete old pickup items first (to prevent Foreign Key errors)
  DELETE FROM pickup_items 
  WHERE pickup_id IN (SELECT id FROM pickups WHERE date < (CURRENT_DATE - INTERVAL '3 months'));

  -- 2. Delete old pickups
  DELETE FROM pickups WHERE date < (CURRENT_DATE - INTERVAL '3 months');
  
  -- 3. Delete old deliveries
  DELETE FROM deliveries WHERE date < (CURRENT_DATE - INTERVAL '3 months');
  
  -- 4. Delete old day sheets
  DELETE FROM day_sheets WHERE date < (CURRENT_DATE - INTERVAL '3 months');
END;
$$;
