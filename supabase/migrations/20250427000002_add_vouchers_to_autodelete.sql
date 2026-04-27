-- Update auto-delete history function to include Vouchers
CREATE OR REPLACE FUNCTION delete_old_history()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete bills older than 3 months
    DELETE FROM public.bills WHERE date < (CURRENT_DATE - INTERVAL '3 months');
    
    -- Delete day_sheets (cash logs) older than 3 months
    DELETE FROM public.day_sheets WHERE date < (CURRENT_DATE - INTERVAL '3 months');
    
    -- Delete pickups older than 3 months
    DELETE FROM public.pickups WHERE date < (CURRENT_DATE - INTERVAL '3 months');
    
    -- Delete deliveries older than 3 months
    DELETE FROM public.deliveries WHERE date < (CURRENT_DATE - INTERVAL '3 months');

    -- NEW: Delete Vouchers older than 3 months
    -- (Items will be deleted automatically if CASCADE is set, 
    -- otherwise we delete them based on the date)
    DELETE FROM public.vouchers WHERE created_at < (NOW() - INTERVAL '3 months');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notification to schema reload
NOTIFY pgrst, 'reload schema';
