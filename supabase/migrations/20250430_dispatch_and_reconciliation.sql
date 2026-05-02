-- Create dispatches table
CREATE TABLE IF NOT EXISTS public.dispatches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    item_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;

-- Policies for dispatches (Admin only full access)
CREATE POLICY "Admin full access dispatches" ON public.dispatches FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Update auto-delete history function to include Dispatches
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

    -- Delete Vouchers older than 3 months
    DELETE FROM public.vouchers WHERE created_at < (NOW() - INTERVAL '3 months');

    -- NEW: Delete Dispatches older than 3 months
    DELETE FROM public.dispatches WHERE date < (CURRENT_DATE - INTERVAL '3 months');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notification to schema reload
NOTIFY pgrst, 'reload schema';
