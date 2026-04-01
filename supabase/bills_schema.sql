-- Create 'bills' table for storing saved invoices
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('delivery', 'product')),
    customer_name TEXT NOT NULL,
    date DATE NOT NULL,
    items JSONB NOT NULL,
    totals JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for bills
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

-- Anonymous users (or authenticated ones depending on setup) can access their own bills
CREATE POLICY "Allow authenticated users to manage bills"
    ON public.bills
    FOR ALL
    USING (auth.role() = 'authenticated');

-- As temporary allowance if app auth isn't fully strictly tied (similar to other tables)
CREATE POLICY "Allow public access to bills"
    ON public.bills
    FOR ALL
    USING (true);

-- Trigger Function: Auto-delete old records after 3 months
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
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to clean up old data automatically on every insert in any of these tables
-- Here I'll attach it to the bills table as originally planned, but it will clean everything.
DROP TRIGGER IF EXISTS trigger_delete_old_history ON public.bills;

CREATE TRIGGER trigger_delete_old_history
AFTER INSERT ON public.bills
FOR EACH STATEMENT
EXECUTE FUNCTION delete_old_history();
